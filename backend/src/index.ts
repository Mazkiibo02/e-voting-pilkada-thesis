import express from "express";
import cors from "cors";
import { contract } from "./services/blockchain";
import authRoutes from "./routes/auth";
import voteRoutes from "./routes/votes";
import fs from "fs";
import path from "path";
import { runKMeansTPS } from "./services/kmeansTPS";
import anomalyRoutes from "./routes/anomaly";

// sementara
import { generateTPSData } from "./services/generateTPS";

generateTPSData(1000);

const app = express();
app.use(cors());
app.use(express.json());

const votersPath = path.join(__dirname, "./data/voters.json");

let voters = JSON.parse(fs.readFileSync(votersPath, "utf-8"));

voters = runKMeansTPS(voters);

fs.writeFileSync(votersPath, JSON.stringify(voters, null, 2));

app.use("/auth", authRoutes);
app.use("/vote", voteRoutes);

app.get("/", (req, res) => {
  res.json({ message: "E-Voting Backend Running" });
});

app.get("/candidates/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const candidate = await contract.getCandidate(id);

    res.json({
      id: Number(candidate[0]),
      name: candidate[1],
      voteCount: Number(candidate[2]),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch candidate" });
  }
});

const PORT = 5000;

app.use("/anomaly", anomalyRoutes);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// GET all candidates
app.get("/candidates", async (req, res) => {
  try {
    const count = await contract.candidatesCount();
    const candidates = [];

    for (let i = 1; i <= Number(count); i++) {
      const candidate = await contract.getCandidate(i);
      candidates.push({
        id: Number(candidate[0]),
        name: candidate[1],
        voteCount: Number(candidate[2]),
      });
    }

    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});