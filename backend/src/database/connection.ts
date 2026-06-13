import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

const DB_DIR = path.resolve(__dirname, "../../data");
const DB_PATH = path.join(DB_DIR, "evoting.sqlite");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Open a synchronous SQLite database using Node's built-in sqlite binding
const db = new DatabaseSync(DB_PATH);
try {
  // Recommended pragmas for safety and integrity
  db.exec("PRAGMA journal_mode = WAL;");
} catch (e) {
  // ignore if not supported
}
db.exec("PRAGMA foreign_keys = ON;");

export default db;
export { DB_PATH };
