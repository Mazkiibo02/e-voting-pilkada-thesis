import fs from "fs";
import path from "path";
// @ts-ignore - bcrypt types may not be available until dependencies are installed
import bcrypt from "bcryptjs";
import db, { DB_PATH } from "./connection";
import { createHash } from "crypto";

const RESET = process.argv.includes("--reset");

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashPassword(value: string) {
  return bcrypt.hashSync(value, 10);
}

function seed() {
  try {
    if (RESET) {
      console.log("Resetting demo data (this will remove seeded demo rows)...");
      const tables = [
        "audit_logs",
        "blockchain_records",
        "witness_verifications",
        "documents",
        "tps_recap_candidate_totals",
        "tps_recaps",
        "votes",
        "voting_sessions",
        "users",
        "voters",
        "candidate_pairs",
        "tps",
        "elections",
      ];
      db.exec("BEGIN TRANSACTION;");
      for (const t of tables) {
        db.prepare(`DELETE FROM ${t};`).run();
      }
      db.exec("COMMIT;");
      console.log("Demo tables cleared.");
    }

    db.exec("BEGIN TRANSACTION;");

    let tpsIds: number[] = [];
    let electionId: number | null = null;

    const existing = db.prepare("SELECT COUNT(*) as c FROM elections").get() as any;
    const shouldSeedElections = !existing || Number(existing.c || 0) === 0 || RESET;

    if (shouldSeedElections) {
      // Insert one election
      const electionStmt = db.prepare(
        `INSERT INTO elections (name, election_type, region_name, voting_date, status) VALUES (?, ?, ?, ?, ?)`
      );
      const electionInfo = [
        "Demo Pilkada Election",
        "GOVERNOR",
        "Demo Region",
        "2026-07-01",
        "READY",
      ];
      const electionResult = electionStmt.run(...electionInfo);
      electionId = Number(electionResult.lastInsertRowid);

      // Insert 3 TPS
      const tpsStmt = db.prepare(
        `INSERT INTO tps (election_id, tps_number, tps_code, province, city_regency, district, village, address, registered_voters_total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const tpsList = [
        [electionId, "001", "TPS-001", "DemoProv", "DemoCity", "DemoDistrict", "DemoVillage", "Near Hall", 100, "NOT_STARTED"],
        [electionId, "002", "TPS-002", "DemoProv", "DemoCity", "DemoDistrict", "DemoVillage", "Community Center", 120, "NOT_STARTED"],
        [electionId, "003", "TPS-003", "DemoProv", "DemoCity", "DemoDistrict", "DemoVillage", "School", 90, "NOT_STARTED"],
      ];
      for (const t of tpsList) {
        const r = tpsStmt.run(...t);
        tpsIds.push(Number(r.lastInsertRowid));
      }

      // Insert 3 candidate pairs
      const candStmt = db.prepare(`INSERT INTO candidate_pairs (election_id, ballot_number, candidate_name, vice_candidate_name, coalition_name, vision_summary) VALUES (?, ?, ?, ?, ?, ?)`);
      const candidates = [
        [electionId, 1, "Candidate A", "Vice A", "Party Alpha", "Vision A"],
        [electionId, 2, "Candidate B", "Vice B", "Party Beta", "Vision B"],
        [electionId, 3, "Candidate C", "Vice C", "Party Gamma", "Vision C"],
      ];
      for (const c of candidates) {
        candStmt.run(...c);
      }

      // Insert sample voters per TPS (synthetic hashed NIKs)
      const voterStmt = db.prepare(`INSERT INTO voters (election_id, tps_id, voter_code, nik_hash, name, gender, birth_year, verification_status, has_voted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (let i = 0; i < tpsIds.length; i++) {
        const tpsId = tpsIds[i];
        for (let j = 1; j <= 6; j++) {
          const demoNik = `demo-${tpsId}-${j}`;
          voterStmt.run(electionId, tpsId, `DEMO-${tpsId}-${j}`, hash(demoNik), `Demo Voter ${tpsId}-${j}`, j % 2 === 0 ? "F" : "M", 1980 + (j % 30), "NOT_VERIFIED", 0);
        }
      }
      console.log(`Seeded elections (id: ${electionId}) and ${tpsIds.length} TPS.`);
    } else {
      console.log("Elections already exist in database; skipping election/voter seeding.");
    }

    // Determine target TPS ID for demo user seeding
    let targetTpsId: number | null = null;
    if (tpsIds.length > 0) {
      targetTpsId = tpsIds[0];
    } else {
      const existingTps = db.prepare("SELECT id FROM tps ORDER BY id ASC LIMIT 1").get() as any;
      if (existingTps) {
        targetTpsId = Number(existingTps.id);
      }
    }

    // Seed users with secure demo password hashes. Production must use proper password policy and secure secret management.
    // Demo credentials:
    // - admin@example.local / Admin123!
    // - kpps@example.local / Kpps123!
    // - witness@example.local / Witness123!
    const userStmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, assigned_tps_id, status)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        password_hash = excluded.password_hash,
        role = excluded.role,
        assigned_tps_id = COALESCE(excluded.assigned_tps_id, users.assigned_tps_id),
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `);

    userStmt.run("Admin Demo", "admin@example.local", hashPassword("Admin123!"), "ADMIN", null, "ACTIVE");
    userStmt.run("KPPS Demo", "kpps@example.local", hashPassword("Kpps123!"), "KPPS", targetTpsId, "ACTIVE");
    userStmt.run("Witness Demo", "witness@example.local", hashPassword("Witness123!"), "WITNESS", targetTpsId, "ACTIVE");

    db.exec("COMMIT;");

    console.log("Seed completed. Database path:", DB_PATH);
    if (electionId) {
      console.log(`Election id: ${electionId}, TPS ids: ${tpsIds.join(",")}`);
    } else {
      console.log(`Users verified/updated. Target TPS ID for KPPS/Witness: ${targetTpsId}`);
    }
  } catch (err) {
    console.error("Seeding failed:", err);
    try {
      db.exec("ROLLBACK;");
    } catch (e) {
      // ignore
    }
    process.exit(1);
  } finally {
    try {
      db.close();
    } catch (e) {
      // ignore
    }
  }
}

if (require.main === module) {
  seed();
}

export { seed };
