import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { WitnessService, WitnessError } from "../services/witness";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Configure multer for evidence upload
const maxEvidenceSizeMb = 5;
const uploadLimitBytes = maxEvidenceSizeMb * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadLimitBytes },
}).single("evidenceFile");

/**
 * 1. GET /witness/recap
 * Purpose: Fetch assigned TPS recap and document metadata for logged-in witness.
 * Allowed roles: WITNESS, PENGAWAS
 */
router.get("/recap", authenticateToken, requireRole(["WITNESS", "PENGAWAS"]), async (req: AuthRequest, res: Response) => {
  try {
    const assignedTpsId = req.user?.assignedTpsId;
    const witnessUserId = req.user?.sub ? Number(req.user.sub) : null;

    if (!assignedTpsId) {
      return res.status(400).json({ message: "Saksi tidak ditugaskan ke TPS manapun." });
    }

    if (!witnessUserId || isNaN(witnessUserId)) {
      return res.status(401).json({ message: "Identitas saksi tidak valid." });
    }

    const data = WitnessService.getRecapForWitness(assignedTpsId, witnessUserId);
    return res.json({ data });
  } catch (error: any) {
    if (error instanceof WitnessError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Error fetching witness recap:", error);
    return res.status(500).json({ message: "Gagal memuat data rekap TPS." });
  }
});

/**
 * 2. POST /witness/verify
 * Purpose: Approve or object to the assigned TPS recap with optional evidence upload.
 * Allowed roles: WITNESS, PENGAWAS
 */
router.post("/verify", authenticateToken, requireRole(["WITNESS", "PENGAWAS"]), async (req: AuthRequest, res: Response) => {
  try {
    const assignedTpsId = req.user?.assignedTpsId;
    const witnessUserId = req.user?.sub ? Number(req.user.sub) : null;

    if (!assignedTpsId) {
      return res.status(400).json({ message: "Saksi tidak ditugaskan ke TPS manapun." });
    }

    if (!witnessUserId || isNaN(witnessUserId)) {
      return res.status(401).json({ message: "Identitas saksi tidak valid." });
    }

    // Process file upload using multer
    upload(req, res, async (uploadErr: any) => {
      if (uploadErr) {
        if (uploadErr.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: `Ukuran file melebihi batas ${maxEvidenceSizeMb}MB.` });
        }
        return res.status(400).json({ message: "Gagal memproses file evidence." });
      }

      const { status, notes } = req.body;

      if (!status || (status !== "APPROVED" && status !== "OBJECTED")) {
        return res.status(400).json({ message: "Status harus bernilai APPROVED atau OBJECTED." });
      }

      if (status === "OBJECTED" && (!notes || notes.trim() === "")) {
        return res.status(400).json({ message: "Catatan alasan keberatan wajib diisi." });
      }

      // If a file is uploaded, validate it
      if (req.file) {
        const allowedMimetypes = ["application/pdf", "image/jpeg", "image/png"];
        if (!allowedMimetypes.includes(req.file.mimetype)) {
          return res.status(400).json({ message: "Tipe file tidak didukung. Jenis yang diperbolehkan: PDF, JPEG, PNG." });
        }

        const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          return res.status(400).json({ message: "Ekstensi file tidak didukung. Jenis yang diperbolehkan: .pdf, .jpg, .jpeg, .png." });
        }
      }

      try {
        const record = WitnessService.submitVerification(
          assignedTpsId,
          witnessUserId,
          status,
          notes,
          req.file
        );

        return res.status(200).json({
          message: "Verifikasi saksi berhasil disimpan.",
          data: record,
        });
      } catch (serviceErr: any) {
        if (serviceErr instanceof WitnessError) {
          return res.status(serviceErr.status).json({ message: serviceErr.message });
        }
        console.error("Error during witness verification processing:", serviceErr);
        return res.status(500).json({ message: "Gagal memproses verifikasi saksi." });
      }
    });

  } catch (error: any) {
    console.error("Error in witness verification route:", error);
    return res.status(500).json({ message: "Gagal memproses verifikasi saksi." });
  }
});

/**
 * 3. GET /witness/evidence/:verificationId
 * Purpose: Download the uploaded evidence file for a verification.
 * Allowed roles: WITNESS, ADMIN
 */
router.get("/evidence/:verificationId", authenticateToken, requireRole(["WITNESS", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const verificationId = Number(req.params.verificationId);
    if (isNaN(verificationId)) {
      return res.status(400).json({ message: "Invalid verification ID" });
    }

    const db = require("../database/connection").default;
    const verification = db.prepare("SELECT * FROM witness_verifications WHERE id = ?").get(verificationId) as any;
    if (!verification || !verification.evidence_file_path) {
      return res.status(404).json({ message: "File evidence tidak ditemukan." });
    }

    // Enforce role-based access for the TPS associated with the verification
    if (req.user?.role === "WITNESS" && req.user.assignedTpsId !== verification.tps_id) {
      return res.status(403).json({ message: "Akses ditolak: Saksi tidak diizinkan mengakses evidence dari TPS lain." });
    }

    const absolutePath = path.resolve(__dirname, "../../", verification.evidence_file_path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "File evidence tidak ditemukan di disk." });
    }

    const originalName = verification.evidence_file_original_name || `evidence-${verificationId}${path.extname(verification.evidence_file_path)}`;
    
    if (verification.evidence_file_mime_type) {
      res.setHeader("Content-Type", verification.evidence_file_mime_type);
    }
    return res.download(absolutePath, originalName);
  } catch (error) {
    console.error("Error downloading evidence file:", error);
    return res.status(500).json({ message: "Gagal mengunduh file evidence." });
  }
});

export default router;
