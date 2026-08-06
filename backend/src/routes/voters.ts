import { Router, Request, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { VotersService } from "../services/voters";
import { TpsService } from "../services/tps";
import { ElectionsService } from "../services/elections";
import multer from "multer";
import * as xlsx from "xlsx";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/voters
router.get("/", authenticateToken, requireRole(["ADMIN", "KPPS", "KPPS_OPERATOR"]), async (req: AuthRequest, res: Response) => {
  try {
    const tpsIdParam = req.query.tps_id ? Number(req.query.tps_id) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;

    let targetTpsId = tpsIdParam;
    if (req.user?.role === "KPPS" && req.user.assignedTpsId) {
      targetTpsId = req.user.assignedTpsId;
    }

    const items = VotersService.getAll(targetTpsId, search, status);
    const stats = VotersService.getStats(targetTpsId);

    return res.json({ items, stats });
  } catch (error: any) {
    console.error("Error fetching voters:", error);
    return res.status(500).json({ message: "Gagal mengambil data pemilih DPT." });
  }
});

// GET /api/voters/template
router.get("/template", (req: Request, res: Response) => {
  try {
    const buffer = VotersService.generateTemplate();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Template_DPT_Pemilih.xlsx");
    return res.send(buffer);
  } catch (error: any) {
    console.error("Error generating template:", error);
    return res.status(500).json({ message: "Gagal membuat template Excel DPT." });
  }
});

// GET /api/voters/export
router.get("/export", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const tpsIdParam = req.query.tps_id ? Number(req.query.tps_id) : undefined;
    let targetTpsId = tpsIdParam;
    if (req.user?.role === "KPPS" && req.user.assignedTpsId) {
      targetTpsId = req.user.assignedTpsId;
    }

    const voters = VotersService.getAll(targetTpsId);
    const exportData = voters.map(v => ({
      "No DPT": v.dpt_number || "-",
      "Kode TPS": v.tps_code || "-",
      "Nama Pemilih": v.full_name,
      "Alamat KTP": v.address || "-",
      "Jenis Kelamin": v.gender === "F" ? "Perempuan" : "Laki-laki",
      "Disabilitas": v.is_disability ? "Ya" : "Tidak",
      "NIK (Masked)": v.nik_masked || "-",
      "Status": v.status === "VOTED" ? "Sudah Memilih" : "Belum Memilih",
      "Waktu Memilih": v.voted_at ? new Date(v.voted_at).toLocaleString("id-ID") : "-"
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "DPT_Pemilih");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Data_DPT_Pemilih_TPS.xlsx");
    return res.send(buffer);
  } catch (error: any) {
    console.error("Error exporting voters:", error);
    return res.status(500).json({ message: "Gagal meng-export data pemilih DPT." });
  }
});

// POST /api/voters
router.post("/", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const { tps_id, dpt_number, full_name, address, gender, is_disability, nik } = req.body;

    let targetTpsId = Number(tps_id);
    if (req.user?.role === "KPPS" && req.user.assignedTpsId) {
      targetTpsId = req.user.assignedTpsId;
    }

    if (!targetTpsId || isNaN(targetTpsId)) {
      return res.status(400).json({ message: "TPS ID wajib diisi." });
    }

    if (!full_name || String(full_name).trim() === "") {
      return res.status(400).json({ message: "Nama lengkap pemilih wajib diisi." });
    }

    const tps = TpsService.getById(targetTpsId);
    if (!tps) {
      return res.status(404).json({ message: "TPS tidak ditemukan." });
    }

    const newVoter = VotersService.create({
      election_id: tps.election_id,
      tps_id: targetTpsId,
      dpt_number,
      full_name,
      address,
      gender,
      is_disability: is_disability ? 1 : 0,
      nik
    });

    return res.status(201).json({ message: "Pemilih DPT berhasil ditambahkan.", data: newVoter });
  } catch (error: any) {
    console.error("Error creating voter:", error);
    return res.status(500).json({ message: "Gagal menambahkan pemilih DPT." });
  }
});

// POST /api/voters/import
router.post("/import", authenticateToken, requireRole(["ADMIN", "KPPS"]), upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File Excel wajib diunggah." });
    }

    let targetTpsId = req.body.tps_id ? Number(req.body.tps_id) : undefined;
    if (req.user?.role === "KPPS" && req.user.assignedTpsId) {
      targetTpsId = req.user.assignedTpsId;
    }

    if (!targetTpsId || isNaN(targetTpsId)) {
      return res.status(400).json({ message: "TPS ID wajib ditentukan." });
    }

    const tps = TpsService.getById(targetTpsId);
    if (!tps) {
      return res.status(404).json({ message: "TPS tidak ditemukan." });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: "File Excel kosong atau format tidak sesuai." });
    }

    const result = VotersService.importExcel(tps.election_id, targetTpsId, rows);

    return res.json({
      message: `Berhasil meng-import data DPT: ${result.importedCount} pemilih baru ditambahkan, ${result.updatedCount} pemilih diperbarui.`,
      result
    });
  } catch (error: any) {
    console.error("Error importing voters:", error);
    return res.status(500).json({ message: "Gagal meng-import data Excel DPT." });
  }
});

// POST /api/voters/:id/mark-voted
router.post("/:id/mark-voted", authenticateToken, requireRole(["ADMIN", "KPPS", "KPPS_OPERATOR"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID pemilih tidak valid." });
    }

    const voter = VotersService.getById(id);
    if (!voter) {
      return res.status(404).json({ message: "Pemilih tidak ditemukan." });
    }

    if (voter.status === "VOTED") {
      const votedTime = voter.voted_at ? new Date(voter.voted_at).toLocaleTimeString("id-ID") : "";
      return res.status(400).json({
        message: `Pemilih atas nama ${voter.full_name} (No. DPT: ${voter.dpt_number || "-"}) sudah menggunakan hak pilihnya pada pukul ${votedTime}.`
      });
    }

    const updated = VotersService.markAsVoted(id);
    return res.json({ message: `Pemilih ${updated.full_name} berhasil ditandai sudah memilih.`, data: updated });
  } catch (error: any) {
    console.error("Error marking voter as voted:", error);
    return res.status(500).json({ message: "Gagal memperbarui status pemilih." });
  }
});

// PUT /api/voters/:id
router.put("/:id", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID pemilih tidak valid." });
    }

    const updated = VotersService.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Pemilih tidak ditemukan." });
    }

    return res.json({ message: "Data pemilih berhasil diperbarui.", data: updated });
  } catch (error: any) {
    console.error("Error updating voter:", error);
    return res.status(500).json({ message: "Gagal memperbarui data pemilih." });
  }
});

// DELETE /api/voters/:id
router.delete("/:id", authenticateToken, requireRole(["ADMIN", "KPPS"]), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID pemilih tidak valid." });
    }

    const success = VotersService.delete(id);
    if (!success) {
      return res.status(404).json({ message: "Pemilih tidak ditemukan." });
    }

    return res.json({ message: "Data pemilih DPT berhasil dihapus." });
  } catch (error: any) {
    console.error("Error deleting voter:", error);
    return res.status(500).json({ message: "Gagal menghapus data pemilih." });
  }
});

export default router;
