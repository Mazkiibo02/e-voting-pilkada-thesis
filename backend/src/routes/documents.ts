import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { DocumentsService, DocumentError } from "../services/documents";
import db from "../database/connection";
import path from "path";
import fs from "fs";
import multer from "multer";
import { AuditLogsService } from "../services/auditLogs";

const router = Router();

// Helper to check if KPPS user has access to a specific TPS ID
const enforceTpsAccess = (req: AuthRequest, tpsId: number): boolean => {
  if (req.user?.role === "KPPS") {
    return req.user.assignedTpsId === tpsId;
  }
  return true; // ADMIN can access any TPS
};

/**
 * 1. POST /documents/tps/:tpsId/chasil/generate
 * Purpose: Generate or regenerate a C.Hasil-KWK-inspired TPS Result Form from an existing valid TPS recap.
 * Allowed roles: ADMIN, KPPS
 */
router.post("/tps/:tpsId/chasil/generate", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const tpsId = Number(req.params.tpsId);
    if (isNaN(tpsId)) {
      return res.status(400).json({ message: "Invalid TPS ID" });
    }

    if (!enforceTpsAccess(req, tpsId)) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot manage documents for other TPS" });
    }

    // Call service to generate the document
    const doc = DocumentsService.generateForm(tpsId);

    AuditLogsService.log({
      electionId: doc.election_id,
      tpsId: doc.tps_id,
      actorUserId: req.user?.sub ? Number(req.user.sub) : null,
      actorRole: req.user?.role || null,
      action: "CHASIL_GENERATED",
      entityType: "DOCUMENT",
      entityId: doc.id,
      description: `C.Hasil generated successfully for TPS ID ${doc.tps_id}`,
      metadataJson: {
        documentId: doc.id
      }
    });

    return res.status(200).json({
      message: "Form generated successfully",
      data: {
        id: doc.id,
        electionId: doc.election_id,
        tpsId: doc.tps_id,
        recapId: doc.recap_id,
        documentType: doc.document_type,
        generatedPdfPath: doc.generated_pdf_path,
        status: doc.status,
        generatedAt: doc.generated_at,
        previewUrl: `/documents/tps/${tpsId}/chasil/preview`,
        downloadUrl: `/documents/${doc.id}/download`,
      },
    });
  } catch (error: any) {
    if (error instanceof DocumentError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Error generating document:", error);
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
});

/**
 * 2. GET /documents/tps/:tpsId/chasil/preview
 * Purpose: Return a print-ready HTML preview of the generated C.Hasil-KWK-inspired form.
 * Allowed roles: ADMIN, KPPS
 */
router.get("/tps/:tpsId/chasil/preview", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const tpsId = Number(req.params.tpsId);
    if (isNaN(tpsId)) {
      return res.status(400).json({ message: "Invalid TPS ID" });
    }

    if (!enforceTpsAccess(req, tpsId)) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot preview documents for other TPS" });
    }

    const doc = DocumentsService.getByTpsId(tpsId);
    if (!doc || !doc.generated_pdf_path) {
      return res.status(404).json({
        message: "No generated C.Hasil-KWK-inspired form exists for this TPS. Please generate it first.",
      });
    }

    // Resolve absolute path to the HTML file
    const absolutePath = path.resolve(__dirname, "../../", doc.generated_pdf_path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        message: "Generated HTML document file not found on disk. Please regenerate the form.",
      });
    }

    res.setHeader("Content-Type", "text/html");
    return res.sendFile(absolutePath);
  } catch (error: any) {
    console.error("Error previewing document:", error);
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
});

/**
 * 3. GET /documents/:documentId/download
 * Purpose: Download the generated print-ready document.
 * Allowed roles: ADMIN, KPPS
 */
router.get("/:documentId/download", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const docId = Number(req.params.documentId);
    if (isNaN(docId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    const doc = DocumentsService.getById(docId);
    if (!doc || !doc.generated_pdf_path) {
      return res.status(404).json({ message: "Document not found or not yet generated" });
    }

    // Enforce role-based access for the TPS associated with the document
    if (doc.tps_id !== null && !enforceTpsAccess(req, doc.tps_id)) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot download documents for other TPS" });
    }

    // Resolve absolute path to the file
    const absolutePath = path.resolve(__dirname, "../../", doc.generated_pdf_path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        message: "Generated HTML document file not found on disk. Please regenerate the form.",
      });
    }

    // Fetch TPS code for a safe, descriptive filename
    let tpsCode = `tps-${doc.tps_id}`;
    if (doc.tps_id !== null) {
      const tps = db.prepare("SELECT tps_code FROM tps WHERE id = ?").get(doc.tps_id) as any;
      if (tps && tps.tps_code) {
        tpsCode = tps.tps_code;
      }
    }

    const safeTpsCode = tpsCode.replace(/[^a-zA-Z0-9_-]/g, "");
    const downloadName = `chasil-kwk-inspired-tps-${safeTpsCode}.html`;

    return res.download(absolutePath, downloadName, (err) => {
      if (err && !res.headersSent) {
        console.error("Error during download transmission:", err);
        return res.status(500).json({ message: "Failed to download document" });
      }
    });
  } catch (error: any) {
    console.error("Error downloading document:", error);
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
});

/**
 * 4. GET /documents/tps/:tpsId
 * Purpose: Return document metadata for a TPS.
 * Allowed roles: ADMIN, KPPS
 */
router.get("/tps/:tpsId", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const tpsId = Number(req.params.tpsId);
    if (isNaN(tpsId)) {
      return res.status(400).json({ message: "Invalid TPS ID" });
    }

    if (!enforceTpsAccess(req, tpsId)) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot access metadata for other TPS" });
    }

    const doc = DocumentsService.getByTpsId(tpsId);
    if (!doc) {
      return res.status(404).json({ message: "Document metadata not found for this TPS" });
    }

    const blockchainRecord = db.prepare("SELECT * FROM blockchain_records WHERE tps_id = ?").get(tpsId) as any;

    return res.json({
      data: {
        id: doc.id,
        electionId: doc.election_id,
        tpsId: doc.tps_id,
        recapId: doc.recap_id,
        documentType: doc.document_type,
        generatedPdfPath: doc.generated_pdf_path,
        status: doc.status,
        generatedAt: doc.generated_at,
        previewUrl: `/documents/tps/${tpsId}/chasil/preview`,
        downloadUrl: `/documents/${doc.id}/download`,
        signedFile: doc.uploaded_signed_file_path ? {
          originalName: doc.signed_file_original_name,
          mimeType: doc.signed_file_mime_type,
          sizeBytes: doc.signed_file_size_bytes,
          sha256: doc.signed_file_hash_sha256,
          uploadedAt: doc.signed_file_uploaded_at,
        } : null,
        blockchainRecord: blockchainRecord ? {
          transactionHash: blockchainRecord.transaction_hash,
          contractAddress: blockchainRecord.contract_address,
          chainId: blockchainRecord.chain_id,
          finalizedAt: blockchainRecord.finalized_at
        } : null,
      },
    });
  } catch (error: any) {
    console.error("Error retrieving document metadata:", error);
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
});

// Configure multer
const maxUploadSizeMb = Number(process.env.MAX_SIGNED_FORM_UPLOAD_MB) || 10;
const uploadLimitBytes = maxUploadSizeMb * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadLimitBytes },
}).single("signedForm");

/**
 * 5. POST /documents/:documentId/signed-upload
 * Purpose: Upload a photographed or scanned version of the C.Hasil-KWK-inspired form.
 * Allowed roles: ADMIN, KPPS
 */
router.post("/:documentId/signed-upload", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const docId = Number(req.params.documentId);
    if (isNaN(docId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    const doc = DocumentsService.getById(docId);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Enforce role-based access for the TPS associated with the document
    if (doc.tps_id !== null && !enforceTpsAccess(req, doc.tps_id)) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot manage documents for other TPS" });
    }

    // Process file upload using multer
    upload(req, res, async (uploadErr: any) => {
      if (uploadErr) {
        if (uploadErr.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: `File size exceeds the limit of ${maxUploadSizeMb}MB.` });
        }
        return res.status(400).json({ message: "Invalid file upload attempt." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded. Please upload a file with field name 'signedForm'." });
      }

      const allowedMimetypes = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowedMimetypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Unsupported file type. Allowed types: PDF, JPEG, PNG." });
      }

      const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        return res.status(400).json({ message: "Unsupported file extension. Allowed extensions: .pdf, .jpg, .jpeg, .png." });
      }

      try {
        const updatedDoc = DocumentsService.uploadSignedForm(docId, req.file);

        AuditLogsService.log({
          electionId: updatedDoc.election_id,
          tpsId: updatedDoc.tps_id,
          actorUserId: req.user?.sub ? Number(req.user.sub) : null,
          actorRole: req.user?.role || null,
          action: "SIGNED_FORM_UPLOADED",
          entityType: "DOCUMENT",
          entityId: updatedDoc.id,
          description: `Signed form uploaded for TPS ID ${updatedDoc.tps_id}`,
          metadataJson: {
            documentId: updatedDoc.id,
            originalName: updatedDoc.signed_file_original_name,
            mimeType: updatedDoc.signed_file_mime_type,
            sizeBytes: updatedDoc.signed_file_size_bytes,
            sha256: updatedDoc.signed_file_hash_sha256
          }
        });

        return res.status(200).json({
          document: {
            id: updatedDoc.id,
            tpsId: updatedDoc.tps_id,
            status: updatedDoc.status,
            signedFile: {
              originalName: updatedDoc.signed_file_original_name,
              mimeType: updatedDoc.signed_file_mime_type,
              sizeBytes: updatedDoc.signed_file_size_bytes,
              sha256: updatedDoc.signed_file_hash_sha256,
              uploadedAt: updatedDoc.signed_file_uploaded_at,
            },
          },
        });
      } catch (serviceErr: any) {
        if (serviceErr instanceof DocumentError) {
          return res.status(serviceErr.status).json({ message: serviceErr.message });
        }
        console.error("Error during signed file processing:", serviceErr);
        return res.status(500).json({ message: "An unexpected error occurred during file processing." });
      }
    });
  } catch (error: any) {
    console.error("Error initiating upload:", error);
    return res.status(500).json({ message: "An unexpected error occurred." });
  }
});

/**
 * 6. GET /documents/:documentId/signed-download
 * Purpose: Download the uploaded signed result document.
 * Allowed roles: ADMIN, KPPS
 */
router.get("/:documentId/signed-download", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const docId = Number(req.params.documentId);
    if (isNaN(docId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    const doc = DocumentsService.getById(docId);
    if (!doc || !doc.uploaded_signed_file_path) {
      return res.status(404).json({ message: "Signed document not found or not yet uploaded" });
    }

    // Enforce role-based access for the TPS associated with the document
    if (doc.tps_id !== null && !enforceTpsAccess(req, doc.tps_id)) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot access documents for other TPS" });
    }

    const uploadDir = path.resolve(__dirname, "../../", process.env.UPLOAD_DIR || "uploads/signed-forms");
    const filename = path.basename(doc.uploaded_signed_file_path);
    const absolutePath = path.join(uploadDir, filename);

    if (!absolutePath.startsWith(uploadDir)) {
      return res.status(400).json({ message: "Invalid file path" });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "Signed document file not found on disk" });
    }

    const originalName = doc.signed_file_original_name || `signed-document-${docId}${path.extname(doc.uploaded_signed_file_path)}`;

    return res.download(absolutePath, originalName, (err) => {
      if (err && !res.headersSent) {
        console.error("Error during signed document download transmission:", err);
        return res.status(500).json({ message: "Failed to download signed document" });
      }
    });
  } catch (error: any) {
    console.error("Error downloading signed document:", error);
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
});

/**
 * 7. GET /documents/:documentId/signed-preview
 * Purpose: Preview the uploaded signed result document.
 * Allowed roles: ADMIN, KPPS
 */
router.get("/:documentId/signed-preview", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const docId = Number(req.params.documentId);
    if (isNaN(docId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    const doc = DocumentsService.getById(docId);
    if (!doc || !doc.uploaded_signed_file_path) {
      return res.status(404).json({ message: "Signed document not found or not yet uploaded" });
    }

    // Enforce role-based access for the TPS associated with the document
    if (doc.tps_id !== null && !enforceTpsAccess(req, doc.tps_id)) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot access documents for other TPS" });
    }

    const uploadDir = path.resolve(__dirname, "../../", process.env.UPLOAD_DIR || "uploads/signed-forms");
    const filename = path.basename(doc.uploaded_signed_file_path);
    const absolutePath = path.join(uploadDir, filename);

    if (!absolutePath.startsWith(uploadDir)) {
      return res.status(400).json({ message: "Invalid file path" });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "Signed document file not found on disk" });
    }

    if (doc.signed_file_mime_type) {
      res.setHeader("Content-Type", doc.signed_file_mime_type);
    }
    return res.sendFile(absolutePath);
  } catch (error: any) {
    console.error("Error previewing signed document:", error);
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
});

export default router;
