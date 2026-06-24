import { Router, Request, Response } from "express";
import { PublicService } from "../services/public";

const router = Router();

/**
 * GET /public/results
 * Purpose: Safe, open endpoint to retrieve aggregated election results and TPS workflow state metadata.
 * Access: Open (No auth middleware)
 */
router.get("/results", async (req: Request, res: Response) => {
  try {
    const results = PublicService.getAggregatedResults();
    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (error: any) {
    console.error("Error fetching public results:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred while fetching public results."
    });
  }
});

export default router;
