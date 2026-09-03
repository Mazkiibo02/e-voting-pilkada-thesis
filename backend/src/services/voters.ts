import db from "../database/connection";
import * as xlsx from "xlsx";

export interface Voter {
  id: number;
  election_id: number;
  tps_id: number;
  tps_code?: string;
  tps_address?: string;
  dpt_number: string | null;
  full_name: string;
  address: string | null;
  gender: string; // 'M' / 'F'
  is_disability: number; // 0 / 1
  nik_masked: string | null;
  status: string; // 'REGISTERED' | 'VOTED'
  voted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function maskNik(nik: any): string {
  if (!nik) return "";
  const cleaned = String(nik).trim();
  if (cleaned.length < 10) return cleaned;
  const prefix = cleaned.substring(0, 6);
  const suffix = cleaned.substring(cleaned.length - 4);
  const maskedMiddle = "*".repeat(cleaned.length - 10);
  return `${prefix}${maskedMiddle}${suffix}`;
}

export const VotersService = {
  updateTpsVoterCount(tpsId: number): void {
    try {
      const maleStmt = db.prepare("SELECT COUNT(*) as c FROM voters WHERE tps_id = ? AND gender = 'M'");
      const femaleStmt = db.prepare("SELECT COUNT(*) as c FROM voters WHERE tps_id = ? AND gender = 'F'");
      const totalStmt = db.prepare("SELECT COUNT(*) as c FROM voters WHERE tps_id = ?");

      const maleDpt = (maleStmt.get(tpsId) as any)?.c || 0;
      const femaleDpt = (femaleStmt.get(tpsId) as any)?.c || 0;
      const total = (totalStmt.get(tpsId) as any)?.c || (maleDpt + femaleDpt);

      db.prepare(`
        UPDATE tps 
        SET registered_voters_total = ?, male_dpt = ?, female_dpt = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(total, maleDpt, femaleDpt, tpsId);
    } catch (e) {
      console.error(`Failed to update TPS voter count for tps_id ${tpsId}:`, e);
    }
  },

  syncPlaceholderVoters(tpsId: number): void {
    try {
      const tpsStmt = db.prepare("SELECT * FROM tps WHERE id = ?");
      const tps = tpsStmt.get(tpsId) as any;
      if (!tps) return;

      let totalTarget = Number(tps.registered_voters_total || tps.dpt_count || ((tps.male_dpt || 0) + (tps.female_dpt || 0)) || 0);
      if (totalTarget <= 0) {
        totalTarget = 100;
      }

      const countStmt = db.prepare("SELECT COUNT(*) as count FROM voters WHERE tps_id = ?");
      const currentCount = (countStmt.get(tpsId) as any)?.count || 0;

      // If voters already exist for this TPS, no need to auto-generate placeholders
      if (currentCount > 0) return;

      const maleTarget = tps.male_dpt && Number(tps.male_dpt) > 0 ? Number(tps.male_dpt) : (tps.male_count && Number(tps.male_count) > 0 ? Number(tps.male_count) : Math.ceil(totalTarget * 0.5));
      const electionId = tps.election_id || 1;
      const disabilityCount = tps.disability_count ? Number(tps.disability_count) : 0;

      const insertStmt = db.prepare(`
        INSERT INTO voters (election_id, tps_id, dpt_number, full_name, address, gender, is_disability, nik_masked, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'REGISTERED')
      `);

      db.exec("BEGIN TRANSACTION");
      try {
        for (let i = 1; i <= totalTarget; i++) {
          const dptNum = String(i).padStart(3, "0");
          const isMale = i <= maleTarget;
          const gender = isMale ? "M" : "F";
          const genderLabel = isMale ? "L" : "P";
          const fullName = `Pemilih DPT ${dptNum} (${genderLabel})`;
          const address = tps.address ? `${tps.address}` : `${tps.village || tps.district || 'Kelurahan'}`;
          const nikSimulated = `3328${String(tpsId).padStart(2, "0")}${String(i).padStart(6, "0")}0001`;
          const nikMasked = maskNik(nikSimulated);
          const isDisability = (disabilityCount > 0 && i <= disabilityCount) ? 1 : 0;

          insertStmt.run(electionId, tpsId, dptNum, fullName, address, gender, isDisability, nikMasked);
        }
        db.exec("COMMIT");
        this.updateTpsVoterCount(tpsId);
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    } catch (e) {
      console.error(`Failed to sync placeholder voters for TPS ${tpsId}:`, e);
    }
  },

  getAll(tpsId?: number, search?: string, status?: string): Voter[] {
    if (tpsId) {
      this.syncPlaceholderVoters(tpsId);
    }

    let query = `
      SELECT v.*, t.tps_code, t.address as tps_address 
      FROM voters v
      JOIN tps t ON v.tps_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tpsId) {
      query += " AND v.tps_id = ?";
      params.push(tpsId);
    }

    if (status && status !== "ALL") {
      query += " AND v.status = ?";
      params.push(status);
    }

    if (search && search.trim() !== "") {
      const term = `%${search.trim().toLowerCase()}%`;
      query += " AND (LOWER(v.full_name) LIKE ? OR LOWER(v.address) LIKE ? OR v.dpt_number LIKE ?)";
      params.push(term, term, term);
    }

    query += " ORDER BY CASE WHEN v.dpt_number IS NULL THEN 999999 ELSE CAST(v.dpt_number AS INTEGER) END ASC, v.id ASC";

    const stmt = db.prepare(query);
    return stmt.all(...params) as unknown as Voter[];
  },

  getById(id: number): Voter | null {
    const stmt = db.prepare(`
      SELECT v.*, t.tps_code, t.address as tps_address 
      FROM voters v
      JOIN tps t ON v.tps_id = t.id
      WHERE v.id = ?
    `);
    const voter = stmt.get(id);
    return voter ? (voter as unknown as Voter) : null;
  },

  create(data: {
    election_id: number;
    tps_id: number;
    dpt_number?: string | null;
    full_name: string;
    address?: string | null;
    gender?: string;
    is_disability?: number;
    nik?: string | null;
    status?: string;
  }): Voter {
    const dptNumber = data.dpt_number ? String(data.dpt_number).trim() : null;
    const fullName = data.full_name.trim();
    const address = data.address ? data.address.trim() : null;
    const gender = data.gender === "F" || data.gender === "P" || data.gender === "PEREMPUAN" ? "F" : "M";
    const isDisability = data.is_disability ? 1 : 0;
    const nikMasked = data.nik ? maskNik(data.nik) : null;
    const status = data.status || "REGISTERED";

    const stmt = db.prepare(`
      INSERT INTO voters (
        election_id, tps_id, dpt_number, full_name, address, gender, is_disability, nik_masked, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.election_id,
      data.tps_id,
      dptNumber,
      fullName,
      address,
      gender,
      isDisability,
      nikMasked,
      status
    );

    this.updateTpsVoterCount(data.tps_id);
    return this.getById(Number(result.lastInsertRowid))!;
  },

  update(id: number, data: {
    dpt_number?: string | null;
    full_name?: string;
    address?: string | null;
    gender?: string;
    is_disability?: number;
    nik?: string | null;
    status?: string;
  }): Voter | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const dptNumber = data.dpt_number !== undefined ? (data.dpt_number ? String(data.dpt_number).trim() : null) : existing.dpt_number;
    const fullName = data.full_name !== undefined ? data.full_name.trim() : existing.full_name;
    const address = data.address !== undefined ? (data.address ? data.address.trim() : null) : existing.address;
    const gender = data.gender !== undefined ? (data.gender === "F" || data.gender === "P" || data.gender === "PEREMPUAN" ? "F" : "M") : existing.gender;
    const isDisability = data.is_disability !== undefined ? (data.is_disability ? 1 : 0) : existing.is_disability;
    const nikMasked = data.nik !== undefined ? (data.nik ? maskNik(data.nik) : existing.nik_masked) : existing.nik_masked;
    const status = data.status !== undefined ? data.status : existing.status;
    const votedAt = status === "VOTED" && !existing.voted_at ? new Date().toISOString() : existing.voted_at;

    const stmt = db.prepare(`
      UPDATE voters
      SET dpt_number = ?, full_name = ?, address = ?, gender = ?, is_disability = ?, nik_masked = ?, status = ?, voted_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(dptNumber, fullName, address, gender, isDisability, nikMasked, status, votedAt, id);

    return this.getById(id);
  },

  markAsVoted(id: number): Voter {
    const existing = this.getById(id);
    if (!existing) throw new Error("Pemilih tidak ditemukan.");

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE voters
      SET status = 'VOTED', voted_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(now, id);

    return this.getById(id)!;
  },

  delete(id: number): boolean {
    const existing = this.getById(id);
    if (!existing) return false;

    const stmt = db.prepare("DELETE FROM voters WHERE id = ?");
    stmt.run(id);
    this.updateTpsVoterCount(existing.tps_id);
    return true;
  },

  getStats(tpsId?: number) {
    if (tpsId) {
      this.syncPlaceholderVoters(tpsId);
    }

    let query = "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'VOTED' THEN 1 ELSE 0 END) as voted FROM voters WHERE 1=1";
    const params: any[] = [];

    if (tpsId) {
      query += " AND tps_id = ?";
      params.push(tpsId);
    }

    const row = db.prepare(query).get(...params) as any;
    let total = row?.total || 0;

    if (tpsId) {
      const tpsRow = db.prepare("SELECT COALESCE(registered_voters_total, male_dpt + female_dpt, 0) as total FROM tps WHERE id = ?").get(tpsId) as any;
      if (tpsRow && tpsRow.total > total) {
        total = tpsRow.total;
      }
    } else {
      const allTpsRow = db.prepare("SELECT SUM(COALESCE(registered_voters_total, male_dpt + female_dpt, 0)) as total FROM tps").get() as any;
      if (allTpsRow && allTpsRow.total > total) {
        total = allTpsRow.total;
      }
    }

    const voted = row?.voted || 0;
    const registered = Math.max(0, total - voted);
    const percentage = total > 0 ? Math.round((voted / total) * 1000) / 10 : 0;

    return { total, voted, registered, percentage };
  },

  importExcel(electionId: number, tpsId: number, rows: any[]): { importedCount: number; updatedCount: number } {
    let importedCount = 0;
    let updatedCount = 0;

    const existingVoters = this.getAll(tpsId);
    const existingMap = new Map<string, Voter>();
    existingVoters.forEach(v => {
      if (v.dpt_number) existingMap.set(`NO:${v.dpt_number.toLowerCase()}`, v);
      existingMap.set(`NAME:${v.full_name.toLowerCase()}`, v);
    });

    let autoDptNum = existingVoters.length + 1;

    for (const row of rows) {
      const fullName = row["Nama Lengkap"] || row["Nama"] || row["full_name"] || row["Nama Pemilih"] || "";
      if (!fullName || String(fullName).trim() === "") continue;

      let dptNum = row["No DPT"] || row["No. DPT"] || row["No_DPT"] || row["dpt_number"] || row["Nomor Urut"] || "";
      if (dptNum) {
        const strNum = String(dptNum).trim();
        dptNum = /^\d+$/.test(strNum) ? strNum.padStart(3, "0") : strNum;
      } else {
        dptNum = autoDptNum.toString().padStart(3, "0");
        autoDptNum++;
      }

      const address = row["Alamat"] || row["Alamat KTP"] || row["address"] || row["Alamat Spesifik"] || "";
      const rawGender = String(row["Jenis Kelamin"] || row["Gender"] || row["L/P"] || "M").toUpperCase();
      const gender = (rawGender.includes("P") || rawGender.includes("FEMALE") || rawGender.includes("PEREMPUAN")) ? "F" : "M";

      const rawDisability = String(row["Disabilitas"] || row["is_disability"] || "Tidak").toLowerCase();
      const isDisability = (rawDisability.includes("ya") || rawDisability === "1" || rawDisability === "true") ? 1 : 0;

      const rawNik = row["NIK"] || row["nik"] || row["NIK (Opsional)"] || "";

      const existingRecord = (dptNum && existingMap.get(`NO:${String(dptNum).toLowerCase()}`)) || existingMap.get(`NAME:${String(fullName).toLowerCase()}`);

      if (existingRecord) {
        this.update(existingRecord.id, {
          dpt_number: String(dptNum),
          full_name: String(fullName),
          address: address ? String(address) : existingRecord.address,
          gender,
          is_disability: isDisability,
          nik: rawNik ? String(rawNik) : undefined
        });
        updatedCount++;
      } else {
        this.create({
          election_id: electionId,
          tps_id: tpsId,
          dpt_number: String(dptNum),
          full_name: String(fullName),
          address: address ? String(address) : null,
          gender,
          is_disability: isDisability,
          nik: rawNik ? String(rawNik) : null,
          status: "REGISTERED"
        });
        importedCount++;
      }
    }

    this.updateTpsVoterCount(tpsId);
    return { importedCount, updatedCount };
  },

  generateTemplate(): Buffer {
    const sampleData = [
      {
        "No DPT": "001",
        "Nama Lengkap": "Budi Santoso",
        "Alamat KTP": "Jl. Melati No. 5, RT 01/RW 02",
        "Jenis Kelamin": "L",
        "Disabilitas": "Tidak",
        "NIK (Opsional)": "3328011508950003"
      },
      {
        "No DPT": "002",
        "Nama Lengkap": "Siti Rahmawati",
        "Alamat KTP": "Jl. Mawar No. 12, RT 02/RW 02",
        "Jenis Kelamin": "P",
        "Disabilitas": "Tidak",
        "NIK (Opsional)": "3328014402970008"
      },
      {
        "No DPT": "003",
        "Nama Lengkap": "Ahmad Fauzi",
        "Alamat KTP": "Jl. Dahlia No. 8, RT 03/RW 02",
        "Jenis Kelamin": "L",
        "Disabilitas": "Ya",
        "NIK (Opsional)": "3328011003920015"
      }
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "DPT_Pemilih");

    return xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
  }
};
