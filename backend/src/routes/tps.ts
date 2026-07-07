import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { TpsService, TPS } from "../services/tps";
import { ElectionsService } from "../services/elections";
import { AuditLogsService } from "../services/auditLogs";

const router = Router();

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

    const tps = TpsService.getById(id);
    if (!tps) {
      return res.status(404).json({ message: "TPS not found" });
    }

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
