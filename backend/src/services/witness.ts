import db from "../database/connection";
import { RecapsService } from "./recaps";
import { DocumentsService } from "./documents";
import { AuditLogsService } from "./auditLogs";
import path from "path";
import fs from "fs";

export interface WitnessVerificationRecord {
  id: number;
  election_id: number;
  tps_id: number;
  witness_user_id: number | null;
  candidate_pair_id: number | null;
  status: string;
  note: string | null;
  evidence_file_path: string | null;
  evidence_file_original_name: string | null;
  evidence_file_mime_type: string | null;
  evidence_file_size_bytes: number | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export class WitnessError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "WitnessError";
  }
}

export const WitnessService = {
  getRecapForWitness(tpsId: number, witnessUserId: number) {
    // 1. Fetch TPS Details
    const tps = db.prepare("SELECT * FROM tps WHERE id = ?").get(tpsId) as any;
    if (!tps) {
      throw new WitnessError(404, "TPS tidak ditemukan.");
    }

    // 2. Fetch Election Details
    const election = db.prepare("SELECT * FROM elections WHERE id = ?").get(tps.election_id) as any;
    if (!election) {
      throw new WitnessError(404, "Pemilihan tidak ditemukan.");
    }

    // 3. Fetch Recap
    const recapData = RecapsService.getByTpsId(tpsId);

    // 4. Fetch Document
    const document = DocumentsService.getByTpsId(tpsId);

    // 5. Fetch Verification status for this witness user
    const verification = db.prepare(`
      SELECT * FROM witness_verifications 
      WHERE witness_user_id = ? AND tps_id = ?
    `).get(witnessUserId, tpsId) as unknown as WitnessVerificationRecord | undefined;

    return {
      tps: {
        id: tps.id,
        tps_number: tps.tps_number,
        tps_code: tps.tps_code,
        province: tps.province,
        city_regency: tps.city_regency,
        district: tps.district,
        village: tps.village,
        address: tps.address,
        status: tps.status,
      },
      election: {
        id: election.id,
        name: election.name,
        election_type: election.election_type,
        region_name: election.region_name,
        voting_date: election.voting_date,
      },
      recap: recapData ? {
        id: recapData.recap.id,
        validationStatus: recapData.recap.validation_status,
        totalRegisteredVoters: recapData.recap.total_registered_voters,
        totalVerifiedVoters: recapData.recap.total_verified_voters,
        totalValidVotes: recapData.recap.total_valid_votes,
        totalInvalidVotes: recapData.recap.total_invalid_votes,
      } : null,
      candidateTotals: recapData ? recapData.candidateTotals : [],
      document: document ? {
        id: document.id,
        status: document.status,
        generatedPdfPath: document.generated_pdf_path,
        uploadedSignedFilePath: document.uploaded_signed_file_path,
        signedFileOriginalName: document.signed_file_original_name,
        signedFileMimeType: document.signed_file_mime_type,
        signedFileSize: document.signed_file_size_bytes,
        signedFileHashSha256: document.signed_file_hash_sha256,
        signedFileUploadedAt: document.signed_file_uploaded_at,
        previewUrl: `/documents/tps/${tpsId}/chasil/preview`,
        downloadUrl: `/documents/${document.id}/download`,
        signedPreviewUrl: document.uploaded_signed_file_path ? `/documents/${document.id}/signed-preview` : null,
        signedDownloadUrl: document.uploaded_signed_file_path ? `/documents/${document.id}/signed-download` : null,
      } : null,
      verification: verification ? {
        id: verification.id,
        status: verification.status,
        note: verification.note,
        evidenceFilePath: verification.evidence_file_path,
        evidenceFileOriginalName: verification.evidence_file_original_name,
        evidenceFileMimeType: verification.evidence_file_mime_type,
        evidenceFileSize: verification.evidence_file_size_bytes,
        signedAt: verification.signed_at,
      } : null,
    };
  },

  submitVerification(
    tpsId: number,
    witnessUserId: number,
    status: "APPROVED" | "OBJECTED",
    note: string | null,
    file?: { originalname: string; buffer: Buffer; size: number; mimetype: string }
  ): WitnessVerificationRecord {
    // 1. Fetch TPS
    const tps = db.prepare("SELECT * FROM tps WHERE id = ?").get(tpsId) as any;
    if (!tps) {
      throw new WitnessError(404, "TPS tidak ditemukan.");
    }

    // 2. Fetch User Details to get email/role for logging
    const user = db.prepare("SELECT email, role FROM users WHERE id = ?").get(witnessUserId) as any;
    if (!user) {
      throw new WitnessError(404, "User saksi tidak ditemukan.");
    }

    // 3. Verify Recap exists
    const recap = db.prepare("SELECT id FROM tps_recaps WHERE tps_id = ?").get(tpsId) as any;
    if (!recap) {
      throw new WitnessError(409, "Rekap TPS belum dibuat oleh KPPS.");
    }

    // 4. If status is OBJECTED, note is mandatory
    if (status === "OBJECTED" && (!note || note.trim() === "")) {
      throw new WitnessError(400, "Catatan alasan keberatan wajib diisi.");
    }

    let evidenceFilePath: string | null = null;
    let evidenceFileOriginalName: string | null = null;
    let evidenceFileMimeType: string | null = null;
    let evidenceFileSize: number | null = null;

    // 5. If status is OBJECTED and file is provided, store it
    if (status === "OBJECTED" && file) {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeStoredName = `evidence-${tpsId}-${witnessUserId}-${Date.now()}${ext}`;
      const uploadDir = path.resolve(__dirname, "../../uploads/witness-evidence");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, safeStoredName);
      fs.writeFileSync(filePath, file.buffer);

      evidenceFilePath = `uploads/witness-evidence/${safeStoredName}`;
      evidenceFileOriginalName = file.originalname;
      evidenceFileMimeType = file.mimetype;
      evidenceFileSize = file.size;
    }

    const now = new Date().toISOString();
    let recordId: number;

    try {
      db.exec("BEGIN TRANSACTION;");

      // Check if verification record already exists
      const existing = db.prepare(`
        SELECT id, evidence_file_path FROM witness_verifications 
        WHERE witness_user_id = ? AND tps_id = ?
      `).get(witnessUserId, tpsId) as any;

      const oldFilePath = existing?.evidence_file_path;

      if (existing) {
        recordId = existing.id;
        db.prepare(`
          UPDATE witness_verifications
          SET status = ?,
              note = ?,
              evidence_file_path = COALESCE(?, evidence_file_path),
              evidence_file_original_name = COALESCE(?, evidence_file_original_name),
              evidence_file_mime_type = COALESCE(?, evidence_file_mime_type),
              evidence_file_size_bytes = COALESCE(?, evidence_file_size_bytes),
              signed_at = ?,
              updated_at = ?
          WHERE id = ?
        `).run(
          status,
          note || null,
          evidenceFilePath,
          evidenceFileOriginalName,
          evidenceFileMimeType,
          evidenceFileSize,
          now,
          now,
          recordId
        );
      } else {
        const result = db.prepare(`
          INSERT INTO witness_verifications (
            election_id, tps_id, witness_user_id, status, note,
            evidence_file_path, evidence_file_original_name,
            evidence_file_mime_type, evidence_file_size_bytes, signed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          tps.election_id,
          tpsId,
          witnessUserId,
          status,
          note || null,
          evidenceFilePath,
          evidenceFileOriginalName,
          evidenceFileMimeType,
          evidenceFileSize,
          now
        );
        recordId = Number(result.lastInsertRowid);
      }

      // Update TPS status to WITNESS_VERIFICATION
      db.prepare(`
        UPDATE tps
        SET status = 'WITNESS_VERIFICATION',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(tpsId);

      db.exec("COMMIT;");

      // Delete old file if new one uploaded
      if (oldFilePath && evidenceFilePath && oldFilePath !== evidenceFilePath) {
        const oldAbsolutePath = path.resolve(__dirname, "../../", oldFilePath);
        try {
          if (fs.existsSync(oldAbsolutePath)) {
            fs.unlinkSync(oldAbsolutePath);
          }
        } catch (unlinkErr) {
          console.warn("Failed to delete old evidence file:", unlinkErr);
        }
      }

      // Log activity
      AuditLogsService.log({
        electionId: tps.election_id,
        tpsId: tpsId,
        actorUserId: witnessUserId,
        actorEmail: user.email,
        actorRole: user.role,
        action: "WITNESS_VERIFIED",
        entityType: "WITNESS_VERIFICATION",
        entityId: recordId,
        description: `Witness ${user.email} submitted status ${status} for TPS ID ${tpsId}`,
        metadataJson: {
          status,
          verificationId: recordId,
          hasEvidence: !!evidenceFilePath
        }
      });

      const updatedRecord = db.prepare("SELECT * FROM witness_verifications WHERE id = ?").get(recordId) as unknown as WitnessVerificationRecord;
      return updatedRecord;

    } catch (error) {
      try {
        db.exec("ROLLBACK;");
      } catch (e) {}

      // Clean up newly written file if database error occurs
      if (evidenceFilePath) {
        const newAbsPath = path.resolve(__dirname, "../../", evidenceFilePath);
        try {
          if (fs.existsSync(newAbsPath)) {
            fs.unlinkSync(newAbsPath);
          }
        } catch (e) {}
      }
      throw error;
    }
  }
};
