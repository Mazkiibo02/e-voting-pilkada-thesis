import db from "../database/connection";

export const PublicService = {
  getStats(tpsCodeFilter?: string) {
    let tpsCondition = "";
    const params: any[] = [];
    if (tpsCodeFilter) {
      tpsCondition = "WHERE t.tps_code = ?";
      params.push(tpsCodeFilter);
    }

    // Get total registered
    const totalRegisteredRow = db.prepare(`
      SELECT SUM(t.registered_voters_total) as total
      FROM tps t
      ${tpsCondition}
    `).get(...params) as { total: number };

    // Get total votes
    let voteTpsCondition = "";
    if (tpsCodeFilter) {
      voteTpsCondition = "WHERE t.tps_code = ?";
    }
    const totalVotesRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM votes v
      JOIN voting_sessions s ON v.session_id = s.id
      JOIN tps t ON s.tps_id = t.id
      ${voteTpsCondition}
    `).get(...params) as { total: number };

    // Get candidate totals
    let candVoteCondition = "";
    if (tpsCodeFilter) {
      candVoteCondition = "AND t.tps_code = ?";
    }
    const candidates = db.prepare(`
      SELECT 
        cp.id,
        cp.ballot_number as ballotNumber,
        cp.candidate_name as candidateName,
        cp.vice_candidate_name as viceCandidateName,
        (
          SELECT COUNT(*) 
          FROM votes v 
          JOIN voting_sessions s ON v.session_id = s.id
          JOIN tps t ON s.tps_id = t.id
          WHERE v.candidate_pair_id = cp.id ${candVoteCondition}
        ) as voteCount
      FROM candidate_pairs cp
      ORDER BY cp.ballot_number ASC
    `).all(...(tpsCodeFilter ? [tpsCodeFilter] : [])) as any[];

    // Get TPS List (if no filter, return all)
    const tpsList = db.prepare(`
      SELECT tps_code as tpsCode
      FROM tps
      ORDER BY tps_code ASC
    `).all() as { tpsCode: string }[];

    // Get Booth Activity
    let boothCondition = "";
    if (tpsCodeFilter) {
      boothCondition = "WHERE t.tps_code = ?";
    }
    const boothActivity = db.prepare(`
      SELECT 
        s.booth_id as boothId,
        COUNT(v.id) as voteCount
      FROM voting_sessions s
      LEFT JOIN votes v ON v.session_id = s.id
      JOIN tps t ON s.tps_id = t.id
      ${boothCondition}
      GROUP BY s.booth_id
      ORDER BY s.booth_id ASC
    `).all(...params) as any[];

    const boothsFormatted = boothActivity.map(b => ({
      name: b.boothId || "Tanpa Bilik",
      votes: b.voteCount
    }));

    const candidatesFormatted = candidates.map(c => ({
      id: c.id,
      name: c.viceCandidateName 
        ? `${c.candidateName} & ${c.viceCandidateName}`
        : c.candidateName,
      votes: c.voteCount,
      percentage: totalVotesRow.total > 0 ? Number(((c.voteCount / totalVotesRow.total) * 100).toFixed(1)) : 0
    }));

    const totalReg = totalRegisteredRow.total || 0;

    return {
      totalRegistered: totalReg,
      totalVotes: totalVotesRow.total,
      participation: totalReg > 0 
        ? Number(((totalVotesRow.total / totalReg) * 100).toFixed(1)) 
        : 0,
      candidates: candidatesFormatted,
      booths: boothsFormatted,
      tpsList: tpsList.map(t => t.tpsCode)
    };
  }
};
