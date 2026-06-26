import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { VotingSessionsService } from "../services/votingSessions";
import { TpsService } from "../services/tps";
import { ElectionsService } from "../services/elections";
import { AuditLogsService } from "../services/auditLogs";

const router = Router();

// Helper to sanitize and format session data for ADMIN/KPPS
function sanitizeSession(session: any) {
  if (!session) return null;
  return {
    id: session.id,
    electionId: session.election_id,
    tpsId: session.tps_id,
    token: session.token,
    boothId: session.booth_id,
    status: session.status,
    expiresAt: session.expires_at,
    usedAt: session.used_at,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

// 1. POST /voting-sessions/unlock
router.post("/unlock", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const { electionId, tpsId, boothId } = req.body;

    if (electionId === undefined || tpsId === undefined || boothId === undefined) {
      return res.status(400).json({ message: "electionId, tpsId, and boothId are required" });
    }

    const eId = Number(electionId);
    const tId = Number(tpsId);

    if (isNaN(eId) || isNaN(tId)) {
      return res.status(400).json({ message: "Invalid ID parameter formats" });
    }

    // Check election exists
    const election = ElectionsService.getById(eId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    // Check TPS exists
    const tps = TpsService.getById(tId);
    if (!tps) {
      return res.status(404).json({ message: "TPS not found" });
    }

    // Check KPPS assigned_tps_id must match tpsId
    if (req.user?.role === "KPPS" && req.user.assignedTpsId !== tId) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot manage voting sessions for this TPS" });
    }

    const expiresMinutesVal = process.env.VOTING_SESSION_EXPIRES_MINUTES;
    const expiresMinutes = expiresMinutesVal ? Number(expiresMinutesVal) : 5;
    const createdByUserId = req.user?.sub ? Number(req.user.sub) : null;

    const session = VotingSessionsService.generateToken({
      electionId: eId,
      tpsId: tId,
      boothId: String(boothId),
      expiresMinutes,
      createdByUserId,
    });

    AuditLogsService.log({
      electionId: session.election_id,
      tpsId: session.tps_id,
      actorUserId: req.user?.sub ? Number(req.user.sub) : null,
      actorRole: req.user?.role || null,
      action: "VOTING_SESSION_TOKEN_GENERATED",
      entityType: "VOTING_SESSION",
      entityId: session.id,
      description: `Voting token generated`,
      metadataJson: { token: session.token }
    });

    return res.status(201).json({
      data: sanitizeSession(session),
    });
  } catch (error: any) {
    console.error("Error in POST /unlock:", error);
    return res.status(500).json({ message: "Failed to generate token", error: error.message });
  }
});

// 2. GET /voting-sessions
router.get("/", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const filters: any = {};

    if (req.user?.role === "KPPS") {
      filters.tpsId = req.user.assignedTpsId;
    } else if (req.query.tpsId !== undefined) {
      filters.tpsId = Number(req.query.tpsId);
    }

    if (req.query.electionId !== undefined) {
      filters.electionId = Number(req.query.electionId);
    }
    if (req.query.status !== undefined) {
      filters.status = String(req.query.status);
    }
    if (req.query.boothId !== undefined) {
      filters.boothId = String(req.query.boothId);
    }

    const sessions = VotingSessionsService.getAll(filters);
    return res.json({
      items: sessions.map(s => sanitizeSession(s)),
      total: sessions.length,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve voting sessions" });
  }
});

// 3. POST /voting-sessions/booth/login
router.post("/booth/login", async (req, res) => {
  try {
    const { token, boothId } = req.body;

    if (!token || typeof token !== "string" || token.trim() === "") {
      return res.status(400).json({ message: "Token is required" });
    }
    
    if (!boothId || typeof boothId !== "string" || boothId.trim() === "") {
      return res.status(400).json({ message: "Booth ID is required" });
    }

    const session = VotingSessionsService.getByToken(token.trim().toUpperCase());

    if (!session) {
      return res.status(401).json({ message: "Token tidak valid atau sudah kadaluarsa/digunakan" });
    }

    // Update session to record which booth it's used on
    VotingSessionsService.updateBoothId(session.sessionId, boothId.trim());
    session.boothId = boothId.trim();

    return res.json({
      data: session,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to login to booth" });
  }
});

// 3b. GET /voting-sessions/booth/:boothId/status
router.get("/booth/:boothId/status", async (req, res) => {
  try {
    const { boothId } = req.params;
    
    if (!boothId || typeof boothId !== "string" || boothId.trim() === "") {
      return res.status(400).json({ message: "Booth ID is required" });
    }

    const session = VotingSessionsService.getActiveSessionForBooth(boothId.trim());

    if (!session) {
      return res.json({ status: "LOCKED" });
    }

    return res.json({
      status: "UNLOCKED",
      data: session,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to check booth status" });
  }
});

// 4. GET /voting-sessions/:id
router.get("/:id", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    const session = VotingSessionsService.getById(id);
    if (!session) {
      return res.status(404).json({ message: "Voting session not found" });
    }

    if (req.user?.role === "KPPS" && session.tps_id !== req.user.assignedTpsId) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot view voting sessions for other TPS" });
    }

    return res.json({ data: sanitizeSession(session) });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve voting session" });
  }
});

// 5. POST /voting-sessions/:id/cancel
router.post("/:id/cancel", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    const session = VotingSessionsService.getById(id);
    if (!session) {
      return res.status(404).json({ message: "Voting session not found" });
    }

    if (req.user?.role === "KPPS" && session.tps_id !== req.user.assignedTpsId) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot cancel voting sessions for other TPS" });
    }

    const updated = VotingSessionsService.updateStatus(id, "CANCELLED");
    if (!updated) {
      return res.status(404).json({ message: "Voting session not found" });
    }

    AuditLogsService.log({
      electionId: updated.election_id,
      tpsId: updated.tps_id,
      actorUserId: req.user?.sub ? Number(req.user.sub) : null,
      actorRole: req.user?.role || null,
      action: "VOTING_SESSION_CANCELLED",
      entityType: "VOTING_SESSION",
      entityId: updated.id,
      description: `Voting session ID ${updated.id} cancelled`,
      metadataJson: { boothId: updated.booth_id }
    });

    return res.json({ data: sanitizeSession(updated) });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to cancel voting session" });
  }
});

// 6. POST /voting-sessions/:id/expire
router.post("/:id/expire", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    const session = VotingSessionsService.getById(id);
    if (!session) {
      return res.status(404).json({ message: "Voting session not found" });
    }

    if (req.user?.role === "KPPS" && session.tps_id !== req.user.assignedTpsId) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot manually expire voting sessions for other TPS" });
    }

    const updated = VotingSessionsService.updateStatus(id, "EXPIRED");
    return res.json({ data: sanitizeSession(updated) });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to manually expire voting session" });
  }
});

export default router;
