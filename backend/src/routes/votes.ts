import { Router, Request, Response } from "express";
import { VotesService, VoteError } from "../services/votes";

const router = Router();

/**
 * POST /votes/cast
 * Casts a vote locally using a temporary voting session ID and candidate pair ID.
 * This endpoint is public/unauthenticated as it's meant for physical voting booth devices
 * using active session validation.
 */
router.post("/cast", async (req: Request, res: Response) => {
  try {
    const { sessionId, candidatePairId } = req.body;

    if (
      sessionId === undefined ||
      candidatePairId === undefined ||
      isNaN(Number(sessionId)) ||
      isNaN(Number(candidatePairId))
    ) {
      return res.status(400).json({
        message: "sessionId and candidatePairId are required and must be valid numbers",
      });
    }

    const sId = Number(sessionId);
    const cpId = Number(candidatePairId);

    const result = VotesService.castVote(sId, cpId);

    return res.json({
      message: "Vote cast successfully",
      data: result,
    });
  } catch (error: any) {
    if (error instanceof VoteError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Error casting vote:", error);
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
});

export default router;