import express from "express";
import cors from "cors";
import { contract } from "./services/blockchain";

const app = express();
app.use(cors());
app.use(express.json());

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