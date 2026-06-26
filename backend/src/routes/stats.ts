import { Router, Request, Response } from "express";
import { PublicService } from "../services/publicStats";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const tpsCodeFilter = req.query.tps ? String(req.query.tps) : undefined;
    const stats = PublicService.getStats(tpsCodeFilter);
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred while fetching stats."
    });
  }
});

export default router;
