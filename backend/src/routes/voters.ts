import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { VotersService, Voter } from "../services/voters";
import { TpsService } from "../services/tps";
import { ElectionsService } from "../services/elections";

const router = Router();

const VALID_GENDERS = ["M", "F"];
const VALID_VERIFICATION_STATUSES = ["UNVERIFIED", "VERIFIED", "REJECTED"];

// Helper to check if KPPS has access to a specific voter
const enforceVoterAccess = (req: AuthRequest, voter: Voter): boolean => {
  if (req.user?.role === "KPPS") {
    return voter.tps_id === req.user.assignedTpsId;
  }
  return true;
};

// GET /voters
router.get("/", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    let voters: Voter[] = [];
    const includeHash = req.user?.role === "ADMIN" && req.query.includeHash === "true";

    if (req.user?.role === "KPPS") {
      const tpsId = req.user.assignedTpsId;
      if (tpsId) {
        voters = VotersService.getAll(tpsId);
      }
    } else {
      // Admin can get all, and we resolve the base service function to return raw rows if requested
      if (includeHash) {
        const stmt = require("../database/connection").default.prepare("SELECT * FROM voters ORDER BY id DESC");
        voters = stmt.all() as Voter[];
      } else {
        voters = VotersService.getAll();
      }
    }

    return res.json({
      items: voters,
      total: voters.length,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve voters" });
  }
});

// GET /voters/:id
router.get("/:id", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid voter ID" });
    }

    const includeHash = req.user?.role === "ADMIN" && req.query.includeHash === "true";
    const voter = VotersService.getById(id, includeHash);
    if (!voter) {
      return res.status(404).json({ message: "Voter not found" });
    }

    if (!enforceVoterAccess(req, voter)) {
      return res.status(403).json({ message: "Access forbidden to this voter" });
    }

    return res.json({ data: voter });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve voter" });
  }
});

// GET /tps/:tpsId/voters
router.get("/tps/:tpsId/voters", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const tpsId = Number(req.params.tpsId);
    if (isNaN(tpsId)) {
      return res.status(400).json({ message: "Invalid TPS ID" });
    }

    if (req.user?.role === "KPPS" && req.user.assignedTpsId !== tpsId) {
      return res.status(403).json({ message: "Access forbidden to this TPS" });
    }

    const tps = TpsService.getById(tpsId);
    if (!tps) {
      return res.status(404).json({ message: "TPS not found" });
    }

    const includeHash = req.user?.role === "ADMIN" && req.query.includeHash === "true";
    let voters = VotersService.getAll(tpsId);
    if (includeHash) {
      const stmt = require("../database/connection").default.prepare("SELECT * FROM voters WHERE tps_id = ? ORDER BY id DESC");
      voters = stmt.all(tpsId) as Voter[];
    }

    return res.json({
      items: voters,
      total: voters.length,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve voters for TPS" });
  }
});

// POST /voters
router.post("/", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const {
      election_id,
      tps_id,
      voter_code,
      nik,
      nik_hash,
      name,
      gender,
      birth_year,
      verification_status,
    } = req.body;

    if (!election_id || isNaN(Number(election_id))) {
      return res.status(400).json({ message: "Valid election_id is required" });
    }

    const election = ElectionsService.getById(Number(election_id));
    if (!election) {
      return res.status(400).json({ message: "Election does not exist" });
    }

    if (!tps_id || isNaN(Number(tps_id))) {
      return res.status(400).json({ message: "Valid tps_id is required" });
    }

    const tps = TpsService.getById(Number(tps_id));
    if (!tps) {
      return res.status(400).json({ message: "TPS does not exist" });
    }

    // Verify TPS belongs to the same election
    if (tps.election_id !== Number(election_id)) {
      return res.status(400).json({ message: "TPS does not belong to the selected election" });
    }

    if (!voter_code || typeof voter_code !== "string" || voter_code.trim() === "") {
      return res.status(400).json({ message: "voter_code is required" });
    }

    // Check unique voter_code per election
    const existingCode = VotersService.getByVoterCode(Number(election_id), voter_code.trim());
    if (existingCode) {
      return res.status(400).json({
        message: `Voter code ${voter_code} already exists for election ID ${election_id}`,
      });
    }

    if (gender && !VALID_GENDERS.includes(gender.toUpperCase())) {
      return res.status(400).json({ message: `Gender must be one of: ${VALID_GENDERS.join(", ")}` });
    }

    if (birth_year !== undefined) {
      const year = Number(birth_year);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear) {
        return res.status(400).json({ message: "birth_year must be a valid year" });
      }
    }

    if (verification_status && !VALID_VERIFICATION_STATUSES.includes(verification_status.toUpperCase())) {
      return res.status(400).json({
        message: `Verification status must be one of: ${VALID_VERIFICATION_STATUSES.join(", ")}`,
      });
    }

    const newVoter = VotersService.create({
      election_id: Number(election_id),
      tps_id: Number(tps_id),
      voter_code: voter_code.trim(),
      nik,
      nik_hash,
      name: name ? name.trim() : undefined,
      gender: gender ? gender.toUpperCase() : undefined,
      birth_year: birth_year !== undefined ? Number(birth_year) : undefined,
      verification_status: verification_status ? verification_status.toUpperCase() : undefined,
    });

    return res.status(201).json({ data: newVoter });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create voter" });
  }
});

// PATCH /voters/:id
router.patch("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid voter ID" });
    }

    const existing = VotersService.getById(id, true);
    if (!existing) {
      return res.status(404).json({ message: "Voter not found" });
    }

    const {
      election_id,
      tps_id,
      voter_code,
      nik,
      nik_hash,
      name,
      gender,
      birth_year,
      verification_status,
      has_voted,
    } = req.body;

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

    if (tps_id === null) {
      return res.status(400).json({ message: "tps_id cannot be null" });
    }

    const finalTpsId = tps_id !== undefined ? Number(tps_id) : (existing.tps_id as number || 0);
    if (tps_id !== undefined) {
      if (isNaN(Number(tps_id))) {
        return res.status(400).json({ message: "Valid tps_id is required" });
      }
      const tps = TpsService.getById(finalTpsId);
      if (!tps) {
        return res.status(400).json({ message: "TPS does not exist" });
      }
      // Verify TPS belongs to the election
      if (tps.election_id !== finalElectionId) {
        return res.status(400).json({ message: "TPS does not belong to the selected election" });
      }
    }

    const finalVoterCode = voter_code !== undefined ? voter_code.trim() : existing.voter_code;
    if (voter_code !== undefined) {
      if (typeof voter_code !== "string" || voter_code.trim() === "") {
        return res.status(400).json({ message: "voter_code cannot be empty" });
      }
    }

    // Check unique voter_code if changed
    if (election_id !== undefined || voter_code !== undefined) {
      const match = VotersService.getByVoterCode(finalElectionId, finalVoterCode);
      if (match && match.id !== id) {
        return res.status(400).json({
          message: `Voter code ${finalVoterCode} already exists for election ID ${finalElectionId}`,
        });
      }
    }

    if (gender !== undefined && !VALID_GENDERS.includes(gender.toUpperCase())) {
      return res.status(400).json({ message: `Gender must be one of: ${VALID_GENDERS.join(", ")}` });
    }

    if (birth_year !== undefined) {
      const year = Number(birth_year);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear) {
        return res.status(400).json({ message: "birth_year must be a valid year" });
      }
    }

    if (verification_status !== undefined && !VALID_VERIFICATION_STATUSES.includes(verification_status.toUpperCase())) {
      return res.status(400).json({
        message: `Verification status must be one of: ${VALID_VERIFICATION_STATUSES.join(", ")}`,
      });
    }

    if (has_voted !== undefined) {
      const val = Number(has_voted);
      if (val !== 0 && val !== 1) {
        return res.status(400).json({ message: "has_voted must be 0 or 1" });
      }
    }

    const updated = VotersService.update(id, {
      election_id: election_id !== undefined ? finalElectionId : undefined,
      tps_id: tps_id !== undefined ? finalTpsId : undefined,
      voter_code: voter_code !== undefined ? finalVoterCode : undefined,
      nik,
      nik_hash,
      name: name !== undefined ? name.trim() : undefined,
      gender: gender !== undefined ? gender.toUpperCase() : undefined,
      birth_year: birth_year !== undefined ? Number(birth_year) : undefined,
      verification_status: verification_status !== undefined ? verification_status.toUpperCase() : undefined,
      has_voted: has_voted !== undefined ? Number(has_voted) : undefined,
    });

    return res.json({ data: updated });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update voter" });
  }
});

// DELETE /voters/:id
router.delete("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid voter ID" });
    }

    const success = VotersService.delete(id);
    if (!success) {
      return res.status(404).json({ message: "Voter not found" });
    }

    return res.json({
      data: {
        id,
        message: "Voter deleted successfully",
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete voter" });
  }
});

export default router;
