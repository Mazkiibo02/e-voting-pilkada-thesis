import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { PartiesService } from "../services/parties";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(__dirname, "../../uploads/parties");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const router = Router();

// GET /parties - Get all parties or availability per election
router.get("/", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const electionId = req.query.election_id ? Number(req.query.election_id) : undefined;
    const excludePaslonId = req.query.exclude_paslon_id ? Number(req.query.exclude_paslon_id) : undefined;

    if (electionId && !isNaN(electionId)) {
      const availability = PartiesService.getAvailability(electionId, excludePaslonId);
      return res.json({
        items: availability,
        total: availability.length
      });
    }

    const parties = PartiesService.getAll();
    return res.json({
      items: parties,
      total: parties.length
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve political parties" });
  }
});

// GET /parties/availability
router.get("/availability", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const electionId = Number(req.query.election_id);
    const excludePaslonId = req.query.exclude_paslon_id ? Number(req.query.exclude_paslon_id) : undefined;

    if (isNaN(electionId)) {
      return res.status(400).json({ message: "Valid election_id query parameter is required" });
    }

    const availability = PartiesService.getAvailability(electionId, excludePaslonId);
    return res.json({
      items: availability,
      total: availability.length
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve party availability" });
  }
});

// GET /parties/:id
router.get("/:id", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid party ID" });
    }

    const party = PartiesService.getById(id);
    if (!party) {
      return res.status(404).json({ message: "Political party not found" });
    }

    return res.json({ data: party });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve political party" });
  }
});

// POST /parties
router.post("/", authenticateToken, requireRole(["ADMIN"]), upload.single("logo"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, acronym } = req.body;
    const logo_url = req.file ? `/uploads/parties/${req.file.filename}` : req.body.logo_url;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ message: "Party name is required" });
    }

    if (!acronym || typeof acronym !== "string" || acronym.trim() === "") {
      return res.status(400).json({ message: "Party acronym is required" });
    }

    const newParty = PartiesService.create({
      name: name.trim(),
      acronym: acronym.trim(),
      logo_url: logo_url ? String(logo_url).trim() : undefined
    });

    return res.status(201).json({ data: newParty });
  } catch (error: any) {
    console.error("ERROR ASLI CREATE PARTY:", error);
    return res.status(500).json({ message: "Failed to create political party" });
  }
});

// PATCH /parties/:id
router.patch("/:id", authenticateToken, requireRole(["ADMIN"]), upload.single("logo"), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid party ID" });
    }

    const existing = PartiesService.getById(id);
    if (!existing) {
      return res.status(404).json({ message: "Political party not found" });
    }

    const { name, acronym } = req.body;
    const logo_url = req.file ? `/uploads/parties/${req.file.filename}` : req.body.logo_url;

    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return res.status(400).json({ message: "Party name cannot be empty" });
    }

    if (acronym !== undefined && (typeof acronym !== "string" || acronym.trim() === "")) {
      return res.status(400).json({ message: "Party acronym cannot be empty" });
    }

    const updated = PartiesService.update(id, {
      name: name !== undefined ? name.trim() : undefined,
      acronym: acronym !== undefined ? acronym.trim() : undefined,
      logo_url: logo_url !== undefined ? String(logo_url).trim() : undefined
    });

    return res.json({ data: updated });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update political party" });
  }
});

// DELETE /parties/:id
router.delete("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid party ID" });
    }

    const success = PartiesService.delete(id);
    if (!success) {
      return res.status(404).json({ message: "Political party not found" });
    }

    return res.json({ message: "Partai politik berhasil dihapus." });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete political party" });
  }
});

export default router;
