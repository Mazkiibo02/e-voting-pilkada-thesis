import { Router } from "express";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

const router = Router();
const SECRET = "supersecret";

const votersPath = path.join(__dirname, "../data/voters.json");

router.post("/login", (req, res) => {
  const { nik } = req.body;

  const voters = JSON.parse(fs.readFileSync(votersPath, "utf-8"));

  const voter = voters.find((v: any) => v.nik === nik);

  if (!voter) {
    return res.status(401).json({ message: "NIK not found" });
  }

  const token = jwt.sign({ nik: voter.nik }, SECRET, {
    expiresIn: "1h",
  });

  res.json({ token });
});

export default router;