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

/**
 * Helper to generate random secure password
 */
function generateRandomPassword(length = 8): string {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

/**
 * 1. POST /kpps/generate
 * Purpose: Automatically generate KPPS accounts for all TPS that don't have one.
 * Allowed roles: ADMIN
 */
router.post("/generate", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const tpsList = db.prepare(`
      SELECT t.*, u.id as existing_user_id 
      FROM tps t
      LEFT JOIN users u ON u.assigned_tps_id = t.id AND u.role = 'KPPS'
    `).all() as any[];

    const generatedAccounts: any[] = [];
    
    db.exec("BEGIN TRANSACTION;");
    try {
      const insertUser = db.prepare(`
        INSERT INTO users (name, full_name, email, password_hash, role, assigned_tps_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const tps of tpsList) {
        if (!tps.existing_user_id) {
          const rawPassword = generateRandomPassword();
          const hashedPassword = bcrypt.hashSync(rawPassword, 10);
          const tpsCodeSafe = tps.tps_code ? tps.tps_code.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : `tps${tps.id}`;
          const email = `kpps_${tpsCodeSafe}@example.local`;
          const fullName = `Ketua KPPS ${tps.tps_code}`;
          
          insertUser.run(
            fullName,
            fullName,
            email,
            hashedPassword,
            "KPPS",
            tps.id,
            "ACTIVE"
          );

          generatedAccounts.push({
            tpsCode: tps.tps_code,
            fullName,
            email,
            password: rawPassword
          });
        }
      }
      db.exec("COMMIT;");
    } catch (e) {
      db.exec("ROLLBACK;");
      throw e;
    }

    AuditLogsService.log({
      actorUserId: req.user?.sub ? Number(req.user.sub) : null,
      actorRole: req.user?.role || null,
      action: "KPPS_ACCOUNTS_GENERATED",
      entityType: "USER",
      description: `Generated ${generatedAccounts.length} KPPS accounts automatically.`,
      metadataJson: { generatedCount: generatedAccounts.length }
    }, req);

    return res.status(200).json({
      message: `Berhasil generate ${generatedAccounts.length} akun KPPS.`,
      data: generatedAccounts
    });
  } catch (error: any) {
    console.error("Error generating KPPS accounts:", error);
    return res.status(500).json({ message: "Gagal membuat akun otomatis." });
  }
});

/**
 * 2. POST /kpps/import
 * Purpose: Import KPPS accounts from Excel
 * Allowed roles: ADMIN
 */
router.post("/import", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  upload(req, res, async (uploadErr: any) => {
    if (uploadErr) {
      return res.status(400).json({ message: "File upload error." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    try {
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet) as any[];

      const importedAccounts: any[] = [];

      db.exec("BEGIN TRANSACTION;");
      try {
        const insertUser = db.prepare(`
          INSERT INTO users (name, full_name, email, password_hash, role, assigned_tps_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        let index = 0;
        for (const row of rows) {
          index++;
          const tpsCode = row["Kode TPS"] || row["kode_tps"] || row["KODE TPS"];
          const nama = row["Nama Ketua KPPS"] || row["nama"] || row["NAMA"];
          const email = row["Email"] || row["email"] || row["EMAIL"];
          let password = row["Password"] || row["password"] || row["PASSWORD"];

          if (!tpsCode || !nama || !email) {
            throw new Error(`Baris ${index}: Data tidak lengkap (Kode TPS, Nama, atau Email kosong).`);
          }

          // Check if TPS exists
          const tps = db.prepare("SELECT id FROM tps WHERE tps_code = ?").get(tpsCode) as any;
          if (!tps) {
            throw new Error(`Baris ${index}: Kode TPS '${tpsCode}' tidak ditemukan.`);
          }

          // Check 1 TPS = 1 Account
          const existingTpsUser = db.prepare("SELECT id FROM users WHERE assigned_tps_id = ? AND role = 'KPPS'").get(tps.id) as any;
          if (existingTpsUser) {
            throw new Error(`Baris ${index}: TPS '${tpsCode}' sudah memiliki akun KPPS.`);
          }

          // Check duplicate email
          const existingEmail = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;
          if (existingEmail) {
            throw new Error(`Baris ${index}: Email '${email}' sudah digunakan.`);
          }

          if (!password) {
            password = generateRandomPassword();
          }

          const hashedPassword = bcrypt.hashSync(password.toString(), 10);

          insertUser.run(
            nama.toString(),
            nama.toString(),
            email.toString(),
            hashedPassword,
            "KPPS",
            tps.id,
            "ACTIVE"
          );

          importedAccounts.push({
            tpsCode,
            nama,
            email,
            password
          });
        }
        db.exec("COMMIT;");
      } catch (err: any) {
        db.exec("ROLLBACK;");
        return res.status(400).json({ message: err.message || "Gagal import excel. Rollback dilakukan." });
      }

      AuditLogsService.log({
        actorUserId: req.user?.sub ? Number(req.user.sub) : null,
        actorRole: req.user?.role || null,
        action: "KPPS_ACCOUNTS_IMPORTED",
        entityType: "USER",
        description: `Imported ${importedAccounts.length} KPPS accounts via Excel.`,
        metadataJson: { importedCount: importedAccounts.length }
      }, req);

      return res.status(200).json({
        message: `Berhasil import ${importedAccounts.length} akun KPPS.`,
        data: importedAccounts
      });
    } catch (error: any) {
      console.error("Error importing Excel:", error);
      return res.status(500).json({ message: "Gagal memproses file Excel." });
    }
  });
});

/**
 * 3. GET /kpps/export
 * Purpose: Export all KPPS accounts
 * Allowed roles: ADMIN
 */
router.get("/export", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const kppsUsers = db.prepare(`
      SELECT t.tps_code, u.full_name, u.email, u.status 
      FROM users u
      LEFT JOIN tps t ON u.assigned_tps_id = t.id
      WHERE u.role = 'KPPS'
      ORDER BY t.tps_code ASC
    `).all() as any[];

    const worksheetData = kppsUsers.map(user => ({
      "Kode TPS": user.tps_code || "N/A",
      "Nama Ketua KPPS": user.full_name || "N/A",
      "Email": user.email,
      "Status": user.status
    }));

    const worksheet = xlsx.utils.json_to_sheet(worksheetData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Akun_KPPS");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", 'attachment; filename="Data_Akun_KPPS.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch (error: any) {
    console.error("Error exporting KPPS accounts:", error);
    return res.status(500).json({ message: "Gagal mengekspor akun KPPS." });
  }
});

export default router;
