import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const DATA_DIR = path.resolve(__dirname, "../../data");
const DB_PATH = path.join(DATA_DIR, "evoting.sqlite");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log("Created data directory:", DATA_DIR);
  }
}

function migrate() {
  ensureDataDir();

  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");

  let db = new DatabaseSync(DB_PATH);
  try {
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(schema);
    console.log("Database migrated successfully:", DB_PATH);
  } catch (err: any) {
    // If the file exists but is not a valid SQLite DB (corrupted or empty), remove and retry
    if (err && (err.code === 'ERR_SQLITE_ERROR' || err.errcode === 26 || String(err).includes('file is not a database'))) {
      console.warn("Existing DB file appears invalid, recreating:", DB_PATH);
      try {
        db.close();
      } catch (e) {}
      try {
        fs.unlinkSync(DB_PATH);
      } catch (e) {}
      db = new DatabaseSync(DB_PATH);
      try {
        db.exec("PRAGMA foreign_keys = ON;");
        db.exec(schema);
        console.log("Database migrated successfully after recreate:", DB_PATH);
      } catch (err2) {
        console.error("Migration failed after recreate:", err2);
        process.exit(1);
      }
    } else {
      console.error("Migration failed:", err);
      process.exit(1);
    }
  } finally {
    try {
      db.close();
    } catch (e) {
      // ignore
    }
  }
}

if (require.main === module) {
  migrate();
}

export { migrate };
