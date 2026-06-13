import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { CandidatePairsService } from "../services/candidatePairs";
import { ElectionsService } from "../services/elections";

const router = Router();

// GET /candidate-pairs
router.get("/", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const candidatePairs = CandidatePairsService.getAll();
    return res.json({
      items: candidatePairs,
      total: candidatePairs.length,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve candidate pairs" });
  }
});

// GET /candidate-pairs/:id
router.get("/:id", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid candidate pair ID" });
    }

    const cp = CandidatePairsService.getById(id);
    if (!cp) {
      return res.status(404).json({ message: "Candidate pair not found" });
    }

    return res.json({ data: cp });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve candidate pair" });
  }
});

// GET /elections/:electionId/candidate-pairs
router.get("/elections/:electionId/candidate-pairs", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const electionId = Number(req.params.electionId);
    if (isNaN(electionId)) {
      return res.status(400).json({ message: "Invalid election ID" });
    }

    const election = ElectionsService.getById(electionId);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    const candidatePairs = CandidatePairsService.getAll(electionId);
    return res.json({
      items: candidatePairs,
      total: candidatePairs.length,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve candidate pairs for election" });
  }
});

// POST /candidate-pairs
router.post("/", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { election_id, ballot_number, candidate_name, vice_candidate_name, coalition_name, vision_summary } = req.body;

    if (!election_id || isNaN(Number(election_id))) {
      return res.status(400).json({ message: "Valid election_id is required" });
    }

    const election = ElectionsService.getById(Number(election_id));
    if (!election) {
      return res.status(400).json({ message: "Election does not exist" });
    }

    if (ballot_number === undefined || isNaN(Number(ballot_number))) {
      return res.status(400).json({ message: "Valid ballot_number is required" });
    }

    if (!candidate_name || typeof candidate_name !== "string" || candidate_name.trim() === "") {
      return res.status(400).json({ message: "candidate_name is required" });
    }

    if (!vice_candidate_name || typeof vice_candidate_name !== "string" || vice_candidate_name.trim() === "") {
      return res.status(400).json({ message: "vice_candidate_name is required" });
    }

    // Check unique ballot number per election
    const existing = CandidatePairsService.getByBallotNumber(Number(election_id), Number(ballot_number));
    if (existing) {
      return res.status(400).json({
        message: `Ballot number ${ballot_number} already exists for election ID ${election_id}`,
      });
    }

    const newCp = CandidatePairsService.create({
      election_id: Number(election_id),
      ballot_number: Number(ballot_number),
      candidate_name: candidate_name.trim(),
      vice_candidate_name: vice_candidate_name.trim(),
      coalition_name: coalition_name ? coalition_name.trim() : undefined,
      vision_summary: vision_summary ? vision_summary.trim() : undefined,
    });

    return res.status(201).json({ data: newCp });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create candidate pair" });
  }
});

// PATCH /candidate-pairs/:id
router.patch("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid candidate pair ID" });
    }

    const existing = CandidatePairsService.getById(id);
    if (!existing) {
      return res.status(404).json({ message: "Candidate pair not found" });
    }

    const { election_id, ballot_number, candidate_name, vice_candidate_name, coalition_name, vision_summary } = req.body;

    const finalElectionId = election_id !== undefined ? Number(election_id) : existing.election_id;
    if (election_id !== undefined) {
      if (isNaN(Number(election_id))) {
        return res.status(400).json({ message: "Valid election_id is required" });
      }
      const election = ElectionsService.getById(finalElectionId);
      if (!election) {
        return res.status(400).json({ message: "Election does not exist" });
      }
    }

    const finalBallotNumber = ballot_number !== undefined ? Number(ballot_number) : existing.ballot_number;
    if (ballot_number !== undefined) {
      if (isNaN(Number(ballot_number))) {
        return res.status(400).json({ message: "Valid ballot_number is required" });
      }
    }

    if (candidate_name !== undefined && (typeof candidate_name !== "string" || candidate_name.trim() === "")) {
      return res.status(400).json({ message: "candidate_name cannot be empty" });
    }

    if (vice_candidate_name !== undefined && (typeof vice_candidate_name !== "string" || vice_candidate_name.trim() === "")) {
      return res.status(400).json({ message: "vice_candidate_name cannot be empty" });
    }

    // Check unique ballot number if election_id or ballot_number changes
    if (election_id !== undefined || ballot_number !== undefined) {
      const match = CandidatePairsService.getByBallotNumber(finalElectionId, finalBallotNumber);
      if (match && match.id !== id) {
        return res.status(400).json({
          message: `Ballot number ${finalBallotNumber} already exists for election ID ${finalElectionId}`,
        });
      }
    }

    const updated = CandidatePairsService.update(id, {
      election_id: election_id !== undefined ? finalElectionId : undefined,
      ballot_number: ballot_number !== undefined ? finalBallotNumber : undefined,
      candidate_name: candidate_name !== undefined ? candidate_name.trim() : undefined,
      vice_candidate_name: vice_candidate_name !== undefined ? vice_candidate_name.trim() : undefined,
      coalition_name: coalition_name !== undefined ? coalition_name.trim() : undefined,
      vision_summary: vision_summary !== undefined ? vision_summary.trim() : undefined,
    });

    return res.json({ data: updated });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update candidate pair" });
  }
});

// DELETE /candidate-pairs/:id
router.delete("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid candidate pair ID" });
    }

    const success = CandidatePairsService.delete(id);
    if (!success) {
      return res.status(404).json({ message: "Candidate pair not found" });
    }

    return res.json({
      data: {
        id,
        message: "Candidate pair deleted successfully",
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete candidate pair" });
  }
});

export default router;
