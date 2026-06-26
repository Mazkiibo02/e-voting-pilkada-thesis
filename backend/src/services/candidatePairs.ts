import db from "../database/connection";

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
  created_at: string;
  updated_at: string;
}

export const CandidatePairsService = {
  getAll(electionId?: number): CandidatePair[] {
    if (electionId) {
      const stmt = db.prepare("SELECT * FROM candidate_pairs WHERE election_id = ? ORDER BY ballot_number ASC");
      return stmt.all(electionId) as unknown as CandidatePair[];
    } else {
      const stmt = db.prepare("SELECT * FROM candidate_pairs ORDER BY id DESC");
      return stmt.all() as unknown as CandidatePair[];
    }
  },

  getById(id: number): CandidatePair | null {
    const stmt = db.prepare("SELECT * FROM candidate_pairs WHERE id = ?");
    const cp = stmt.get(id);
    return cp ? (cp as unknown as CandidatePair) : null;
  },

  getByBallotNumber(electionId: number, ballotNumber: number): CandidatePair | null {
    const stmt = db.prepare("SELECT * FROM candidate_pairs WHERE election_id = ? AND ballot_number = ?");
    const cp = stmt.get(electionId, ballotNumber);
    return cp ? (cp as unknown as CandidatePair) : null;
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
  }): CandidatePair {
    const stmt = db.prepare(`
      INSERT INTO candidate_pairs (
        election_id, ballot_number, candidate_name, vice_candidate_name, 
        coalition_name, vision_summary, motto, vision, mission, education, career_path, photo_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.photo_url || null
    );
    
    return this.getById(Number(result.lastInsertRowid))!;
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

    const stmt = db.prepare(`
      UPDATE candidate_pairs
      SET election_id = ?, ballot_number = ?, candidate_name = ?, vice_candidate_name = ?, 
          coalition_name = ?, vision_summary = ?, motto = ?, vision = ?, mission = ?, education = ?, career_path = ?, photo_url = ?, updated_at = CURRENT_TIMESTAMP
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
      id
    );

    return this.getById(id);
  },

  delete(id: number): boolean {
    const existing = this.getById(id);
    if (!existing) return false;

    const stmt = db.prepare("DELETE FROM candidate_pairs WHERE id = ?");
    stmt.run(id);
    return true;
  },
};
