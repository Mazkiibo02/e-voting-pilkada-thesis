import db from "./connection";
import bcrypt from "bcryptjs";

function resetWitness() {
  try {
    const hash = bcrypt.hashSync("Witness123!", 10);
    const targetTpsId = 27; // ID for TPS 003

    // 1. Insert or update the witness@example.local account
    db.prepare(`
      INSERT INTO users (name, full_name, email, password_hash, role, assigned_tps_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        password_hash = excluded.password_hash,
        role = excluded.role,
        assigned_tps_id = excluded.assigned_tps_id,
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      "Witness Demo",
      "Saksi TPS Demo",
      "witness@example.local",
      hash,
      "WITNESS",
      targetTpsId,
      "ACTIVE"
    );

    console.log("Account witness@example.local created/updated successfully with password: Witness123!");

    // 2. Also reset the passwords of the auto-generated witnesses for TPS-003 to Witness123!
    const updated = db.prepare(`
      UPDATE users 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE email LIKE 'saksi_%_tps003@example.local'
    `).run(hash);

    console.log(`Reset password for ${updated.changes} auto-generated witness accounts for TPS-003 to: Witness123!`);

  } catch (err: any) {
    console.error("Failed to reset witness accounts:", err.message);
  }
}

resetWitness();
