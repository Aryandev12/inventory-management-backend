const express = require("express");
const router = express.Router();
const db = require("../db");


router.get("/", (req, res) => {
  const materials = db.prepare("SELECT * FROM materials").all();
  res.json(materials);
});

module.exports = router;
