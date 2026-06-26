import db from "../database/connection";

export interface VotingSession {
  id: number;
  election_id: number;
  tps_id: number;
  token: string;
  booth_id: string | null;
  status: string;
  expires_at: string | null;
  used_at: string | null;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export const VotingSessionsService = {
  getById(id: number): VotingSession | null {
    const stmt = db.prepare(`
      SELECT vs.*
      FROM voting_sessions vs
      WHERE vs.id = ?
    `);
    const session = stmt.get(id);
    return session ? (session as unknown as VotingSession) : null;
  },

  getAll(filters: {
    electionId?: number;
    tpsId?: number;
    status?: string;
    boothId?: string;
  }): VotingSession[] {
    let query = `
      SELECT vs.*
      FROM voting_sessions vs
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.electionId !== undefined) {
      query += " AND vs.election_id = ?";
      params.push(filters.electionId);
    }
    if (filters.tpsId !== undefined) {
      query += " AND vs.tps_id = ?";
      params.push(filters.tpsId);
    }
    if (filters.status !== undefined) {
      query += " AND vs.status = ?";
      params.push(filters.status.toUpperCase());
    }
    if (filters.boothId !== undefined) {
      query += " AND vs.booth_id = ?";
      params.push(filters.boothId);
    }

    query += " ORDER BY vs.id DESC";

    const stmt = db.prepare(query);
    return stmt.all(...params) as unknown as VotingSession[];
  },

  getByToken(token: string): any | null {
    let query = `
      SELECT vs.*, e.name as election_name, e.election_type, t.tps_number, t.tps_code
      FROM voting_sessions vs
      JOIN elections e ON vs.election_id = e.id
      JOIN tps t ON vs.tps_id = t.id
      WHERE vs.token = ? AND vs.status = 'ACTIVE' AND vs.expires_at > ?
    `;
    const params: any[] = [token, new Date().toISOString()];

    const stmt = db.prepare(query);
    const session = stmt.get(...params) as any;
    if (!session) return null;

    // Fetch candidate pairs for this election
    const cpStmt = db.prepare(`
      SELECT id, ballot_number, candidate_name, vice_candidate_name, coalition_name, motto, vision, mission, education, career_path, photo_url
      FROM candidate_pairs
      WHERE election_id = ?
      ORDER BY ballot_number ASC
    `);
    const candidatePairs = cpStmt.all(session.election_id) as any[];

    return {
      sessionId: session.id,
      electionId: session.election_id,
      tpsId: session.tps_id,
      token: session.token,
      boothId: session.booth_id,
      status: session.status,
      expiresAt: session.expires_at,
      election: {
        name: session.election_name,
        electionType: session.election_type,
      },
      tps: {
        tpsNumber: session.tps_number,
        tpsCode: session.tps_code,
      },
      candidatePairs: candidatePairs.map((cp: any) => ({
        id: cp.id,
        ballotNumber: cp.ballot_number,
        candidateName: cp.candidate_name,
        viceCandidateName: cp.vice_candidate_name,
        coalitionName: cp.coalition_name,
        motto: cp.motto,
        vision: cp.vision,
        mission: cp.mission,
        education: cp.education,
        careerPath: cp.career_path,
        photoUrl: cp.photo_url,
      })),
    };
  },

  getActiveSessionForBooth(boothId: string): any | null {
    let query = `
      SELECT vs.*, e.name as election_name, e.election_type, t.tps_number, t.tps_code
      FROM voting_sessions vs
      JOIN elections e ON vs.election_id = e.id
      JOIN tps t ON vs.tps_id = t.id
      WHERE vs.booth_id = ? AND vs.status = 'ACTIVE' AND vs.expires_at > ?
    `;
    const params: any[] = [boothId, new Date().toISOString()];

    const stmt = db.prepare(query);
    const session = stmt.get(...params) as any;
    if (!session) return null;

    // Fetch candidate pairs for this election
    const cpStmt = db.prepare(`
      SELECT id, ballot_number, candidate_name, vice_candidate_name, coalition_name, motto, vision, mission, education, career_path, photo_url
      FROM candidate_pairs
      WHERE election_id = ?
      ORDER BY ballot_number ASC
    `);
    const candidatePairs = cpStmt.all(session.election_id) as any[];

    return {
      sessionId: session.id,
      electionId: session.election_id,
      tpsId: session.tps_id,
      token: session.token,
      boothId: session.booth_id,
      status: session.status,
      expiresAt: session.expires_at,
      election: {
        name: session.election_name,
        electionType: session.election_type,
      },
      tps: {
        tpsNumber: session.tps_number,
        tpsCode: session.tps_code,
      },
      candidatePairs: candidatePairs.map((cp: any) => ({
        id: cp.id,
        ballotNumber: cp.ballot_number,
        candidateName: cp.candidate_name,
        viceCandidateName: cp.vice_candidate_name,
        coalitionName: cp.coalition_name,
        motto: cp.motto,
        vision: cp.vision,
        mission: cp.mission,
        education: cp.education,
        careerPath: cp.career_path,
        photoUrl: cp.photo_url,
      })),
    };
  },

  generateToken(data: {
    electionId: number;
    tpsId: number;
    boothId: string;
    expiresMinutes: number;
    createdByUserId: number | null;
  }): VotingSession {
    const expiresAt = new Date(Date.now() + data.expiresMinutes * 60000).toISOString();
    
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let token = "";
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    try {
      db.exec("BEGIN TRANSACTION;");

      // Cancel existing active sessions for this booth
      const cancelStmt = db.prepare(`
        UPDATE voting_sessions
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
        WHERE booth_id = ? AND status = 'ACTIVE'
      `);
      cancelStmt.run(data.boothId);

      const stmt = db.prepare(`
        INSERT INTO voting_sessions (
          election_id, tps_id, token, booth_id, status, expires_at, created_by_user_id
        )
        VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
      `);
      const result = stmt.run(
        data.electionId,
        data.tpsId,
        token,
        data.boothId,
        expiresAt,
        data.createdByUserId
      );

      db.exec("COMMIT;");
      
      return this.getById(Number(result.lastInsertRowid))!;
    } catch (error) {
      try {
        db.exec("ROLLBACK;");
      } catch (rollbackErr) {
        // ignore
      }
      throw error;
    }
  },

  updateBoothId(id: number, boothId: string): VotingSession | null {
    const stmt = db.prepare(`
      UPDATE voting_sessions
      SET booth_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(boothId, id);
    return this.getById(id);
  },

  updateStatus(id: number, status: "USED" | "EXPIRED" | "CANCELLED"): VotingSession | null {
    const stmt = db.prepare(`
      UPDATE voting_sessions
      SET status = ?, used_at = CASE WHEN ? = 'USED' THEN CURRENT_TIMESTAMP ELSE used_at END, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(status, status, id);
    return this.getById(id);
  },
};
