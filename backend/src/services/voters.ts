import { createHash } from "crypto";
import db from "../database/connection";

export interface Voter {
  id: number;
  election_id: number;
  tps_id: number | null;
  voter_code: string;
  nik_hash?: string; // Optional so we can exclude it
  name: string | null;
  gender: string | null;
  birth_year: number | null;
  verification_status: string;
  has_voted: number;
  created_at: string;
  updated_at: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const VotersService = {
  sanitize(voter: any): Voter {
    if (!voter) return voter;
    const { nik_hash, ...sanitized } = voter;
    return sanitized as Voter;
  },

  getAll(tpsId?: number, electionId?: number): Voter[] {
    let query = "SELECT * FROM voters WHERE 1=1";
    const params: any[] = [];

    if (tpsId) {
      query += " AND tps_id = ?";
      params.push(tpsId);
    }
    if (electionId) {
      query += " AND election_id = ?";
      params.push(electionId);
    }

    query += " ORDER BY id DESC";

    const stmt = db.prepare(query);
    const results = stmt.all(...params) as any[];
    return results.map((r) => this.sanitize(r));
  },

  getById(id: number, includeHash = false): Voter | null {
    const stmt = db.prepare("SELECT * FROM voters WHERE id = ?");
    const voter = stmt.get(id) as any;
    if (!voter) return null;
    return includeHash ? voter : this.sanitize(voter);
  },

  getByVoterCode(electionId: number, voterCode: string, includeHash = false): Voter | null {
    const stmt = db.prepare("SELECT * FROM voters WHERE election_id = ? AND voter_code = ?");
    const voter = stmt.get(electionId, voterCode) as any;
    if (!voter) return null;
    return includeHash ? voter : this.sanitize(voter);
  },

  create(data: {
    election_id: number;
    tps_id: number;
    voter_code: string;
    nik?: string;
    nik_hash?: string;
    name?: string;
    gender?: string;
    birth_year?: number;
    verification_status?: string;
  }): Voter {
    const stmt = db.prepare(`
      INSERT INTO voters (
        election_id, tps_id, voter_code, nik_hash, name, 
        gender, birth_year, verification_status, has_voted
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    let finalNikHash: string | null = null;
    if (data.nik) {
      finalNikHash = sha256(data.nik);
    } else if (data.nik_hash) {
      finalNikHash = data.nik_hash;
    }

    const verificationStatus = data.verification_status || "UNVERIFIED";
    const result = stmt.run(
      data.election_id,
      data.tps_id,
      data.voter_code,
      finalNikHash,
      data.name || null,
      data.gender || null,
      data.birth_year !== undefined ? data.birth_year : null,
      verificationStatus
    );

    return this.getById(Number(result.lastInsertRowid))!;
  },

  update(
    id: number,
    data: {
      election_id?: number;
      tps_id?: number;
      voter_code?: string;
      nik?: string;
      nik_hash?: string;
      name?: string;
      gender?: string;
      birth_year?: number;
      verification_status?: string;
      has_voted?: number;
    }
  ): Voter | null {
    const existing = this.getById(id, true); // Get existing including hash to resolve values
    if (!existing) return null;

    const electionId = data.election_id !== undefined ? data.election_id : existing.election_id;
    const tpsId = data.tps_id !== undefined ? data.tps_id : existing.tps_id;
    const voterCode = data.voter_code !== undefined ? data.voter_code : existing.voter_code;
    const name = data.name !== undefined ? data.name : existing.name;
    const gender = data.gender !== undefined ? data.gender : existing.gender;
    const birthYear = data.birth_year !== undefined ? data.birth_year : existing.birth_year;
    const verificationStatus = data.verification_status !== undefined ? data.verification_status : existing.verification_status;
    const hasVoted = data.has_voted !== undefined ? data.has_voted : existing.has_voted;

    let finalNikHash = existing.nik_hash || null;
    if (data.nik) {
      finalNikHash = sha256(data.nik);
    } else if (data.nik_hash !== undefined) {
      finalNikHash = data.nik_hash;
    }

    const stmt = db.prepare(`
      UPDATE voters
      SET election_id = ?, tps_id = ?, voter_code = ?, nik_hash = ?, name = ?, 
          gender = ?, birth_year = ?, verification_status = ?, has_voted = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      electionId,
      tpsId,
      voterCode,
      finalNikHash,
      name,
      gender,
      birthYear,
      verificationStatus,
      hasVoted,
      id
    );

    return this.getById(id);
  },

  delete(id: number): boolean {
    const existing = this.getById(id);
    if (!existing) return false;

    const stmt = db.prepare("DELETE FROM voters WHERE id = ?");
    stmt.run(id);
    return true;
  },
};
