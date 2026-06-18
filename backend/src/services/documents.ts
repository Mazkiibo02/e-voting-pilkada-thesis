import db from "../database/connection";
import { generateChasilHtml, ChasilTemplateData } from "./chasilTemplate";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";

export interface DocumentRecord {
  id: number;
  election_id: number;
  tps_id: number | null;
  recap_id: number | null;
  document_type: string | null;
  generated_pdf_path: string | null;
  uploaded_signed_file_path: string | null;
  signed_file_hash_sha256: string | null;
  qr_payload: string | null;
  status: string;
  generated_at: string | null;
  signed_file_uploaded_at: string | null;
  signed_file_original_name: string | null;
  signed_file_stored_name: string | null;
  signed_file_mime_type: string | null;
  signed_file_size_bytes: number | null;
  created_at: string;
  updated_at: string;
}

export class DocumentError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "DocumentError";
  }
}

export const DocumentsService = {
  getByTpsId(tpsId: number): DocumentRecord | null {
    const doc = db.prepare("SELECT * FROM documents WHERE tps_id = ? AND document_type = 'CHASIL_KWK_INSPIRED_RESULT_FORM'").get(tpsId) as unknown as DocumentRecord | undefined;
    return doc ?? null;
  },

  getById(id: number): DocumentRecord | null {
    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as unknown as DocumentRecord | undefined;
    return doc ?? null;
  },

  generateForm(tpsId: number): DocumentRecord {
    // 1. Fetch TPS
    const tps = db.prepare("SELECT * FROM tps WHERE id = ?").get(tpsId) as any;
    if (!tps) {
      throw new DocumentError(404, "TPS not found");
    }

    // 2. Fetch Election
    const election = db.prepare("SELECT * FROM elections WHERE id = ?").get(tps.election_id) as any;
    if (!election) {
      throw new DocumentError(404, "Election not found");
    }

    // 3. Fetch Recap
    const recap = db.prepare("SELECT * FROM tps_recaps WHERE tps_id = ?").get(tpsId) as any;
    if (!recap) {
      throw new DocumentError(409, "TPS recap not found. Please generate recap first.");
    }

    // 4. Validate Recap status is VALID
    if (recap.validation_status !== "VALID") {
      throw new DocumentError(409, `TPS recap validation status is ${recap.validation_status}. Document can only be generated for VALID recaps.`);
    }

    // 5. Fetch Candidate totals
    const candidateTotals = db.prepare(`
      SELECT 
        ct.candidate_pair_id as candidatePairId,
        cp.ballot_number as ballotNumber,
        cp.candidate_name as candidateName,
        cp.vice_candidate_name as viceCandidateName,
        cp.coalition_name as coalitionName,
        ct.vote_total as voteTotal,
        ct.vote_total_in_words as voteTotalInWords
      FROM tps_recap_candidate_totals ct
      JOIN candidate_pairs cp ON ct.candidate_pair_id = cp.id
      WHERE ct.recap_id = ?
      ORDER BY cp.ballot_number ASC
    `).all(recap.id) as any[];

    if (!candidateTotals || candidateTotals.length === 0) {
      throw new DocumentError(409, "No candidate totals found for this TPS recap.");
    }

    // 6. Check if document already exists
    const existingDoc = db.prepare(`
      SELECT * FROM documents 
      WHERE tps_id = ? AND election_id = ? AND document_type = 'CHASIL_KWK_INSPIRED_RESULT_FORM'
    `).get(tpsId, tps.election_id) as unknown as DocumentRecord | undefined;

    let documentId: number;
    const now = new Date().toISOString();

    try {
      db.exec("BEGIN TRANSACTION;");

      if (existingDoc) {
        documentId = existingDoc.id;
        db.prepare(`
          UPDATE documents
          SET recap_id = ?, status = 'GENERATED', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(recap.id, documentId);
      } else {
        const result = db.prepare(`
          INSERT INTO documents (election_id, tps_id, recap_id, document_type, status)
          VALUES (?, ?, ?, 'CHASIL_KWK_INSPIRED_RESULT_FORM', 'GENERATED')
        `).run(tps.election_id, tpsId, recap.id);
        documentId = Number(result.lastInsertRowid);
      }

      // Generate HTML string
      const templateData: ChasilTemplateData = {
        election: {
          name: election.name,
          election_type: election.election_type,
          region_name: election.region_name,
          voting_date: election.voting_date,
        },
        tps: {
          tps_number: tps.tps_number || "",
          tps_code: tps.tps_code || "",
          province: tps.province || "",
          city_regency: tps.city_regency || "",
          district: tps.district || "",
          village: tps.village || "",
          address: tps.address || "",
        },
        recap: {
          id: recap.id,
          total_registered_voters: recap.total_registered_voters,
          total_verified_voters: recap.total_verified_voters,
          total_valid_votes: recap.total_valid_votes,
          total_invalid_votes: recap.total_invalid_votes,
          validation_status: recap.validation_status,
        },
        candidateTotals: candidateTotals.map((ct) => ({
          ballotNumber: ct.ballotNumber,
          candidateName: ct.candidateName,
          viceCandidateName: ct.viceCandidateName,
          coalitionName: ct.coalitionName,
          voteTotal: ct.voteTotal,
          voteTotalInWords: ct.voteTotalInWords,
        })),
        documentId,
        status: "GENERATED",
        generatedAt: now,
      };

      const htmlContent = generateChasilHtml(templateData);

      // Write HTML file to disk
      const dirPath = path.resolve(__dirname, "../../generated-documents");
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const safeTpsCode = (tps.tps_code || `tps-${tpsId}`).replace(/[^a-zA-Z0-9_-]/g, "");
      const fileName = `chasil-kwk-inspired-tps-${safeTpsCode}.html`;
      const filePath = path.join(dirPath, fileName);
      fs.writeFileSync(filePath, htmlContent, "utf8");

      // Store relative path in database
      const relativePath = `generated-documents/${fileName}`;
      db.prepare(`
        UPDATE documents
        SET generated_pdf_path = ?, generated_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(relativePath, now, documentId);

      db.exec("COMMIT;");
      
      const finalRecord = db.prepare("SELECT * FROM documents WHERE id = ?").get(documentId) as unknown as DocumentRecord;
      return finalRecord;

    } catch (error) {
      try {
        db.exec("ROLLBACK;");
      } catch (rollbackErr) {
        // ignore
      }
      throw error;
    }
  },

  uploadSignedForm(
    documentId: number,
    file: { originalname: string; buffer: Buffer; size: number; mimetype: string }
  ): DocumentRecord {
    // 1. Fetch existing document metadata
    const doc = this.getById(documentId);
    if (!doc) {
      throw new DocumentError(404, "Document not found");
    }

    // 2. Validate document is generated
    if (!doc.generated_pdf_path) {
      throw new DocumentError(409, "C.Hasil document form has not been generated for this TPS yet.");
    }

    // 3. Fetch related TPS and restrict upload if finalized or anchored
    if (doc.tps_id) {
      const tps = db.prepare("SELECT * FROM tps WHERE id = ?").get(doc.tps_id) as any;
      if (tps && (tps.status === "FINALIZED" || tps.status === "BLOCKCHAIN_ANCHORED")) {
        throw new DocumentError(409, "Cannot upload signed form for a finalized TPS.");
      }
    }

    // 4. Calculate SHA-256 hash from exact uploaded bytes
    const hash = createHash("sha256").update(file.buffer).digest("hex").toLowerCase();

    // 5. Store file securely
    const ext = path.extname(file.originalname).toLowerCase();
    const safeStoredName = `signed-${doc.id}-${Date.now()}${ext}`;
    const uploadDir = path.resolve(__dirname, "../../", process.env.UPLOAD_DIR || "uploads/signed-forms");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, safeStoredName);
    fs.writeFileSync(filePath, file.buffer);

    const relativePath = `${process.env.UPLOAD_DIR || "uploads/signed-forms"}/${safeStoredName}`.replace(/\\/g, "/");
    const now = new Date().toISOString();
    const oldRelativePath = doc.uploaded_signed_file_path;

    try {
      db.exec("BEGIN TRANSACTION;");

      // Update documents table metadata
      db.prepare(`
        UPDATE documents
        SET uploaded_signed_file_path = ?,
            signed_file_hash_sha256 = ?,
            signed_file_original_name = ?,
            signed_file_stored_name = ?,
            signed_file_mime_type = ?,
            signed_file_size_bytes = ?,
            status = 'SIGNED_UPLOADED',
            signed_file_uploaded_at = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        relativePath,
        hash,
        file.originalname,
        safeStoredName,
        file.mimetype,
        file.size,
        now,
        doc.id
      );

      // Update TPS status to DOCUMENT_UPLOADED
      if (doc.tps_id) {
        db.prepare(`
          UPDATE tps
          SET status = 'DOCUMENT_UPLOADED',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(doc.tps_id);
      }

      db.exec("COMMIT;");

      // After transaction commits successfully, clean up the old file from disk if it existed
      if (oldRelativePath && oldRelativePath !== relativePath) {
        const oldAbsolutePath = path.resolve(__dirname, "../../", oldRelativePath);
        try {
          if (fs.existsSync(oldAbsolutePath)) {
            fs.unlinkSync(oldAbsolutePath);
          }
        } catch (err) {
          console.warn("Failed to delete old signed form file:", err);
        }
      }

      const finalRecord = this.getById(doc.id);
      if (!finalRecord) {
        throw new DocumentError(500, "Failed to retrieve updated document metadata");
      }
      return finalRecord;

    } catch (error) {
      try {
        db.exec("ROLLBACK;");
      } catch (rollbackErr) {
        // ignore
      }
      // Clean up the newly written file if database update failed
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        // ignore
      }
      throw error;
    }
  }
};
