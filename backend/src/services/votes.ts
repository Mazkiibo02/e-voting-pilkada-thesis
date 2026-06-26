import db from "../database/connection";
import { AuditLogsService } from "./auditLogs";

export class VoteError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "VoteError";
  }
}

export interface CastVoteResult {
  sessionId: number;
  electionId: number;
  tpsId: number;
  candidatePairId: number;
  status: string;
  castAt: string;
}

export const VotesService = {
  castVote(sessionId: number, candidatePairId: number): CastVoteResult {
    // 1. Validate voting session exists
    const session = db.prepare("SELECT * FROM voting_sessions WHERE id = ?").get(sessionId) as any;
    if (!session) {
      throw new VoteError(404, "Voting session not found");
    }

    // 2. Validate session status is ACTIVE
    if (session.status !== "ACTIVE") {
      if (session.status === "USED") {
        throw new VoteError(409, "Voting session has already been used");
      }
      if (session.status === "EXPIRED" || session.status === "CANCELLED") {
        throw new VoteError(409, `Voting session is ${session.status.toLowerCase()}`);
      }
      throw new VoteError(409, `Voting session status is ${session.status}`);
    }

    // 3. Validate session is not expired
    const now = new Date().toISOString();
    if (session.expires_at && session.expires_at < now) {
      db.prepare("UPDATE voting_sessions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(sessionId);
      throw new VoteError(409, "Voting session has expired");
    }

    // 4. Validate candidate pair exists
    const candidatePair = db.prepare("SELECT * FROM candidate_pairs WHERE id = ?").get(candidatePairId) as any;
    if (!candidatePair) {
      throw new VoteError(404, "Candidate pair not found");
    }

    // 5. Validate candidate pair belongs to same election as session
    if (candidatePair.election_id !== session.election_id) {
      throw new VoteError(400, "Candidate pair does not belong to the same election as the voting session");
    }

    // Note: voter checks removed due to token-based anonymous voting

    // 9. Check if a vote record already exists for the session (safety index check)
    const existingVote = db.prepare("SELECT COUNT(*) as c FROM votes WHERE session_id = ?").get(sessionId) as any;
    if (existingVote && Number(existingVote.c || 0) > 0) {
      throw new VoteError(409, "A vote has already been cast for this session");
    }

    // 10. Execute changes in transaction
    const castTime = new Date().toISOString();
    try {
      db.exec("BEGIN TRANSACTION;");

      // Insert vote
      db.prepare(`
        INSERT INTO votes (election_id, tps_id, candidate_pair_id, session_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(session.election_id, session.tps_id, candidatePairId, sessionId, castTime);

      // Update session status to USED
      db.prepare(`
        UPDATE voting_sessions
        SET status = 'USED', used_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(castTime, sessionId);

      // Log vote cast
      AuditLogsService.log({
        electionId: session.election_id,
        tpsId: session.tps_id,
        actorRole: "VOTER",
        action: "VOTE_CAST",
        entityType: "VOTE",
        entityId: session.id,
        description: `Vote cast successfully for voting session ID ${session.id}`
      });

      db.exec("COMMIT;");

      return {
        sessionId: session.id,
        electionId: session.election_id,
        tpsId: session.tps_id,
        candidatePairId,
        status: "USED",
        castAt: castTime,
      };
    } catch (error) {
      try {
        db.exec("ROLLBACK;");
      } catch (rollbackErr) {
        // ignore
      }
      throw error;
    }
  },
};
