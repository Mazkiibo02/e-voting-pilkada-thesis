import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { RecapsService } from "../services/recaps";
import db from "../database/connection";

const router = Router();

// Helper to check if user has access to a specific TPS
const enforceTpsAccess = (req: AuthRequest, tpsId: number): boolean => {
  if (req.user?.role === "KPPS" || req.user?.role === "WITNESS") {
    return req.user.assignedTpsId === tpsId;
  }
  return true; // ADMIN can access anything
};

/**
 * 1. GET /recaps/tps/:tpsId
 * Purpose: Read existing recap for a TPS.
 * Allowed roles: ADMIN, KPPS, WITNESS (if assigned)
 */
router.get("/tps/:tpsId", authenticateToken, requireRole(["ADMIN", "KPPS", "WITNESS"]), async (req: AuthRequest, res: Response) => {
  try {
    const tpsId = Number(req.params.tpsId);
    if (isNaN(tpsId)) {
      return res.status(400).json({ message: "Invalid TPS ID" });
    }

    if (!enforceTpsAccess(req, tpsId)) {
      return res.status(403).json({ message: "Access forbidden to this TPS recap" });
    }

    // Verify TPS exists
    const tpsExists = db.prepare("SELECT id FROM tps WHERE id = ?").get(tpsId);
    if (!tpsExists) {
      return res.status(404).json({ message: "TPS not found" });
    }

    const result = RecapsService.getByTpsId(tpsId);
    if (!result) {
      return res.status(404).json({ message: "Recap not found for this TPS" });
    }

    const { recap, candidateTotals } = result;

    return res.json({
      data: {
        recapId: recap.id,
        electionId: recap.election_id,
        tpsId: recap.tps_id,
        validationStatus: recap.validation_status,
        totalRegisteredVoters: recap.total_registered_voters,
        totalVerifiedVoters: recap.total_verified_voters,
        totalValidVotes: recap.total_valid_votes,
        totalInvalidVotes: recap.total_invalid_votes,
        candidateTotals: candidateTotals.map(ct => ({
          candidatePairId: ct.candidatePairId,
          ballotNumber: ct.ballotNumber,
          candidateName: ct.candidateName,
          viceCandidateName: ct.viceCandidateName,
          voteTotal: ct.voteTotal,
          voteTotalInWords: ct.voteTotalInWords,
        })),
        issues: []
      }
    });
  } catch (error: any) {
    console.error("Error reading recap:", error);
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
});

/**
 * 2. POST /recaps/tps/:tpsId/generate
 * Purpose: Generate or regenerate TPS recap from votes stored in SQLite.
 * Allowed roles: ADMIN, KPPS
 */
router.post("/tps/:tpsId/generate", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const tpsId = Number(req.params.tpsId);
    if (isNaN(tpsId)) {
      return res.status(400).json({ message: "Invalid TPS ID" });
    }

    if (!enforceTpsAccess(req, tpsId)) {
      return res.status(403).json({ message: "Access forbidden: KPPS cannot manage voting sessions for this TPS" });
    }

    const tps = db.prepare("SELECT status, election_id FROM tps WHERE id = ?").get(tpsId) as { status: string; election_id: number } | undefined;
    if (!tps) {
      return res.status(404).json({ message: "TPS not found" });
    }

    if (tps.status === "OPEN" || tps.status === "DRAFT") {
      return res.status(409).json({ message: `TPS status is ${tps.status}. TPS must be CLOSED before generating recap.` });
    }

    const userId = Number(req.user?.sub);
    if (isNaN(userId)) {
      return res.status(401).json({ message: "User identity invalid" });
    }

    // Run verification rules first
    const validation = RecapsService.validateRecapData(tpsId, tps.election_id);
    if (!validation.isValid) {
      return res.status(409).json({
        message: "Recap cannot be generated due to invalid source data",
        errors: validation.issues
      });
    }

    // If valid, generate recap atomically
    const result = RecapsService.generateRecap(tpsId, userId);

    return res.status(200).json({
      message: "TPS recap generated successfully",
      data: {
        recapId: result.recap.id,
        electionId: result.recap.election_id,
        tpsId: result.recap.tps_id,
        validationStatus: result.recap.validation_status,
        totalRegisteredVoters: result.recap.total_registered_voters,
        totalVerifiedVoters: result.recap.total_verified_voters,
        totalValidVotes: result.recap.total_valid_votes,
        totalInvalidVotes: result.recap.total_invalid_votes,
        candidateTotals: result.candidateTotals,
        issues: result.issues
      }
    });
  } catch (error: any) {
    console.error("Error generating recap:", error);
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
});

/**
 * 3. POST /recaps/tps/:tpsId/validate
 * Purpose: Run validation against current recap and source vote data.
 * Allowed roles: ADMIN, KPPS
 */
router.post("/tps/:tpsId/validate", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const tpsId = Number(req.params.tpsId);
    if (isNaN(tpsId)) {
      return res.status(400).json({ message: "Invalid TPS ID" });
    }

    if (!enforceTpsAccess(req, tpsId)) {
      return res.status(403).json({ message: "Access forbidden to this TPS" });
    }

    const tps = db.prepare("SELECT election_id FROM tps WHERE id = ?").get(tpsId) as { election_id: number } | undefined;
    if (!tps) {
      return res.status(404).json({ message: "TPS not found" });
    }

    const validation = RecapsService.validateRecapData(tpsId, tps.election_id);

    return res.json({
      data: {
        isValid: validation.isValid,
        issues: validation.issues.map(iss => ({
          code: iss.code,
          message: iss.message
        })),
        summary: {
          totalRegisteredVoters: validation.summary.totalRegisteredVoters,
          totalVerifiedVoters: validation.summary.totalVerifiedVoters,
          totalValidVotes: validation.summary.totalValidVotes,
          totalInvalidVotes: validation.summary.totalInvalidVotes,
        }
      }
    });
  } catch (error: any) {
    console.error("Error validating recap:", error);
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
});

/**
 * 4. GET /recaps/elections/:electionId
 * Purpose: List recap summaries per TPS for an election.
 * Allowed roles: ADMIN
 */
router.get("/elections/:electionId", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const electionId = Number(req.params.electionId);
    if (isNaN(electionId)) {
      return res.status(400).json({ message: "Invalid election ID" });
    }

    // Verify election exists
    const electionExists = db.prepare("SELECT id FROM elections WHERE id = ?").get(electionId);
    if (!electionExists) {
      return res.status(404).json({ message: "Election not found" });
    }

    const recaps = RecapsService.getByElectionId(electionId);

    return res.json({
      items: recaps,
      total: recaps.length
    });
  } catch (error: any) {
    console.error("Error listing recaps:", error);
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
});

export default router;
