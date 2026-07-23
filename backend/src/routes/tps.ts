import { Router, Request, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { TpsService, TPS } from "../services/tps";
import { ElectionsService } from "../services/elections";
import { AuditLogsService } from "../services/auditLogs";
import multer from "multer";
import * as xlsx from "xlsx";
import db from "../database/connection";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Controlled status values for TPS
const VALID_TPS_STATUSES = [
  "DRAFT",
  "OPEN",
  "CLOSED",
  "RECAP_GENERATED",
  "DOCUMENT_UPLOADED",
  "WITNESS_VERIFICATION",
  "FINALIZED",
  "BLOCKCHAIN_ANCHORED",
];

// Helper to filter TPS list for KPPS or check access to single TPS
const enforceTpsAccess = (req: AuthRequest, tpsId: number): boolean => {
  if (req.user?.role === "KPPS") {
    return req.user.assignedTpsId === tpsId;
  }
  return true; // ADMIN can access anything
};

// GET /tps
router.get("/", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    let tpsList: TPS[] = [];

    if (req.user?.role === "KPPS") {
      const assignedId = req.user.assignedTpsId;
      if (assignedId) {
        const tps = TpsService.getById(assignedId);
        if (tps) tpsList.push(tps);
      }
    } else {
      tpsList = TpsService.getAll();
    }

    // Auto-Initialize Default TPS if exactly 0 records
    if (tpsList.length === 0) {
      let electionId = 1;
      const elections = ElectionsService.getAll();
      if (elections.length === 0) {
        const newElection = ElectionsService.create({
          name: "Pilkada Kota Tegal 2026 (Demo)",
          election_type: "PILKADA",
          region_name: "Kota Tegal",
          status: "ACTIVE"
        });
        electionId = newElection.id;
      } else {
        electionId = elections[0].id;
      }
      
      const newTps = TpsService.create({
        election_id: electionId,
        tps_code: 'TPS-001',
        tps_number: '01',
        address: 'TPS 01 Pusat',
        status: 'OPEN',
      });
      tpsList.push(newTps);
    }

    return res.json({
      items: tpsList,
      total: tpsList.length,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve TPS list" });
  }
});

// GET /tps/template - Download Template Excel untuk Import TPS (Public/Open)
router.get("/template", (req: Request, res: Response) => {
  try {
    const templateData = [
      {
        "Kode TPS": "TPS-001",
        "Lokasi Spesifik / Alamat": "Kecamatan Tegal Timur, Kelurahan Kejambon",
        "Jumlah DPT": 250
      },
      {
        "Kode TPS": "TPS-002",
        "Lokasi Spesifik / Alamat": "Kecamatan Tegal Selatan, Kelurahan Randugunting",
        "Jumlah DPT": 300
      },
      {
        "Kode TPS": "TPS-003",
        "Lokasi Spesifik / Alamat": "Kecamatan Margadana, Kelurahan Sumurpanggang",
        "Jumlah DPT": 280
      }
    ];

    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Template_TPS");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="Template_Import_TPS_Kota_Tegal.xlsx"');
    return res.send(buffer);
  } catch (error) {
    console.error("Failed to generate TPS template:", error);
    return res.status(500).json({ message: "Failed to generate template" });
  }
});

// GET /tps/export - Export All TPS to Excel
router.get("/export", authenticateToken, requireRole(["ADMIN"]), (req: AuthRequest, res: Response) => {
  try {
    const tpsList = TpsService.getAll();
    const exportData = tpsList.map((tps) => ({
      "Kode TPS": tps.tps_code || `TPS-${tps.id}`,
      "Lokasi Spesifik / Alamat": tps.address || "-",
      "Jumlah DPT": tps.registered_voters_total ?? 0,
      "Status": tps.status || "OPEN"
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Data_TPS");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="Data_TPS_Kota_Tegal.xlsx"');
    return res.send(buffer);
  } catch (error) {
    console.error("Failed to export TPS:", error);
    return res.status(500).json({ message: "Failed to export TPS" });
  }
});

// POST /tps/import - Import TPS from Excel File
router.post("/import", authenticateToken, requireRole(["ADMIN"]), upload.single("excelFile"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File Excel (excelFile) wajib diunggah." });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return res.status(400).json({ message: "File Excel tidak memiliki sheet valid." });
    }

    const rows = xlsx.utils.sheet_to_json(sheet) as any[];

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: "File Excel kosong atau format tidak sesuai." });
    }

    // Get active election ID
    let electionId = 1;
    const elections = ElectionsService.getAll();
    if (elections.length > 0) {
      electionId = elections[0].id;
    } else {
      const newElection = ElectionsService.create({
        name: "Pilkada Kota Tegal 2026",
        election_type: "PILKADA",
        region_name: "Kota Tegal",
        status: "ACTIVE"
      });
      electionId = newElection.id;
    }

    const existingTps = TpsService.getAll(electionId);
    const existingCodeMap = new Map<string, TPS>();
    existingTps.forEach((t) => {
      if (t.tps_code) {
        existingCodeMap.set(t.tps_code.toUpperCase(), t);
      }
    });

    let importedCount = 0;
    let updatedCount = 0;
    let autoIndex = existingTps.length + 1;

    for (const row of rows) {
      // Find TPS Code column
      let rawCode = row["Kode TPS"] || row["Kode_TPS"] || row["tps_code"] || row["TPS"] || row["Kode"] || "";
      let tpsCode = "";
      if (rawCode) {
        const strCode = String(rawCode).trim();
        if (/^\d+$/.test(strCode)) {
          tpsCode = `TPS-${strCode.padStart(3, "0")}`;
        } else if (strCode.toUpperCase().startsWith("TPS-")) {
          tpsCode = strCode.toUpperCase();
        } else {
          tpsCode = `TPS-${strCode.toUpperCase()}`;
        }
      } else {
        tpsCode = `TPS-${autoIndex.toString().padStart(3, "0")}`;
        autoIndex++;
      }

      // Extract Location / Address
      let location = row["Lokasi Spesifik / Alamat"] || row["Lokasi"] || row["Alamat"] || row["address"] || row["Lokasi Spesifik"] || "";
      if (!location && (row["Kecamatan"] || row["Kelurahan"])) {
        const kec = row["Kecamatan"] || "";
        const kel = row["Kelurahan"] || "";
        location = `Kecamatan ${kec}, Kelurahan ${kel}`.trim();
      }
      if (!location) {
        location = `TPS ${tpsCode}`;
      }

      // Extract DPT count
      let rawDpt = row["Jumlah DPT"] || row["DPT"] || row["Jumlah_DPT"] || row["registered_voters_total"] || row["Jumlah Pemilih"] || 250;
      let dptCount = parseInt(String(rawDpt), 10);
      if (isNaN(dptCount) || dptCount < 0) dptCount = 0;
      if (dptCount > 500) dptCount = 500; // KPU max limit

      const tpsNum = tpsCode.replace("TPS-", "");

      const existingRecord = existingCodeMap.get(tpsCode.toUpperCase());
      if (existingRecord) {
        TpsService.update(existingRecord.id, {
          address: String(location).trim(),
          registered_voters_total: dptCount,
        });
        updatedCount++;
      } else {
        const newTps = TpsService.create({
          election_id: electionId,
          tps_code: tpsCode,
          tps_number: tpsNum,
          address: String(location).trim(),
          status: "OPEN",
          registered_voters_total: dptCount,
        });
        existingCodeMap.set(tpsCode.toUpperCase(), newTps);
        importedCount++;
      }
    }

    AuditLogsService.log({
      electionId,
      actorUserId: req.user?.sub ? Number(req.user.sub) : null,
      actorRole: req.user?.role || null,
      action: "TPS_EXCEL_IMPORTED",
      entityType: "TPS",
      description: `Berhasil meng-import ${importedCount} TPS baru dan memperbarui ${updatedCount} TPS dari Excel.`,
      metadataJson: { importedCount, updatedCount, totalRows: rows.length }
    });

    return res.status(200).json({
      success: true,
      message: `Berhasil meng-import ${importedCount} TPS baru dan memperbarui ${updatedCount} TPS (${rows.length} total baris diproses).`,
      importedCount,
      updatedCount,
      totalProcessed: rows.length
    });
  } catch (error: any) {
    console.error("Failed to import TPS from Excel:", error);
    return res.status(500).json({ message: "Gagal memproses file Excel: " + (error.message || "Unknown error") });
  }
});

// GET /tps/:id
router.get("/:id", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid TPS ID" });
    }

    if (!enforceTpsAccess(req, id)) {
      return res.status(403).json({ message: "Access forbidden to this TPS" });
    }

    const tps = TpsService.getById(id) as any;
    if (!tps) {
      return res.status(404).json({ message: "TPS not found" });
    }

    const kppsUser = db.prepare("SELECT full_name, name, nik FROM users WHERE role = 'KPPS' AND assigned_tps_id = ?").get(id) as any;
    tps.kppsOfficer = {
      name: kppsUser?.full_name || kppsUser?.name || "ANDZANI FARISAH ZATIL H.",
      nik: kppsUser?.nik || "3328185310960003"
    };

    return res.json({ data: tps });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve TPS" });
  }
});

// GET /elections/:electionId/tps
router.get("/elections/:electionId/tps", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const electionId = Number(req.params.electionId);
    if (isNaN(electionId)) {
      return res.status(400).json({ message: "Invalid election ID" });
    }

    const election = ElectionsService.getById(electionId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    let tpsList = TpsService.getAll(electionId);

    // If KPPS, filter list to only include their assigned TPS
    if (req.user?.role === "KPPS") {
      const assignedId = req.user.assignedTpsId;
      tpsList = tpsList.filter((tps) => tps.id === assignedId);
    }

    return res.json({
      items: tpsList,
      total: tpsList.length,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve TPS list for election" });
  }
});

// POST /tps
router.post("/", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const {
      election_id,
      location,
      registered_voters_total,
    } = req.body;

    // Default to the first active election if not provided
    let finalElectionId = Number(election_id);
    if (!finalElectionId || isNaN(finalElectionId)) {
      const elections = ElectionsService.getAll();
      if (elections.length > 0) {
        finalElectionId = elections[0].id;
      } else {
        return res.status(400).json({ message: "No active election found" });
      }
    }

    const regTotal = Number(registered_voters_total);
    if (isNaN(regTotal) || regTotal < 0) {
      return res.status(400).json({ message: "registered_voters_total must be non-negative" });
    }
    
    // Strict KPU Guardrail
    if (regTotal > 500) {
      return res.status(400).json({ message: "Maksimal 500 DPT sesuai regulasi KPU." });
    }

    if (!location || typeof location !== "string" || location.trim() === "") {
      return res.status(400).json({ message: "Lokasi Spesifik (location) is required" });
    }

    // Auto-generate tps_code and tps_number
    const allTps = TpsService.getAll(finalElectionId);
    let maxSuffix = 0;
    
    allTps.forEach(tps => {
      if (tps.tps_code && tps.tps_code.startsWith("TPS-")) {
        const parts = tps.tps_code.split("-");
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxSuffix) {
            maxSuffix = num;
          }
        }
      }
    });
    
    const nextSuffix = maxSuffix + 1;
    const tps_number = nextSuffix.toString().padStart(2, '0'); // Usually 01, 02...
    const tps_code = `TPS-${nextSuffix.toString().padStart(3, '0')}`;

    const newTps = TpsService.create({
      election_id: finalElectionId,
      tps_number: tps_number,
      tps_code: tps_code,
      address: location.trim(),
      status: "OPEN",
      registered_voters_total: regTotal,
    });

    return res.status(201).json({ data: newTps });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create TPS" });
  }
});

// PATCH /tps/:id
router.patch("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid TPS ID" });
    }

    const existing = TpsService.getById(id);
    if (!existing) {
      return res.status(404).json({ message: "TPS not found" });
    }

    const {
      election_id,
      tps_number,
      tps_code,
      province,
      city_regency,
      district,
      village,
      address,
      status,
      registered_voters_total,
    } = req.body;

    if (election_id !== undefined) {
      if (isNaN(Number(election_id))) {
        return res.status(400).json({ message: "Valid election_id is required" });
      }
      const election = ElectionsService.getById(Number(election_id));
      if (!election) {
        return res.status(400).json({ message: "Election does not exist" });
      }
    }

    if (tps_number !== undefined && (typeof tps_number !== "string" || tps_number.trim() === "")) {
      return res.status(400).json({ message: "tps_number cannot be empty" });
    }

    if (tps_code !== undefined && (typeof tps_code !== "string" || tps_code.trim() === "")) {
      return res.status(400).json({ message: "tps_code cannot be empty" });
    }

    if (registered_voters_total !== undefined) {
      const regTotal = Number(registered_voters_total);
      if (isNaN(regTotal) || regTotal < 0) {
        return res.status(400).json({ message: "registered_voters_total must be non-negative" });
      }
    }

    if (status !== undefined && !VALID_TPS_STATUSES.includes(status.toUpperCase())) {
      return res.status(400).json({
        message: `TPS status must be one of: ${VALID_TPS_STATUSES.join(", ")}`,
      });
    }

    const updated = TpsService.update(id, {
      election_id: election_id !== undefined ? Number(election_id) : undefined,
      tps_number: tps_number ? tps_number.trim() : undefined,
      tps_code: tps_code ? tps_code.trim() : undefined,
      province: province ? province.trim() : undefined,
      city_regency: city_regency ? city_regency.trim() : undefined,
      district: district ? district.trim() : undefined,
      village: village ? village.trim() : undefined,
      address: address ? address.trim() : undefined,
      status: status ? status.toUpperCase() : undefined,
      registered_voters_total: registered_voters_total !== undefined ? Number(registered_voters_total) : undefined,
    });

    if (!updated) {
      return res.status(404).json({ message: "TPS not found" });
    }

    if (status !== undefined) {
      AuditLogsService.log({
        electionId: updated.election_id,
        tpsId: updated.id,
        actorUserId: req.user?.sub ? Number(req.user.sub) : null,
        actorRole: req.user?.role || null,
        action: "TPS_STATUS_UPDATED",
        entityType: "TPS",
        entityId: updated.id,
        description: `TPS status updated to ${updated.status}`,
        metadataJson: { status: updated.status }
      });
    }

    return res.json({ data: updated });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update TPS" });
  }
});

// PATCH /tps/:id/status
router.patch("/:id/status", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid TPS ID" });
    }

    const existing = TpsService.getById(id);
    if (!existing) {
      return res.status(404).json({ message: "TPS not found" });
    }

    const { status } = req.body;
    if (!status || !VALID_TPS_STATUSES.includes(status.toUpperCase())) {
      return res.status(400).json({
        message: `Status is required and must be one of: ${VALID_TPS_STATUSES.join(", ")}`,
      });
    }

    const updated = TpsService.update(id, { status: status.toUpperCase() });

    if (!updated) {
      return res.status(404).json({ message: "TPS not found" });
    }

    AuditLogsService.log({
      electionId: updated.election_id,
      tpsId: updated.id,
      actorUserId: req.user?.sub ? Number(req.user.sub) : null,
      actorRole: req.user?.role || null,
      action: "TPS_STATUS_UPDATED",
      entityType: "TPS",
      entityId: updated.id,
      description: `TPS status updated to ${updated.status}`,
      metadataJson: { status: updated.status }
    });

    return res.json({ data: updated });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update TPS status" });
  }
});

// DELETE /tps/:id
router.delete("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid TPS ID" });
    }

    const success = TpsService.delete(id);
    if (!success) {
      return res.status(404).json({ message: "TPS not found" });
    }

    return res.json({
      data: {
        id,
        message: "TPS deleted successfully",
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete TPS" });
  }
});

export default router;
