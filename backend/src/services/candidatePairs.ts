import db from "../database/connection";
import { Party, PartiesService } from "./parties";

export interface CandidatePair {
  id: number;
  election_id: number;
  ballot_number: number;
  candidate_name: string | null;
  vice_candidate_name: string | null;
  coalition_name: string | null;
  vision_summary: string | null;
  motto: string | null;
  vision: string | null;
  mission: string | null;
  education: string | null;
  career_path: string | null;
  photo_url: string | null;
  status: string | null;
  is_deleted: number | null;
  created_at: string;
  updated_at: string;
  parties?: Party[];
  party_ids?: number[];
}

export const CandidatePairsService = {
  attachParties(cp: CandidatePair): CandidatePair {
    if (!cp) return cp;

    const stmt = db.prepare(`
      SELECT p.* 
      FROM parties p
      JOIN paslon_parties pp ON pp.party_id = p.id
      WHERE pp.paslon_id = ?
      ORDER BY p.acronym ASC
    `);
    const parties = stmt.all(cp.id) as unknown as Party[];
    cp.parties = parties;
    cp.party_ids = parties.map(p => p.id);

    if (parties.length > 0) {
      cp.coalition_name = parties.map(p => p.acronym).join(", ");
    }

    return cp;
  },

  getAll(electionId?: number, includeDeleted = false): CandidatePair[] {
    const filter = includeDeleted ? "" : " AND (cp.is_deleted = 0 OR cp.is_deleted IS NULL) AND (cp.status != 'DELETED' OR cp.status IS NULL)";
    let list: CandidatePair[] = [];
    if (electionId) {
      const stmt = db.prepare(`SELECT cp.* FROM candidate_pairs cp WHERE cp.election_id = ? ${filter} ORDER BY cp.ballot_number ASC`);
      list = stmt.all(electionId) as unknown as CandidatePair[];
    } else {
      const whereClause = includeDeleted ? "" : " WHERE (cp.is_deleted = 0 OR cp.is_deleted IS NULL) AND (cp.status != 'DELETED' OR cp.status IS NULL)";
      const stmt = db.prepare(`SELECT cp.* FROM candidate_pairs cp ${whereClause} ORDER BY cp.ballot_number ASC`);
      list = stmt.all() as unknown as CandidatePair[];
    }

    return list.map(cp => this.attachParties(cp));
  },

  getById(id: number): CandidatePair | null {
    const stmt = db.prepare("SELECT * FROM candidate_pairs WHERE id = ?");
    const cp = stmt.get(id) as unknown as CandidatePair | null;
    return cp ? this.attachParties(cp) : null;
  },

  getByBallotNumber(electionId: number, ballotNumber: number): CandidatePair | null {
    const stmt = db.prepare("SELECT * FROM candidate_pairs WHERE election_id = ? AND ballot_number = ? AND (is_deleted = 0 OR is_deleted IS NULL)");
    const cp = stmt.get(electionId, ballotNumber) as unknown as CandidatePair | null;
    return cp ? this.attachParties(cp) : null;
  },

  setParties(paslonId: number, electionId: number, partyIds: number[]) {
    // Delete existing paslon_parties
    db.prepare("DELETE FROM paslon_parties WHERE paslon_id = ?").run(paslonId);

    if (!partyIds || partyIds.length === 0) {
      db.prepare("UPDATE candidate_pairs SET coalition_name = NULL WHERE id = ?").run(paslonId);
      return;
    }

    const partyStmt = db.prepare("INSERT INTO paslon_parties (paslon_id, party_id, election_id) VALUES (?, ?, ?)");
    const fetchedParties: Party[] = [];

    for (const pId of partyIds) {
      const party = PartiesService.getById(pId);
      if (!party) {
        throw new Error(`Partai dengan ID ${pId} tidak ditemukan.`);
      }
      try {
        partyStmt.run(paslonId, pId, electionId);
        fetchedParties.push(party);
      } catch (err: any) {
        const errStr = String(err);
        if (errStr.includes("UNIQUE constraint failed") || errStr.includes("paslon_parties.party_id")) {
          throw new Error(`Partai ${party.name} (${party.acronym}) sudah mengusung paslon lain pada pemilihan ini.`);
        }
        throw err;
      }
    }

    const coalitionName = fetchedParties.map(p => p.acronym).join(", ");
    db.prepare("UPDATE candidate_pairs SET coalition_name = ? WHERE id = ?").run(coalitionName, paslonId);
  },

  create(data: {
    election_id: number;
    ballot_number: number;
    candidate_name: string;
    vice_candidate_name: string;
    coalition_name?: string;
    vision_summary?: string;
    motto?: string;
    vision?: string;
    mission?: string;
    education?: string;
    career_path?: string;
    photo_url?: string;
    status?: string;
    party_ids?: number[];
  }): CandidatePair {
    const stmt = db.prepare(`
      INSERT INTO candidate_pairs (
        election_id, ballot_number, candidate_name, vice_candidate_name, 
        coalition_name, vision_summary, motto, vision, mission, education, career_path, photo_url, status, is_deleted
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);
    
    const result = stmt.run(
      data.election_id,
      data.ballot_number,
      data.candidate_name,
      data.vice_candidate_name,
      data.coalition_name || null,
      data.vision_summary || null,
      data.motto || null,
      data.vision || null,
      data.mission || null,
      data.education || null,
      data.career_path || null,
      data.photo_url || null,
      data.status || "ACTIVE"
    );
    
    const newPaslonId = Number(result.lastInsertRowid);

    if (data.party_ids && data.party_ids.length > 0) {
      this.setParties(newPaslonId, data.election_id, data.party_ids);
    }

    return this.getById(newPaslonId)!;
  },

  update(
    id: number,
    data: {
      election_id?: number;
      ballot_number?: number;
      candidate_name?: string;
      vice_candidate_name?: string;
      coalition_name?: string;
      vision_summary?: string;
      motto?: string;
      vision?: string;
      mission?: string;
      education?: string;
      career_path?: string;
      photo_url?: string;
      status?: string;
      is_deleted?: number;
      party_ids?: number[];
    }
  ): CandidatePair | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const electionId = data.election_id !== undefined ? data.election_id : existing.election_id;
    const ballotNumber = data.ballot_number !== undefined ? data.ballot_number : existing.ballot_number;
    const candidateName = data.candidate_name !== undefined ? data.candidate_name : existing.candidate_name;
    const viceCandidateName = data.vice_candidate_name !== undefined ? data.vice_candidate_name : existing.vice_candidate_name;
    const coalitionName = data.coalition_name !== undefined ? data.coalition_name : existing.coalition_name;
    const visionSummary = data.vision_summary !== undefined ? data.vision_summary : existing.vision_summary;
    const motto = data.motto !== undefined ? data.motto : existing.motto;
    const vision = data.vision !== undefined ? data.vision : existing.vision;
    const mission = data.mission !== undefined ? data.mission : existing.mission;
    const education = data.education !== undefined ? data.education : existing.education;
    const careerPath = data.career_path !== undefined ? data.career_path : existing.career_path;
    const photoUrl = data.photo_url !== undefined ? data.photo_url : existing.photo_url;
    const status = data.status !== undefined ? data.status : existing.status;
    const isDeleted = data.is_deleted !== undefined ? data.is_deleted : existing.is_deleted;

    const stmt = db.prepare(`
      UPDATE candidate_pairs
      SET election_id = ?, ballot_number = ?, candidate_name = ?, vice_candidate_name = ?, 
          coalition_name = ?, vision_summary = ?, motto = ?, vision = ?, mission = ?, education = ?, career_path = ?, photo_url = ?, status = ?, is_deleted = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      electionId,
      ballotNumber,
      candidateName,
      viceCandidateName,
      coalitionName,
      visionSummary,
      motto,
      vision,
      mission,
      education,
      careerPath,
      photoUrl,
      status,
      isDeleted,
      id
    );

    if (data.party_ids !== undefined) {
      this.setParties(id, electionId, data.party_ids);
    }

    return this.getById(id);
  },

  softDelete(id: number): boolean {
    const existing = this.getById(id);
    if (!existing) return false;

    db.prepare("DELETE FROM paslon_parties WHERE paslon_id = ?").run(id);
    const stmt = db.prepare("UPDATE candidate_pairs SET is_deleted = 1, status = 'DELETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    stmt.run(id);
    return true;
  },

  delete(id: number): boolean {
    const existing = this.getById(id);
    if (!existing) return false;

    db.prepare("DELETE FROM paslon_parties WHERE paslon_id = ?").run(id);
    const stmt = db.prepare("DELETE FROM candidate_pairs WHERE id = ?");
    stmt.run(id);
    return true;
  },
};
