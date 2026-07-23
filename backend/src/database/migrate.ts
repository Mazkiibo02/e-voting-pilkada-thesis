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
    
    // Run additive schema updates for documents table
    const columns = [
      { name: "uploaded_signed_file_path", type: "TEXT" },
      { name: "signed_file_original_name", type: "TEXT" },
      { name: "signed_file_stored_name", type: "TEXT" },
      { name: "signed_file_mime_type", type: "TEXT" },
      { name: "signed_file_size_bytes", type: "INTEGER" },
      { name: "signed_file_hash_sha256", type: "TEXT" },
      { name: "signed_file_uploaded_at", type: "TEXT" },
    ];
    for (const col of columns) {
      try {
        db.exec(`ALTER TABLE documents ADD COLUMN ${col.name} ${col.type};`);
        console.log(`Added column ${col.name} to documents table.`);
      } catch (colErr: any) {
        const errStr = String(colErr);
        if (!errStr.includes("duplicate column name") && !errStr.includes("already exists")) {
          console.warn(`Could not add column ${col.name}:`, colErr);
        }
      }
    }

    // Run additive schema updates for users table
    const usersColumns = [
      { name: "full_name", type: "TEXT" },
      { name: "affiliation", type: "TEXT" }
    ];
    for (const col of usersColumns) {
      try {
        db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type};`);
        console.log(`Added column ${col.name} to users table.`);
      } catch (colErr: any) {
        const errStr = String(colErr);
        if (!errStr.includes("duplicate column name") && !errStr.includes("already exists")) {
          console.warn(`Could not add column ${col.name} to users:`, colErr);
        }
      }
    }
    
    try {
      db.exec("UPDATE users SET full_name = name WHERE full_name IS NULL;");
    } catch (e) {}


    // Run additive schema updates for audit_logs table
    const auditLogsColumns = [
      { name: "actor_email", type: "TEXT" },
      { name: "description", type: "TEXT" },
      { name: "actor_display", type: "TEXT" },
    ];
    for (const col of auditLogsColumns) {
      try {
        db.exec(`ALTER TABLE audit_logs ADD COLUMN ${col.name} ${col.type};`);
        console.log(`Added column ${col.name} to audit_logs table.`);
      } catch (colErr: any) {
        const errStr = String(colErr);
        if (!errStr.includes("duplicate column name") && !errStr.includes("already exists")) {
          console.warn(`Could not add column ${col.name} to audit_logs:`, colErr);
        }
      }
    }

    // Run additive schema updates for witness_verifications table
    const witnessColumns = [
      { name: "evidence_file_original_name", type: "TEXT" },
      { name: "evidence_file_mime_type", type: "TEXT" },
      { name: "evidence_file_size_bytes", type: "INTEGER" },
    ];
    for (const col of witnessColumns) {
      try {
        db.exec(`ALTER TABLE witness_verifications ADD COLUMN ${col.name} ${col.type};`);
        console.log(`Added column ${col.name} to witness_verifications table.`);
      } catch (colErr: any) {
        const errStr = String(colErr);
        if (!errStr.includes("duplicate column name") && !errStr.includes("already exists")) {
          console.warn(`Could not add column ${col.name} to witness_verifications:`, colErr);
        }
      }
    }

    // Run additive schema updates for candidate_pairs table
    const candidateColumns = [
      { name: "motto", type: "TEXT" },
      { name: "vision", type: "TEXT" },
      { name: "mission", type: "TEXT" },
      { name: "education", type: "TEXT" },
      { name: "career_path", type: "TEXT" },
      { name: "photo_url", type: "TEXT" },
      { name: "status", type: "TEXT DEFAULT 'ACTIVE'" },
      { name: "is_deleted", type: "INTEGER DEFAULT 0" },
    ];
    for (const col of candidateColumns) {
      try {
        db.exec(`ALTER TABLE candidate_pairs ADD COLUMN ${col.name} ${col.type};`);
        console.log(`Added column ${col.name} to candidate_pairs table.`);
      } catch (colErr: any) {
        const errStr = String(colErr);
        if (!errStr.includes("duplicate column name") && !errStr.includes("already exists")) {
          console.warn(`Could not add column ${col.name} to candidate_pairs:`, colErr);
        }
      }
    }

    // Run additive schema updates for voting_sessions table
    const sessionColumns = [
      { name: "voter_gender", type: "TEXT DEFAULT 'L'" },
      { name: "is_disability", type: "INTEGER DEFAULT 0" }
    ];
    for (const col of sessionColumns) {
      try {
        db.exec(`ALTER TABLE voting_sessions ADD COLUMN ${col.name} ${col.type};`);
        console.log(`Added column ${col.name} to voting_sessions table.`);
      } catch (colErr: any) {
        const errStr = String(colErr);
        if (!errStr.includes("duplicate column name") && !errStr.includes("already exists")) {
          console.warn(`Could not add column ${col.name} to voting_sessions:`, colErr);
        }
      }
    }

    // Run additive schema updates for tps_recaps table
    const recapColumns = [
      { name: "voters_male_voted", type: "INTEGER DEFAULT 0" },
      { name: "voters_female_voted", type: "INTEGER DEFAULT 0" }
    ];
    for (const col of recapColumns) {
      try {
        db.exec(`ALTER TABLE tps_recaps ADD COLUMN ${col.name} ${col.type};`);
        console.log(`Added column ${col.name} to tps_recaps table.`);
      } catch (colErr: any) {
        const errStr = String(colErr);
        if (!errStr.includes("duplicate column name") && !errStr.includes("already exists")) {
          console.warn(`Could not add column ${col.name} to tps_recaps:`, colErr);
        }
      }
    }

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
