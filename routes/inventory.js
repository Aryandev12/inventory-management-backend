const express = require("express");
const router = express.Router();
const db = require("../db");

function calculateRunway(quantity, dailyBurnRate) {
  if (!dailyBurnRate || dailyBurnRate === 0) return null;
  return quantity / dailyBurnRate;
}

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

function getLastUsageDate(inventoryId) {
  const row = db.prepare(`
    SELECT used_at
    FROM inventory_usage
    WHERE inventory_id = ?
    ORDER BY used_at DESC
    LIMIT 1
  `).get(inventoryId);

  return row ? row.used_at : null;
}



function isDeadStock(lastUsedAt) {
  if (!lastUsedAt) return false;
  const lastUsed = new Date(lastUsedAt);
  const now = new Date();
  const diffDays =
    (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 30;
}


router.get("/", (req, res) => {
  const rows = db.prepare(`
    SELECT
      inventory.id,
      sites.name AS site_name,
      materials.name AS material_name,
      inventory.quantity,
      inventory.daily_burn_rate,
      inventory.last_used_at
    FROM inventory
    JOIN sites ON inventory.site_id = sites.id
    JOIN materials ON inventory.material_id = materials.id
  `).all();

  const result = rows.map((row) => {
    
    const avgBurnRate = calculateAverageBurnRate(row.id);

   
    const effectiveBurnRate =
      avgBurnRate && avgBurnRate > 0
        ? avgBurnRate
        : row.daily_burn_rate;

    const runway =
      effectiveBurnRate && effectiveBurnRate > 0
        ? row.quantity / effectiveBurnRate
        : null;

    const lastUsageDate =  getLastUsageDate(row.id) || row.last_used_at;

    return {
        id: row.id,
        site: row.site_name,
        material: row.material_name,
        quantity: row.quantity,
        averageBurnRate: avgBurnRate,
        fallbackBurnRate: row.daily_burn_rate,
        runwayDays: runway,
        deadStock: isDeadStock(lastUsageDate),
    };

  
  });

  res.json(result);
});


router.post("/", (req, res) => {
  const {
    site_id,
    material_id,
    quantity,
    daily_burn_rate,
    last_used_at,
  } = req.body;

  if (!site_id || !material_id || quantity == null) {
    return res.status(400).json({
      message: "site_id, material_id, and quantity are required",
    });
  }

  const result = db
    .prepare(`
      INSERT INTO inventory
      (site_id, material_id, quantity, daily_burn_rate, last_used_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(
      site_id,
      material_id,
      quantity,
      daily_burn_rate || 0,
      last_used_at || new Date().toISOString()
    );

  res.json({
    id: result.lastInsertRowid,
    message: "Inventory added successfully",
  });
});


router.post("/check-in", (req, res) => {
  const { inventory_id, used_quantity } = req.body;

  if (!inventory_id || !used_quantity) {
    return res.status(400).json({
      message: "inventory_id and used_quantity are required",
    });
  }

  const inventory = db
    .prepare("SELECT quantity FROM inventory WHERE id = ?")
    .get(inventory_id);

  if (!inventory) {
    return res.status(404).json({ message: "Inventory not found" });
  }

  if (used_quantity > inventory.quantity) {
    return res.status(400).json({
      message: "Used quantity exceeds available stock",
    });
  }

 
  db.prepare(`
    INSERT INTO inventory_usage (inventory_id, used_quantity, used_at)
    VALUES (?, ?, ?)
  `).run(inventory_id, used_quantity, new Date().toISOString());

  
  db.prepare(`
    UPDATE inventory
    SET quantity = quantity - ?
    WHERE id = ?
  `).run(used_quantity, inventory_id);

  res.json({ message: "Daily usage recorded successfully" });
});



router.get("/:id/runway-history", (req, res) => {
  const inventoryId = req.params.id;

  const inventory = db
    .prepare(`
      SELECT quantity
      FROM inventory
      WHERE id = ?
    `)
    .get(inventoryId);

  if (!inventory) {
    return res.status(404).json({ message: "Inventory not found" });
  }

  const usage = db.prepare(`
    SELECT used_quantity, used_at
    FROM inventory_usage
    WHERE inventory_id = ?
    ORDER BY used_at ASC
  `).all(inventoryId);

  let remainingQuantity = inventory.quantity;
  let totalUsed = 0;
  let days = 0;

  const history = [];

  for (const entry of usage) {
    totalUsed += entry.used_quantity;
    days += 1;

    const avgBurnRate = totalUsed / days;

    const runway =
      avgBurnRate > 0
        ? remainingQuantity / avgBurnRate
        : null;

    history.push({
      date: entry.used_at.split("T")[0],
      averageBurnRate: avgBurnRate,
      runwayDays: runway,
    });

    remainingQuantity -= entry.used_quantity;
  }

  res.json(history);
});



router.delete("/:id", (req, res) => {
  const inventoryId = req.params.id;


  const inventory = db
    .prepare("SELECT id FROM inventory WHERE id = ?")
    .get(inventoryId);

  if (!inventory) {
    return res.status(404).json({
      message: "Inventory not found",
    });
  }


  const deleteTransaction = db.transaction(() => {
    db.prepare(
      "DELETE FROM inventory_usage WHERE inventory_id = ?"
    ).run(inventoryId);

    db.prepare(
      "DELETE FROM inventory WHERE id = ?"
    ).run(inventoryId);
  });

  deleteTransaction();

  res.json({
    message: "Inventory deleted successfully",
  });
});

router.get("/:id/usage-history", (req, res) => {
  const inventoryId = req.params.id;

  const inventory = db
    .prepare("SELECT id FROM inventory WHERE id = ?")
    .get(inventoryId);

  if (!inventory) {
    return res.status(404).json({ message: "Inventory not found" });
  }

  const usage = db.prepare(`
    SELECT used_quantity, used_at
    FROM inventory_usage
    WHERE inventory_id = ?
    ORDER BY used_at ASC
  `).all(inventoryId);

  const history = usage.map((entry) => ({
    date: entry.used_at.slice(0, 16), 
    usedQuantity: entry.used_quantity,
  }));

  res.json(history);
});




module.exports = router;
