const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all sites
router.get("/", (req, res) => {
  const sites = db.prepare("SELECT * FROM sites").all();
  res.json(sites);
});

// CREATE a new site
router.post("/", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Site name is required" });
  }

  const result = db
    .prepare("INSERT INTO sites (name) VALUES (?)")
    .run(name);

  res.json({
    id: result.lastInsertRowid,
    name,
  });
});

module.exports = router;
