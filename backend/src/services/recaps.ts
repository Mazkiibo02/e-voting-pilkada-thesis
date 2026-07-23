import db from "../database/connection";

export interface TpsRecap {
  id: number;
  election_id: number;
  tps_id: number;
  total_registered_voters: number;
  total_verified_voters: number;
  total_valid_votes: number;
  total_invalid_votes: number;
  validation_status: string;
  generated_at: string | null;
  generated_by_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface RecapCandidateTotal {
  candidatePairId: number;
  ballotNumber: number;
  candidateName: string;
  viceCandidateName: string;
  coalitionName?: string | null;
  voteTotal: number;
  voteTotalInWords: string;
}

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    totalRegisteredVoters: number;
    totalVerifiedVoters: number;
    totalValidVotes: number;
    totalInvalidVotes: number;
  };
}

/**
 * Converts a non-negative integer to Indonesian words ("terbilang").
 */
export function numberToWordsIndonesian(n: number): string {
  if (n < 0) return "minus " + numberToWordsIndonesian(-n);
  if (n === 0) return "nol";

  const units = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

  function convert(x: number): string {
    if (x < 12) return units[x];
    if (x < 20) return convert(x - 10) + " belas";
    if (x < 100) return convert(Math.floor(x / 10)) + " puluh " + convert(x % 10);
    if (x < 200) return "seratus " + convert(x - 100);
    if (x < 1000) return convert(Math.floor(x / 100)) + " ratus " + convert(x % 100);
    if (x < 2000) return "seribu " + convert(x - 1000);
    if (x < 1000000) return convert(Math.floor(x / 1000)) + " ribu " + convert(x % 1000);
    return String(x); // Fallback
  }

  return convert(n).replace(/\s+/g, " ").trim();
}

export const RecapsService = {
  /**
   * Retrieves an existing TPS recap with its candidate pair totals.
   */
  getByTpsId(tpsId: number): { recap: TpsRecap; candidateTotals: RecapCandidateTotal[] } | null {
    const recap = db.prepare("SELECT * FROM tps_recaps WHERE tps_id = ?").get(tpsId) as TpsRecap | undefined;
    if (!recap) return null;

    const candidateTotals = db.prepare(`
      SELECT 
        ct.candidate_pair_id as candidatePairId,
        cp.ballot_number as ballotNumber,
        cp.candidate_name as candidateName,
        cp.vice_candidate_name as viceCandidateName,
        cp.coalition_name as coalitionName,
        ct.vote_total as voteTotal,
        ct.vote_total_in_words as voteTotalInWords
      FROM tps_recap_candidate_totals ct
      JOIN candidate_pairs cp ON ct.candidate_pair_id = cp.id
      WHERE ct.recap_id = ?
      ORDER BY cp.ballot_number ASC
    `).all(recap.id) as unknown as RecapCandidateTotal[];

    return { recap, candidateTotals };
  },

  /**
   * Run validation rules against current source data for a TPS.
   */
  validateRecapData(tpsId: number, electionId: number): ValidationResult {
    // 1. Fetch counts
    const totalRegistered = (db.prepare("SELECT registered_voters_total FROM tps WHERE id = ?").get(tpsId) as any)?.registered_voters_total || 0;
    const totalVerified = (db.prepare("SELECT COUNT(*) as c FROM voting_sessions WHERE tps_id = ?").get(tpsId) as any).c || 0;
    const totalValid = (db.prepare("SELECT COUNT(*) as c FROM votes WHERE tps_id = ? AND election_id = ?").get(tpsId, electionId) as any).c || 0;
    const totalInvalid = Math.max(0, totalVerified - totalValid);

    const candidateVotes = db.prepare(`
      SELECT cp.id, COUNT(v.id) as vote_total
      FROM candidate_pairs cp
      LEFT JOIN votes v ON cp.id = v.candidate_pair_id AND v.tps_id = ?
      WHERE cp.election_id = ?
      GROUP BY cp.id
    `).all(tpsId, electionId) as { id: number; vote_total: number }[];

    const sumCandidateVotes = candidateVotes.reduce((sum, cv) => sum + cv.vote_total, 0);

    const issues: ValidationIssue[] = [];

    // Rule 1: sum(candidate_pair_vote_totals) == total_valid_votes
    if (sumCandidateVotes !== totalValid) {
      issues.push({
        code: "TOTAL_VALID_MISMATCH",
        message: `Sum of candidate votes (${sumCandidateVotes}) does not match total valid votes (${totalValid}).`
      });
    }

    // Rule 2: total_valid_votes <= total_verified_voters
    if (totalValid > totalVerified) {
      issues.push({
        code: "VALID_EXCEEDS_VERIFIED",
        message: `Total valid votes (${totalValid}) exceeds total verified voters (${totalVerified}).`
      });
    }

    // Rule 3: total_verified_voters <= total_registered_voters
    if (totalVerified > totalRegistered) {
      issues.push({
        code: "VERIFIED_EXCEEDS_REGISTERED",
        message: `Total verified voters (${totalVerified}) exceeds total registered voters (${totalRegistered}).`
      });
    }

    // Rule 4: each voting session is used at most once
    const duplicateSessions = db.prepare(`
      SELECT session_id, COUNT(*) as c 
      FROM votes 
      WHERE tps_id = ? 
      GROUP BY session_id 
      HAVING c > 1
    `).all(tpsId) as { session_id: number; c: number }[];

    if (duplicateSessions.length > 0) {
      issues.push({
        code: "SESSION_REUSE",
        message: `Voting session ID(s) ${duplicateSessions.map(ds => ds.session_id).join(", ")} were used more than once.`
      });
    }

    // Rule 5: each used voting session has exactly one vote (and totals match)
    const usedSessionsCount = (db.prepare("SELECT COUNT(*) as c FROM voting_sessions WHERE tps_id = ? AND status = 'USED'").get(tpsId) as any).c || 0;
    if (usedSessionsCount !== totalValid) {
      issues.push({
        code: "SESSION_VOTE_COUNT_MISMATCH",
        message: `Number of USED sessions (${usedSessionsCount}) does not match number of vote records (${totalValid}).`
      });
    }

    const missingVotesForUsedSession = db.prepare(`
      SELECT id FROM voting_sessions 
      WHERE tps_id = ? AND status = 'USED' 
      AND id NOT IN (SELECT session_id FROM votes WHERE tps_id = ?)
    `).all(tpsId, tpsId) as { id: number }[];

    if (missingVotesForUsedSession.length > 0) {
      issues.push({
        code: "MISSING_SESSION_VOTE",
        message: `Voting session ID(s) ${missingVotesForUsedSession.map(s => s.id).join(", ")} are marked as USED but have no vote record.`
      });
    }

    // Rule 6: each vote belongs to the same election and TPS as the session
    const mismatchedMetadata = db.prepare(`
      SELECT v.id, v.session_id 
      FROM votes v
      JOIN voting_sessions vs ON v.session_id = vs.id
      WHERE v.tps_id = ? AND (v.election_id != vs.election_id OR v.tps_id != vs.tps_id)
    `).all(tpsId) as { id: number; session_id: number }[];

    if (mismatchedMetadata.length > 0) {
      issues.push({
        code: "VOTE_SESSION_METADATA_MISMATCH",
        message: `Some votes do not match the election or TPS of their voting session.`
      });
    }

    // Rule 7: each vote candidate pair belongs to the same election
    const mismatchedCandidates = db.prepare(`
      SELECT v.id 
      FROM votes v
      JOIN candidate_pairs cp ON v.candidate_pair_id = cp.id
      WHERE v.tps_id = ? AND v.election_id != cp.election_id
    `).all(tpsId) as { id: number }[];

    if (mismatchedCandidates.length > 0) {
      issues.push({
        code: "CANDIDATE_ELECTION_MISMATCH",
        message: `Some votes are cast for candidate pairs that do not belong to the election.`
      });
    }

    // Rule 8: removed because voter tracking is anonymous now

    return {
      isValid: issues.length === 0,
      issues,
      summary: {
        totalRegisteredVoters: totalRegistered,
        totalVerifiedVoters: totalVerified,
        totalValidVotes: totalValid,
        totalInvalidVotes: totalInvalid,
      }
    };
  },

  /**
   * Generates or regenerates TPS recap data inside an atomic transaction.
   */
  generateRecap(tpsId: number, generatedByUserId: number): { recap: TpsRecap; candidateTotals: RecapCandidateTotal[]; issues: ValidationIssue[] } {
    // 1. Fetch TPS metadata
    const tps = db.prepare("SELECT * FROM tps WHERE id = ?").get(tpsId) as any;
    if (!tps) {
      throw new Error("TPS not found");
    }

    const electionId = tps.election_id;

    // 2. Validate TPS status
    if (tps.status !== "CLOSED") {
      throw new Error(`TPS status is ${tps.status}. TPS must be CLOSED before generating recap.`);
    }

    // 3. Compute source data
    const totalRegistered = tps.registered_voters_total || 0;
    const totalVerified = (db.prepare("SELECT COUNT(*) as c FROM voting_sessions WHERE tps_id = ?").get(tpsId) as any).c || 0;
    const totalMaleVoted = (db.prepare("SELECT COUNT(*) as c FROM voting_sessions WHERE tps_id = ? AND status = 'USED' AND (voter_gender = 'L' OR voter_gender = 'MALE' OR voter_gender IS NULL)").get(tpsId) as any).c || 0;
    const totalFemaleVoted = (db.prepare("SELECT COUNT(*) as c FROM voting_sessions WHERE tps_id = ? AND status = 'USED' AND (voter_gender = 'P' OR voter_gender = 'FEMALE')").get(tpsId) as any).c || 0;
    const totalValid = (db.prepare("SELECT COUNT(*) as c FROM votes WHERE tps_id = ? AND election_id = ?").get(tpsId, electionId) as any).c || 0;
    const totalInvalid = Math.max(0, totalVerified - totalValid);

    const candidateVotes = db.prepare(`
      SELECT 
        cp.id as candidatePairId,
        cp.ballot_number as ballotNumber,
        cp.candidate_name as candidateName,
        cp.vice_candidate_name as viceCandidateName,
        cp.coalition_name as coalitionName,
        COUNT(v.id) as voteTotal
      FROM candidate_pairs cp
      LEFT JOIN votes v ON cp.id = v.candidate_pair_id AND v.tps_id = ?
      WHERE cp.election_id = ? AND (cp.is_deleted = 0 OR cp.is_deleted IS NULL)
      GROUP BY cp.id
      ORDER BY cp.ballot_number ASC
    `).all(tpsId, electionId) as any[];

    // 4. Validate source data
    const validation = this.validateRecapData(tpsId, electionId);
    const validationStatus = validation.isValid ? "VALID" : "INVALID";

    try {
      db.exec("BEGIN TRANSACTION;");

      // Check if recap already exists
      const existingRecap = db.prepare("SELECT id FROM tps_recaps WHERE tps_id = ?").get(tpsId) as { id: number } | undefined;
      let recapId: number;

      const now = new Date().toISOString();

      if (existingRecap) {
        recapId = existingRecap.id;
        db.prepare(`
          UPDATE tps_recaps
          SET 
            total_registered_voters = ?,
            total_verified_voters = ?,
            voters_male_voted = ?,
            voters_female_voted = ?,
            total_valid_votes = ?,
            total_invalid_votes = ?,
            validation_status = ?,
            generated_at = ?,
            generated_by_user_id = ?,
            updated_at = ?
          WHERE id = ?
        `).run(
          totalRegistered,
          totalVerified,
          totalMaleVoted,
          totalFemaleVoted,
          totalValid,
          totalInvalid,
          validationStatus,
          now,
          generatedByUserId,
          now,
          recapId
        );
      } else {
        const insertRecap = db.prepare(`
          INSERT INTO tps_recaps (
            election_id, tps_id, total_registered_voters, total_verified_voters,
            voters_male_voted, voters_female_voted,
            total_valid_votes, total_invalid_votes, validation_status,
            generated_at, generated_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          electionId,
          tpsId,
          totalRegistered,
          totalVerified,
          totalMaleVoted,
          totalFemaleVoted,
          totalValid,
          totalInvalid,
          validationStatus,
          now,
          generatedByUserId
        );
        recapId = Number(insertRecap.lastInsertRowid);
      }

      // Replace candidate totals for that recap
      db.prepare("DELETE FROM tps_recap_candidate_totals WHERE recap_id = ?").run(recapId);

      const insertTotalStmt = db.prepare(`
        INSERT INTO tps_recap_candidate_totals (recap_id, candidate_pair_id, vote_total, vote_total_in_words)
        VALUES (?, ?, ?, ?)
      `);

      const candidateTotals: RecapCandidateTotal[] = [];

      for (const cv of candidateVotes) {
        const words = numberToWordsIndonesian(cv.voteTotal);
        insertTotalStmt.run(recapId, cv.candidatePairId, cv.voteTotal, words);
        candidateTotals.push({
          candidatePairId: cv.candidatePairId,
          ballotNumber: cv.ballotNumber,
          candidateName: cv.candidateName,
          viceCandidateName: cv.viceCandidateName,
          coalitionName: cv.coalitionName,
          voteTotal: cv.voteTotal,
          voteTotalInWords: words,
        });
      }

      // If valid, update TPS status to RECAP_GENERATED
      if (validation.isValid) {
        db.prepare("UPDATE tps SET status = 'RECAP_GENERATED', updated_at = ? WHERE id = ?").run(now, tpsId);
      }

      db.exec("COMMIT;");

      const finalRecap = db.prepare("SELECT * FROM tps_recaps WHERE id = ?").get(recapId) as unknown as TpsRecap;

      return {
        recap: finalRecap,
        candidateTotals,
        issues: validation.issues
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

  /**
   * List recap summaries for an election.
   */
  getByElectionId(electionId: number): TpsRecap[] {
    return db.prepare("SELECT * FROM tps_recaps WHERE election_id = ? ORDER BY id DESC").all(electionId) as unknown as TpsRecap[];
  }
};
