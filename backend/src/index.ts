import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import { contract } from "./services/blockchain";
import authRoutes from "./routes/auth";
import voteRoutes from "./routes/votes";
import electionsRoutes from "./routes/elections";
import tpsRoutes from "./routes/tps";
import candidatePairsRoutes from "./routes/candidatePairs";
import votingSessionsRoutes from "./routes/votingSessions";
import recapRoutes from "./routes/recaps";
import documentRoutes from "./routes/documents";
import auditLogsRoutes from "./routes/auditLogs";
import witnessRoutes from "./routes/witness";
import finalizationRoutes from "./routes/finalization";
import publicRoutes from "./routes/public";
import statsRoutes from "./routes/stats";
import kppsRoutes from "./routes/kpps";
import witnessesRoutes from "./routes/witnesses";
import db from "./database/connection";

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use("/auth", authRoutes);
app.use("/votes", voteRoutes);
app.use("/vote", voteRoutes);
app.use("/elections", electionsRoutes);
app.use("/tps", tpsRoutes);
app.use("/candidate-pairs", candidatePairsRoutes);
app.use("/voting-sessions", votingSessionsRoutes);
app.use("/recaps", recapRoutes);
app.use("/documents", documentRoutes);
app.use("/audit-logs", auditLogsRoutes);
app.use("/witness", witnessRoutes);
app.use("/finalization", finalizationRoutes);
app.use("/public", publicRoutes);
app.use("/stats", statsRoutes);
app.use("/kpps", kppsRoutes);
app.use("/witnesses", witnessesRoutes);

app.get("/", (req, res) => {
  res.json({ message: "E-Voting Backend Running" });
});

app.get("/candidates/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid candidate ID" });
    }

    const cp = db.prepare(`
      SELECT cp.id, cp.candidate_name, cp.vice_candidate_name, cp.photo_url,
             (SELECT COUNT(*) FROM votes v WHERE v.candidate_pair_id = cp.id) as voteCount
      FROM candidate_pairs cp
      WHERE cp.id = ?
    `).get(id) as any;

    if (!cp) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    res.json({
      id: cp.id,
      name: cp.vice_candidate_name 
        ? `${cp.candidate_name} & ${cp.vice_candidate_name}`
        : `${cp.candidate_name}`,
      voteCount: cp.voteCount,
      photoUrl: cp.photo_url
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch candidate" });
  }
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
// GET all candidates
app.get("/candidates", async (req, res) => {
  try {
    // Query all candidate pairs and calculate their dynamic vote counts from SQLite
    const candidatePairs = db.prepare(`
      SELECT cp.id, cp.candidate_name, cp.vice_candidate_name, cp.photo_url,
             (SELECT COUNT(*) FROM votes v WHERE v.candidate_pair_id = cp.id) as voteCount
      FROM candidate_pairs cp
      ORDER BY cp.ballot_number ASC
    `).all() as any[];

    const candidates = candidatePairs.map(cp => ({
      id: cp.id,
      name: cp.vice_candidate_name 
        ? `${cp.candidate_name} & ${cp.vice_candidate_name}`
        : `${cp.candidate_name}`,
      voteCount: cp.voteCount,
      photoUrl: cp.photo_url
    }));

    res.json(candidates);
  } catch (error) {
    console.error("ERROR FETCH CANDIDATES:", error);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});