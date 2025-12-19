const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbDir = path.join(__dirname, "database");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}


const dbPath = path.join(dbDir, "inventory.db");


const db = new Database(dbPath);


db.pragma("foreign_keys = ON");


db.prepare(`
  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER,
    material_id INTEGER,
    quantity INTEGER,
    daily_burn_rate INTEGER,
    last_used_at TEXT,
    FOREIGN KEY (site_id) REFERENCES sites(id),
    FOREIGN KEY (material_id) REFERENCES materials(id)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS inventory_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL,
    used_quantity INTEGER NOT NULL,
    used_at TEXT NOT NULL,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id)
  )
`).run();

console.log("SQLite database connected and tables ready");


const materialCount = db
  .prepare("SELECT COUNT(*) as count FROM materials")
  .get();

if (materialCount.count === 0) {
  const insert = db.prepare("INSERT INTO materials (name) VALUES (?)");
  ["Cement", "Steel", "Sand"].forEach((name) => insert.run(name));
  console.log("Materials seeded");
}

module.exports = db;
