import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { TpsService, TPS } from "../services/tps";
import { ElectionsService } from "../services/elections";

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

    if (!election_id || isNaN(Number(election_id))) {
      return res.status(400).json({ message: "Valid election_id is required" });
    }

    const election = ElectionsService.getById(Number(election_id));
    if (!election) {
      return res.status(400).json({ message: "Election does not exist" });
    }

    if (
      (!tps_number || typeof tps_number !== "string" || tps_number.trim() === "") &&
      (!tps_code || typeof tps_code !== "string" || tps_code.trim() === "")
    ) {
      return res.status(400).json({ message: "Either tps_number or tps_code is required" });
    }

    if (registered_voters_total !== undefined) {
      const regTotal = Number(registered_voters_total);
      if (isNaN(regTotal) || regTotal < 0) {
        return res.status(400).json({ message: "registered_voters_total must be non-negative" });
      }
    }

    if (status && !VALID_TPS_STATUSES.includes(status.toUpperCase())) {
      return res.status(400).json({
        message: `TPS status must be one of: ${VALID_TPS_STATUSES.join(", ")}`,
      });
    }

    const newTps = TpsService.create({
      election_id: Number(election_id),
      tps_number: tps_number ? tps_number.trim() : undefined,
      tps_code: tps_code ? tps_code.trim() : undefined,
      province: province ? province.trim() : undefined,
      city_regency: city_regency ? city_regency.trim() : undefined,
      district: district ? district.trim() : undefined,
      village: village ? village.trim() : undefined,
      address: address ? address.trim() : undefined,
      status: status ? status.toUpperCase() : "DRAFT",
      registered_voters_total: registered_voters_total !== undefined ? Number(registered_voters_total) : 0,
    });

    return res.status(201).json({ data: newTps });
  } catch (error: any) {
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

    return res.json({ data: updated });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update TPS" });
  }
});

// PATCH /tps/:id/status
router.patch("/:id/status", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
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
