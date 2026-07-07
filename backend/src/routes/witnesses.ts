import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import db from "../database/connection";
import multer from "multer";
import * as xlsx from "xlsx";
import bcrypt from "bcryptjs";
import { AuditLogsService } from "../services/auditLogs";
import crypto from "crypto";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).single("excelFile");

function generateRandomPassword(length = 8): string {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

/**
 * GET /witnesses
 * Purpose: List all Saksi and Pengawas accounts
 * Allowed roles: ADMIN
 */
router.get("/", authenticateToken, requireRole(["ADMIN"]), (req: AuthRequest, res: Response) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.name, u.full_name, u.email, u.role, u.affiliation, u.status, u.assigned_tps_id, t.tps_code 
      FROM users u
      LEFT JOIN tps t ON u.assigned_tps_id = t.id
      WHERE u.role IN ('WITNESS', 'PENGAWAS')
      ORDER BY u.id DESC
    `).all();

    return res.json({ data: users });
  } catch (error: any) {
    console.error("Error fetching witnesses:", error);
    return res.status(500).json({ message: "Gagal mengambil data saksi dan pengawas." });
  }
});

/**
 * POST /witnesses/generate
 * Purpose: Automatically generate 3 Saksi and 1 Pengawas for a given tps_id
 * Allowed roles: ADMIN
 */
router.post("/generate", authenticateToken, requireRole(["ADMIN"]), (req: AuthRequest, res: Response) => {
  const { tps_id } = req.body;
  if (!tps_id) return res.status(400).json({ message: "tps_id is required" });

  try {
    const tps = db.prepare("SELECT * FROM tps WHERE id = ?").get(tps_id) as any;
    if (!tps) return res.status(404).json({ message: "TPS tidak ditemukan." });

    const generatedAccounts: any[] = [];
    
    db.exec("BEGIN TRANSACTION;");
    try {
      const insertUser = db.prepare(`
        INSERT INTO users (name, full_name, email, password_hash, role, affiliation, assigned_tps_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const tpsCodeSafe = tps.tps_code ? tps.tps_code.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : `tps${tps.id}`;
      
      const rolesToGenerate = [
        { type: "Saksi", affiliation: "Paslon 1", role: "WITNESS" },
        { type: "Saksi", affiliation: "Paslon 2", role: "WITNESS" },
        { type: "Saksi", affiliation: "Paslon 3", role: "WITNESS" },
        { type: "Pengawas", affiliation: "Bawaslu", role: "PENGAWAS" }
      ];

      for (const account of rolesToGenerate) {
        const rawPassword = generateRandomPassword();
        const hashedPassword = bcrypt.hashSync(rawPassword, 10);
        const email = `${account.type.toLowerCase()}_${account.affiliation.replace(/\s+/g, "").toLowerCase()}_${tpsCodeSafe}@example.local`;
        const fullName = `${account.type} ${account.affiliation} - ${tps.tps_code}`;

        insertUser.run(
          fullName,
          fullName,
          email,
          hashedPassword,
          account.role,
          account.affiliation,
          tps.id,
          "ACTIVE"
        );

        generatedAccounts.push({
          tpsCode: tps.tps_code,
          fullName,
          email,
          role: account.role,
          affiliation: account.affiliation,
          password: rawPassword
        });
      }

      db.exec("COMMIT;");
    } catch (e) {
      db.exec("ROLLBACK;");
      throw e;
    }

    AuditLogsService.log({
      actorUserId: req.user?.sub ? Number(req.user.sub) : null,
      actorRole: req.user?.role || null,
      action: "WITNESS_ACCOUNTS_GENERATED",
      entityType: "USER",
      entityId: tps.id,
      description: `Generated 4 Saksi/Pengawas accounts for ${tps.tps_code}.`,
      metadataJson: { generatedCount: generatedAccounts.length, tps_id: tps.id }
    }, req);

    return res.status(200).json({
      message: `Berhasil generate 4 akun Saksi/Pengawas untuk ${tps.tps_code}.`,
      data: generatedAccounts
    });
  } catch (error: any) {
    console.error("Error generating Saksi/Pengawas accounts:", error);
    return res.status(500).json({ message: "Gagal membuat akun otomatis." });
  }
});

/**
 * POST /witnesses/import
 * Purpose: Import Saksi/Pengawas accounts from Excel
 * Allowed roles: ADMIN
 */
router.post("/import", authenticateToken, requireRole(["ADMIN"]), (req: AuthRequest, res: Response) => {
  upload(req, res, (uploadErr: any) => {
    if (uploadErr) return res.status(400).json({ message: "File upload error." });
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    try {
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet) as any[];

      const importedAccounts: any[] = [];

      db.exec("BEGIN TRANSACTION;");
      try {
        const insertUser = db.prepare(`
          INSERT INTO users (name, full_name, email, password_hash, role, affiliation, assigned_tps_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let index = 0;
        for (const row of rows) {
          index++;
          const tpsCode = row["Kode TPS"] || row["kode_tps"] || row["KODE TPS"];
          const nama = row["Nama"] || row["nama"] || row["NAMA"];
          const email = row["Email"] || row["email"] || row["EMAIL"];
          const afiliasi = row["Afiliasi"] || row["afiliasi"] || row["AFILIASI"] || "Independen";
          let password = row["Password"] || row["password"] || row["PASSWORD"];

          if (!tpsCode || !nama || !email) {
            throw new Error(`Baris ${index}: Data tidak lengkap (Kode TPS, Nama, atau Email kosong).`);
          }

          const tps = db.prepare("SELECT id FROM tps WHERE tps_code = ?").get(tpsCode) as any;
          if (!tps) {
            throw new Error(`Baris ${index}: Kode TPS '${tpsCode}' tidak ditemukan.`);
          }

          const existingEmail = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;
          if (existingEmail) {
            throw new Error(`Baris ${index}: Email '${email}' sudah digunakan.`);
          }

          if (!password) password = generateRandomPassword();
          const hashedPassword = bcrypt.hashSync(password.toString(), 10);

          const isPengawas = /(pengawas|bawaslu|independen)/i.test(afiliasi.toString());
          const role = isPengawas ? "PENGAWAS" : "WITNESS";

          insertUser.run(
            nama.toString(),
            nama.toString(),
            email.toString(),
            hashedPassword,
            role,
            afiliasi.toString(),
            tps.id,
            "ACTIVE"
          );

          importedAccounts.push({ tpsCode, nama, email, role, affiliation: afiliasi, password });
        }
        db.exec("COMMIT;");
      } catch (err: any) {
        db.exec("ROLLBACK;");
        return res.status(400).json({ message: err.message || "Gagal import excel. Rollback dilakukan." });
      }

      AuditLogsService.log({
        actorUserId: req.user?.sub ? Number(req.user.sub) : null,
        actorRole: req.user?.role || null,
        action: "WITNESS_ACCOUNTS_IMPORTED",
        entityType: "USER",
        description: `Imported ${importedAccounts.length} Saksi/Pengawas accounts via Excel.`,
        metadataJson: { importedCount: importedAccounts.length }
      }, req);

      return res.status(200).json({
        message: `Berhasil import ${importedAccounts.length} akun Saksi/Pengawas.`,
        data: importedAccounts
      });
    } catch (error: any) {
      console.error("Error importing Excel:", error);
      return res.status(500).json({ message: "Gagal memproses file Excel." });
    }
  });
});

/**
 * PUT /witnesses/:id
 * Purpose: Update witness/pengawas details
 * Allowed roles: ADMIN
 */
router.put("/:id", authenticateToken, requireRole(["ADMIN"]), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const { full_name, email, affiliation } = req.body;

  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID." });
  if (!full_name || !email) return res.status(400).json({ message: "Nama and Email are required." });

  try {
    const existing = db.prepare("SELECT id, role FROM users WHERE id = ?").get(id) as any;
    if (!existing) return res.status(404).json({ message: "User not found." });
    
    if (existing.role !== 'WITNESS' && existing.role !== 'PENGAWAS') {
        return res.status(400).json({ message: "User is not a Saksi or Pengawas." });
    }

    const emailCheck = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, id);
    if (emailCheck) return res.status(400).json({ message: "Email sudah digunakan oleh akun lain." });

    const isPengawas = /(pengawas|bawaslu|independen)/i.test((affiliation || "").toString());
    const newRole = isPengawas ? "PENGAWAS" : "WITNESS";

    db.prepare(`
      UPDATE users SET full_name = ?, name = ?, email = ?, affiliation = ?, role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(full_name, full_name, email, affiliation || null, newRole, id);

    AuditLogsService.log({
      actorUserId: req.user?.sub ? Number(req.user.sub) : null,
      actorRole: req.user?.role || null,
      action: "WITNESS_ACCOUNT_UPDATED",
      entityType: "USER",
      entityId: id,
      description: `Updated Saksi/Pengawas account ID ${id}.`,
      metadataJson: { full_name, email, affiliation, role: newRole }
    }, req);

    return res.status(200).json({ message: "Akun berhasil diperbarui." });
  } catch (error: any) {
    console.error("Error updating account:", error);
    return res.status(500).json({ message: "Gagal memperbarui akun." });
  }
});

/**
 * DELETE /witnesses/:id
 * Purpose: Delete a witness/pengawas account
 * Allowed roles: ADMIN
 */
router.delete("/:id", authenticateToken, requireRole(["ADMIN"]), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID." });

  try {
    const existing = db.prepare("SELECT id, role FROM users WHERE id = ?").get(id) as any;
    if (!existing) return res.status(404).json({ message: "User not found." });
    
    if (existing.role !== 'WITNESS' && existing.role !== 'PENGAWAS') {
        return res.status(400).json({ message: "User is not a Saksi or Pengawas." });
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(id);

    AuditLogsService.log({
      actorUserId: req.user?.sub ? Number(req.user.sub) : null,
      actorRole: req.user?.role || null,
      action: "WITNESS_ACCOUNT_DELETED",
      entityType: "USER",
      entityId: id,
      description: `Deleted Saksi/Pengawas account ID ${id}.`,
      metadataJson: { id }
    }, req);

    return res.status(200).json({ message: "Akun berhasil dihapus." });
  } catch (error: any) {
    console.error("Error deleting account:", error);
    return res.status(500).json({ message: "Gagal menghapus akun." });
  }
});

export default router;
