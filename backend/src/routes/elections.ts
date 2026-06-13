import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { ElectionsService } from "../services/elections";

const router = Router();

// Controlled status values for election
const VALID_ELECTION_STATUSES = ["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"];
const VALID_ELECTION_TYPES = ["GOVERNOR", "MAYOR", "REGENT"];

// GET /elections
router.get("/", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const elections = ElectionsService.getAll();
    return res.json({
      items: elections,
      total: elections.length,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve elections" });
  }
});

// GET /elections/:id
router.get("/:id", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid election ID" });
    }

    const election = ElectionsService.getById(id);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    return res.json({ data: election });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve election" });
  }
});

// POST /elections
router.post("/", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { name, election_type, region_name, voting_date, status } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ message: "Election name is required" });
    }

    if (!election_type || !VALID_ELECTION_TYPES.includes(election_type.toUpperCase())) {
      return res.status(400).json({
        message: `Election type must be one of: ${VALID_ELECTION_TYPES.join(", ")}`,
      });
    }

    if (!region_name || typeof region_name !== "string" || region_name.trim() === "") {
      return res.status(400).json({ message: "Region name is required" });
    }

    if (voting_date && isNaN(Date.parse(voting_date))) {
      return res.status(400).json({ message: "Voting date must be a valid date" });
    }

    if (status && !VALID_ELECTION_STATUSES.includes(status.toUpperCase())) {
      return res.status(400).json({
        message: `Election status must be one of: ${VALID_ELECTION_STATUSES.join(", ")}`,
      });
    }

    const newElection = ElectionsService.create({
      name: name.trim(),
      election_type: election_type.toUpperCase(),
      region_name: region_name.trim(),
      voting_date,
      status: status ? status.toUpperCase() : "DRAFT",
    });

    return res.status(201).json({ data: newElection });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create election" });
  }
});

// PATCH /elections/:id
router.patch("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid election ID" });
    }

    const election = ElectionsService.getById(id);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    const { name, election_type, region_name, voting_date, status } = req.body;

    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return res.status(400).json({ message: "Election name cannot be empty" });
    }

    if (election_type !== undefined && !VALID_ELECTION_TYPES.includes(election_type.toUpperCase())) {
      return res.status(400).json({
        message: `Election type must be one of: ${VALID_ELECTION_TYPES.join(", ")}`,
      });
    }

    if (region_name !== undefined && (typeof region_name !== "string" || region_name.trim() === "")) {
      return res.status(400).json({ message: "Region name cannot be empty" });
    }

    if (voting_date && isNaN(Date.parse(voting_date))) {
      return res.status(400).json({ message: "Voting date must be a valid date" });
    }

    if (status !== undefined && !VALID_ELECTION_STATUSES.includes(status.toUpperCase())) {
      return res.status(400).json({
        message: `Election status must be one of: ${VALID_ELECTION_STATUSES.join(", ")}`,
      });
    }

    const updated = ElectionsService.update(id, {
      name: name !== undefined ? name.trim() : undefined,
      election_type: election_type !== undefined ? election_type.toUpperCase() : undefined,
      region_name: region_name !== undefined ? region_name.trim() : undefined,
      voting_date,
      status: status !== undefined ? status.toUpperCase() : undefined,
    });

    return res.json({ data: updated });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update election" });
  }
});

// PATCH /elections/:id/status
router.patch("/:id/status", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid election ID" });
    }

    const election = ElectionsService.getById(id);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    const { status } = req.body;
    if (!status || !VALID_ELECTION_STATUSES.includes(status.toUpperCase())) {
      return res.status(400).json({
        message: `Status is required and must be one of: ${VALID_ELECTION_STATUSES.join(", ")}`,
      });
    }

    const updated = ElectionsService.update(id, { status: status.toUpperCase() });
    return res.json({ data: updated });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update election status" });
  }
});

// DELETE /elections/:id
router.delete("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid election ID" });
    }

    const success = ElectionsService.delete(id);
    if (!success) {
      return res.status(404).json({ message: "Election not found" });
    }

    return res.json({
      data: {
        id,
        message: "Election deleted successfully",
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete election" });
  }
});

export default router;
