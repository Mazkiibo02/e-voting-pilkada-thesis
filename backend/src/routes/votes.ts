import { Router } from "express";
import fs from "fs";
import path from "path";
import { verifyToken, AuthRequest } from "../middleware/auth";
import { contract } from "../services/blockchain";

const router = Router();

const votersPath = path.join(__dirname, "../data/voters.json");

router.post("/", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { candidateId } = req.body;
    const nik = req.user?.nik;

    if (!candidateId || isNaN(Number(candidateId))) {
      return res.status(400).json({ message: "Valid candidateId required" });
    }

    if (!nik) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("Incoming vote request:");
    console.log("NIK:", nik);
    console.log("Candidate ID:", candidateId);

    const voters = JSON.parse(fs.readFileSync(votersPath, "utf-8"));
    const voterIndex = voters.findIndex((v: any) => v.nik === nik);

    if (voterIndex === -1) {
      return res.status(404).json({ message: "Voter not found" });
    }

    if (voters[voterIndex].is_voted) {
      return res.status(400).json({ message: "Already voted" });
    }

    // 🔹 TPS Simulation
    const tpsId = 1;

    console.log("Sending transaction to blockchain...");
    console.log("TPS:", tpsId);

    const tx = await contract.castVote(tpsId, Number(candidateId));
    console.log("Transaction hash:", tx.hash);

    await tx.wait();
    console.log("Transaction confirmed.");

    // Update voter status (off-chain)
    voters[voterIndex].is_voted = true;
    fs.writeFileSync(votersPath, JSON.stringify(voters, null, 2));

    res.json({
      message: "Vote successful",
      transactionHash: tx.hash
    });

  } catch (error: any) {
    console.error("Vote error:", error.message);
    res.status(500).json({ message: "Vote failed" });
  }
});

export default router;