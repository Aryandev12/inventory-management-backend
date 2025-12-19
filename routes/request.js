const express = require("express");
const router = express.Router();
const db = require("../db");



function calculateAverageBurnRate(inventoryId) {
  const rows = db.prepare(`
    SELECT used_quantity
    FROM inventory_usage
    WHERE inventory_id = ?
      AND used_at >= date('now', '-7 days')
  `).all(inventoryId);

  if (rows.length === 0) return null;

  const totalUsed = rows.reduce((sum, r) => sum + r.used_quantity, 0);
  return totalUsed / rows.length;
}

function isDeadStock(lastUsedAt) {
  if (!lastUsedAt) return false;
  const lastUsed = new Date(lastUsedAt);
  const now = new Date();
  const diffDays =
    (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 30;
}


router.post("/", (req, res) => {
  const { site_id, material_id, quantity } = req.body;

  if (!site_id || !material_id || !quantity) {
    return res.status(400).json({
      message: "site_id, material_id and quantity are required",
    });
  }

  
  const rows = db.prepare(`
    SELECT
      inventory.quantity,
      inventory.last_used_at,
      sites.name AS site_name
    FROM inventory
    JOIN sites ON inventory.site_id = sites.id
    WHERE inventory.material_id = ?
      AND inventory.site_id != ?
      AND inventory.quantity >= ?
  `).all(material_id, site_id, quantity);

  
  const deadStock = rows.find((row) =>
    isDeadStock(row.last_used_at)
  );

  if (deadStock) {
    return res.json({
      suggestion: true,
      message: `Site ${deadStock.site_name} has unused stock. Consider internal transfer before purchasing.`,
      fromSite: deadStock.site_name,
    });
  }

  
  res.json({
    suggestion: false,
    message: "No unused stock found. You can proceed with purchase.",
  });
});


// POST /request/analyze
 //Simulate request impact on runway

router.post("/analyze", (req, res) => {
  const { site_id, material_id, quantity } = req.body;

  if (!site_id || !material_id || !quantity) {
    return res.status(400).json({
      message: "site_id, material_id and quantity are required",
    });
  }

  
  const inventory = db.prepare(`
    SELECT id, quantity
    FROM inventory
    WHERE site_id = ? AND material_id = ?
  `).get(site_id, material_id);

  if (!inventory) {
    return res.status(404).json({
      message: "Inventory not found for this site and material",
    });
  }

  // Get dynamic burn rate
  const avgBurnRate = calculateAverageBurnRate(inventory.id);

  if (!avgBurnRate || avgBurnRate <= 0) {
    return res.json({
      riskLevel: "UNKNOWN",
      message:
        "Not enough usage data to assess risk. Proceed with caution.",
    });
  }

  // Current runway
  const currentRunway = inventory.quantity / avgBurnRate;

  // Simulated runway after request
  const remainingAfterRequest = inventory.quantity - quantity;

  const runwayAfterRequest =
    remainingAfterRequest > 0
      ? remainingAfterRequest / avgBurnRate
      : 0;

  // Risk classification
  let riskLevel = "LOW";
  let message = "Request is safe.";

  if (runwayAfterRequest < 1) {
    riskLevel = "HIGH";
    message =
      "This request may cause work stoppage within 1 day.";
  } else if (runwayAfterRequest < 2) {
    riskLevel = "MEDIUM";
    message =
      "This request significantly reduces buffer. Monitor closely.";
  }

  res.json({
    riskLevel,
    currentRunway,
    runwayAfterRequest,
    message,
  });
});


module.exports = router;
