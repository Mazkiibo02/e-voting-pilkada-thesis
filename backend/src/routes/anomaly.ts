import { Router } from "express";
import fs from "fs";
import path from "path";
import { runKMeansTPS } from "../services/kmeansTPS";

const router = Router();

const tpsPath = path.join(__dirname, "../data/tps.json");

router.get("/", (req, res) => {
  try {
    const raw = fs.readFileSync(tpsPath, "utf-8");
    const tpsData = JSON.parse(raw);

    const clustered = runKMeansTPS(tpsData, 2);

    const anomalies = clustered.filter((t: any) => t.anomaly);

    res.json({
      totalTPS: clustered.length,
      totalAnomaly: anomalies.length,
      anomalyPercentage:
        ((anomalies.length / clustered.length) * 100).toFixed(2) + "%",
      anomalies: anomalies.slice(0, 20) // batasi 20 untuk demo
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to analyze TPS data" });
  }
});

export default router;