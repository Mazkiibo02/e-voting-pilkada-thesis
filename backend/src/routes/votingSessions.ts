import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { VotingSessionsService } from "../services/votingSessions";
import { VotersService } from "../services/voters";
import { TpsService } from "../services/tps";
import { ElectionsService } from "../services/elections";

const router = Router();

// Helper to sanitize and format session data for ADMIN/KPPS
function sanitizeSession(session: any) {
  if (!session) return null;
  return {
    id: session.id,
    electionId: session.election_id,
    tpsId: session.tps_id,
    voterId: session.voter_id,
    boothId: session.booth_id,
    status: session.status,
    expiresAt: session.expires_at,
    usedAt: session.used_at,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    voter: {
      id: session.voter_id,
      voterCode: session.voter_code,
      name: session.voter_name,
      gender: session.voter_gender,
      birthYear: session.voter_birth_year,
      verificationStatus: session.voter_verification_status,
    },
  };
}

// 1. POST /voting-sessions
router.post("/", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const { electionId, tpsId, voterId, boothId } = req.body;

    // Validate request body
    if (electionId === undefined || tpsId === undefined || voterId === undefined || !boothId || typeof boothId !== "string" || boothId.trim() === "") {
      return res.status(400).json({ message: "electionId, tpsId, voterId, and boothId are required fields" });
    }

    const eId = Number(electionId);
    const tId = Number(tpsId);
    const vId = Number(voterId);

    if (isNaN(eId) || isNaN(tId) || isNaN(vId)) {
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

    // Check TPS belongs to election
    if (tps.election_id !== eId) {
      return res.status(400).json({ message: "TPS does not belong to the selected election" });
    }

    // Check voter exists
    const voter = VotersService.getById(vId, true);
    if (!voter) {
      return res.status(404).json({ message: "Voter not found" });
    }

    // Check voter belongs to same election and TPS
    if (voter.election_id !== eId || voter.tps_id !== tId) {
      return res.status(400).json({ message: "Voter does not belong to the selected election and TPS" });
    }

    // Check KPPS assigned_tps_id must match tpsId
    if (req.user?.role === "KPPS" && req.user.assignedTpsId !== tId) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot manage voting sessions for this TPS" });
    }

    // Check voter has_voted must be false (0)
    if (voter.has_voted !== 0) {
      return res.status(400).json({ message: "Voter has already cast a vote" });
    }

    // Check voter verification_status must not be REJECTED
    if (voter.verification_status === "REJECTED") {
      return res.status(400).json({ message: "Voter verification status is REJECTED" });
    }

    // Check no other ACTIVE session exists for the same voter
    const activeVoterSession = VotingSessionsService.getActiveSessionForVoter(vId);
    if (activeVoterSession) {
      return res.status(409).json({ message: "Voter already has an active voting session" });
    }

    // Check no other ACTIVE session exists for the same booth
    const activeBoothSession = VotingSessionsService.getActiveSessionForBooth(tId, boothId.trim());
    if (activeBoothSession) {
      return res.status(409).json({ message: "This booth currently has an active voting session" });
    }

    // Expiry minutes config
    const expiresMinutesVal = process.env.VOTING_SESSION_EXPIRES_MINUTES;
    const expiresMinutes = expiresMinutesVal ? Number(expiresMinutesVal) : 5;
    const createdByUserId = req.user?.sub ? Number(req.user.sub) : 0;

    // Create session
    const session = VotingSessionsService.create({
      electionId: eId,
      tpsId: tId,
      voterId: vId,
      boothId: boothId.trim(),
      expiresMinutes,
      createdByUserId,
    });

    return res.status(201).json({
      data: {
        id: session.id,
        electionId: session.election_id,
        tpsId: session.tps_id,
        voterId: session.voter_id,
        boothId: session.booth_id,
        status: session.status,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create voting session" });
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

// 4. GET /voting-sessions/booth/:boothId/active (put this before /:id to avoid matching :id route)
router.get("/booth/:boothId/active", async (req, res) => {
  try {
    const { boothId } = req.params;
    const { tpsId } = req.query;

    if (!boothId || typeof boothId !== "string" || boothId.trim() === "") {
      return res.status(400).json({ message: "boothId is required" });
    }

    const activeSession = VotingSessionsService.getBoothActiveSession(
      boothId.trim(),
      tpsId !== undefined ? Number(tpsId) : undefined
    );

    if (!activeSession) {
      return res.json({
        data: null,
        message: "No active voting session",
      });
    }

    return res.json({
      data: activeSession,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to poll active voting session" });
  }
});

// 3. GET /voting-sessions/:id
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
