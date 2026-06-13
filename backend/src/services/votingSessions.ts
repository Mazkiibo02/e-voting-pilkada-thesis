import db from "../database/connection";

export interface VotingSession {
  id: number;
  election_id: number;
  tps_id: number;
  voter_id: number | null;
  booth_id: string | null;
  status: string;
  expires_at: string | null;
  used_at: string | null;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface DetailedVotingSession extends VotingSession {
  voter_code?: string | null;
  voter_name?: string | null;
  voter_gender?: string | null;
  voter_birth_year?: number | null;
  voter_verification_status?: string | null;
}

export const VotingSessionsService = {
  getById(id: number): DetailedVotingSession | null {
    const stmt = db.prepare(`
      SELECT vs.*, v.voter_code, v.name as voter_name, v.gender as voter_gender, v.birth_year as voter_birth_year, v.verification_status as voter_verification_status
      FROM voting_sessions vs
      LEFT JOIN voters v ON vs.voter_id = v.id
      WHERE vs.id = ?
    `);
    const session = stmt.get(id);
    return session ? (session as unknown as DetailedVotingSession) : null;
  },

  getAll(filters: {
    electionId?: number;
    tpsId?: number;
    status?: string;
    boothId?: string;
  }): DetailedVotingSession[] {
    let query = `
      SELECT vs.*, v.voter_code, v.name as voter_name, v.gender as voter_gender, v.birth_year as voter_birth_year, v.verification_status as voter_verification_status
      FROM voting_sessions vs
      LEFT JOIN voters v ON vs.voter_id = v.id
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
    return stmt.all(...params) as unknown as DetailedVotingSession[];
  },

  getActiveSessionForVoter(voterId: number): VotingSession | null {
    const stmt = db.prepare(`
      SELECT * FROM voting_sessions
      WHERE voter_id = ? AND status = 'ACTIVE' AND expires_at > ?
    `);
    const session = stmt.get(voterId, new Date().toISOString());
    return session ? (session as unknown as VotingSession) : null;
  },

  getActiveSessionForBooth(tpsId: number, boothId: string): VotingSession | null {
    const stmt = db.prepare(`
      SELECT * FROM voting_sessions
      WHERE tps_id = ? AND booth_id = ? AND status = 'ACTIVE' AND expires_at > ?
    `);
    const session = stmt.get(tpsId, boothId, new Date().toISOString());
    return session ? (session as unknown as VotingSession) : null;
  },

  getBoothActiveSession(boothId: string, tpsId?: number): any | null {
    let query = `
      SELECT vs.*, e.name as election_name, e.election_type, t.tps_number, t.tps_code
      FROM voting_sessions vs
      JOIN elections e ON vs.election_id = e.id
      JOIN tps t ON vs.tps_id = t.id
      WHERE vs.booth_id = ? AND vs.status = 'ACTIVE' AND vs.expires_at > ?
    `;
    const params: any[] = [boothId, new Date().toISOString()];

    if (tpsId !== undefined) {
      query += " AND vs.tps_id = ?";
      params.push(tpsId);
    }

    const stmt = db.prepare(query);
    const session = stmt.get(...params) as any;
    if (!session) return null;

    // Fetch candidate pairs for this election
    const cpStmt = db.prepare(`
      SELECT id, ballot_number, candidate_name, vice_candidate_name, coalition_name
      FROM candidate_pairs
      WHERE election_id = ?
      ORDER BY ballot_number ASC
    `);
    const candidatePairs = cpStmt.all(session.election_id) as any[];

    return {
      sessionId: session.id,
      electionId: session.election_id,
      tpsId: session.tps_id,
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
      candidatePairs: candidatePairs.map(cp => ({
        id: cp.id,
        ballotNumber: cp.ballot_number,
        candidateName: cp.candidate_name,
        viceCandidateName: cp.vice_candidate_name,
        coalitionName: cp.coalition_name,
      })),
    };
  },

  create(data: {
    electionId: number;
    tpsId: number;
    voterId: number;
    boothId: string;
    expiresMinutes: number;
    createdByUserId: number;
  }): VotingSession {
    const expiresAt = new Date(Date.now() + data.expiresMinutes * 60000).toISOString();

    // Start database operation
    try {
      db.exec("BEGIN TRANSACTION;");

      // Set voter status to VERIFIED if UNVERIFIED
      db.prepare(`
        UPDATE voters 
        SET verification_status = 'VERIFIED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND verification_status = 'UNVERIFIED'
      `).run(data.voterId);

      const stmt = db.prepare(`
        INSERT INTO voting_sessions (
          election_id, tps_id, voter_id, booth_id, status, expires_at, created_by_user_id
        )
        VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
      `);
      const result = stmt.run(
        data.electionId,
        data.tpsId,
        data.voterId,
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
