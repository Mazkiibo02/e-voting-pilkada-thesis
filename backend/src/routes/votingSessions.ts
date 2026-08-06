import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { VotingSessionsService } from "../services/votingSessions";
import { TpsService } from "../services/tps";
import { ElectionsService } from "../services/elections";
import { AuditLogsService } from "../services/auditLogs";
import { VotersService } from "../services/voters";

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
router.post("/unlock", authenticateToken, requireRole(["ADMIN", "KPPS", "KPPS_OPERATOR"]), async (req: AuthRequest, res: Response) => {
  try {
    let { electionId, tpsId, boothId, voterGender, isDisability, voterId } = req.body;

    if (!boothId || typeof boothId !== "string" || boothId.trim() === "") {
      return res.status(400).json({ message: "boothId is required" });
    }

    let tId = tpsId !== undefined && tpsId !== null ? Number(tpsId) : NaN;
    if (isNaN(tId) && (req.user?.role === "KPPS" || req.user?.role === "KPPS_OPERATOR") && req.user.assignedTpsId) {
      tId = req.user.assignedTpsId;
    }

    if (isNaN(tId)) {
      const allTps = TpsService.getAll();
      if (allTps.length > 0) {
        tId = allTps[0].id;
      } else {
        return res.status(400).json({ message: "TPS tidak ditemukan dalam sistem." });
      }
    }

    let tps = TpsService.getById(tId);
    if (!tps) {
      return res.status(404).json({ message: "TPS not found" });
    }

    let eId = electionId !== undefined && electionId !== null ? Number(electionId) : NaN;
    if (isNaN(eId)) {
      eId = tps.election_id || (ElectionsService.getAll()[0]?.id ?? 1);
    }

    const actualTpsId = tps.id;

    // Check KPPS / KPPS_OPERATOR assigned_tps_id must match actualTpsId
    if ((req.user?.role === "KPPS" || req.user?.role === "KPPS_OPERATOR") && req.user.assignedTpsId && req.user.assignedTpsId !== actualTpsId) {
      return res.status(403).json({ message: "Access forbidden: KPPS Operator cannot manage voting sessions for this TPS" });
    }

    let finalGender = voterGender || 'L';
    let finalDisability = isDisability ? 1 : 0;
    let selectedVoter: any = null;

    // Process DPT Voter if provided
    if (voterId !== undefined && voterId !== null && voterId !== "") {
      const vId = Number(voterId);
      if (!isNaN(vId)) {
        selectedVoter = VotersService.getById(vId);
        if (!selectedVoter) {
          return res.status(404).json({ message: "Pemilih DPT tidak ditemukan." });
        }

        if (selectedVoter.tps_id !== actualTpsId) {
          return res.status(400).json({ message: `Pemilih DPT atas nama ${selectedVoter.full_name} terdaftar pada TPS lain (${selectedVoter.tps_code}).` });
        }

        if (selectedVoter.status === "VOTED") {
          const votedTime = selectedVoter.voted_at ? new Date(selectedVoter.voted_at).toLocaleTimeString("id-ID") : "";
          return res.status(400).json({
            message: `Pemilih atas nama ${selectedVoter.full_name} (No. DPT: ${selectedVoter.dpt_number || "-"}) sudah menggunakan hak pilihnya pada pukul ${votedTime}.`
          });
        }

        finalGender = selectedVoter.gender === "F" ? "P" : "L";
        finalDisability = selectedVoter.is_disability ? 1 : 0;
      }
    }

    const expiresMinutesVal = process.env.VOTING_SESSION_EXPIRES_MINUTES;
    const expiresMinutes = expiresMinutesVal ? Number(expiresMinutesVal) : 5;
    const createdByUserId = req.user?.sub ? Number(req.user.sub) : null;

    const session = VotingSessionsService.generateToken({
      electionId: eId,
      tpsId: actualTpsId,
      boothId: String(boothId),
      expiresMinutes,
      createdByUserId,
      voterGender: finalGender,
      isDisability: finalDisability
    });

    // Auto-mark voter as VOTED if selected
    if (selectedVoter) {
      VotersService.markAsVoted(selectedVoter.id);
    }

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
router.get("/", authenticateToken, requireRole(["ADMIN", "KPPS", "KPPS_OPERATOR"]), async (req: AuthRequest, res: Response) => {
  try {
    const filters: any = {};

    if (req.user?.role === "KPPS" || req.user?.role === "KPPS_OPERATOR") {
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

// 3c. POST /voting-sessions/booth/:boothId/cancel
router.post("/booth/:boothId/cancel", authenticateToken, requireRole(["ADMIN", "KPPS", "KPPS_OPERATOR"]), async (req: AuthRequest, res: Response) => {
  try {
    const { boothId } = req.params;
    if (!boothId || typeof boothId !== "string" || boothId.trim() === "") {
      return res.status(400).json({ message: "Booth ID is required" });
    }

    const activeSession = VotingSessionsService.getActiveSessionForBooth(boothId.trim());
    if (activeSession) {
      if ((req.user?.role === "KPPS" || req.user?.role === "KPPS_OPERATOR") && req.user.assignedTpsId && activeSession.tpsId !== req.user.assignedTpsId) {
        return res.status(403).json({ message: "Access forbidden" });
      }
      VotingSessionsService.updateStatus(activeSession.sessionId, "CANCELLED");
    }

    return res.json({ success: true, message: `Sesi bilik ${boothId} berhasil dibatalkan.` });
  } catch (e: any) {
    return res.status(500).json({ message: "Gagal mereset bilik suara." });
  }
});

// 4. GET /voting-sessions/:id
router.get("/:id", authenticateToken, requireRole(["ADMIN", "KPPS", "KPPS_OPERATOR"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    const session = VotingSessionsService.getById(id);
    if (!session) {
      return res.status(404).json({ message: "Voting session not found" });
    }

    if ((req.user?.role === "KPPS" || req.user?.role === "KPPS_OPERATOR") && session.tps_id !== req.user.assignedTpsId) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot view voting sessions for other TPS" });
    }

    return res.json({ data: sanitizeSession(session) });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve voting session" });
  }
});

// 5. POST /voting-sessions/:id/cancel
router.post("/:id/cancel", authenticateToken, requireRole(["ADMIN", "KPPS", "KPPS_OPERATOR"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    const session = VotingSessionsService.getById(id);
    if (!session) {
      return res.status(404).json({ message: "Voting session not found" });
    }

    if ((req.user?.role === "KPPS" || req.user?.role === "KPPS_OPERATOR") && session.tps_id !== req.user.assignedTpsId) {
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
router.post("/:id/expire", authenticateToken, requireRole(["ADMIN", "KPPS", "KPPS_OPERATOR"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }

    const session = VotingSessionsService.getById(id);
    if (!session) {
      return res.status(404).json({ message: "Voting session not found" });
    }

    if ((req.user?.role === "KPPS" || req.user?.role === "KPPS_OPERATOR") && session.tps_id !== req.user.assignedTpsId) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot manually expire voting sessions for other TPS" });
    }

    const updated = VotingSessionsService.updateStatus(id, "EXPIRED");
    return res.json({ data: sanitizeSession(updated) });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to manually expire voting session" });
  }
});

export default router;
