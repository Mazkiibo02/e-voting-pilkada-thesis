import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { DocumentsService, DocumentError } from "../services/documents";
import db from "../database/connection";
import path from "path";
import fs from "fs";

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
      },
    });
  } catch (error: any) {
    console.error("Error retrieving document metadata:", error);
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
});

export default router;
