import db from "../database/connection";

export interface PublicCandidateResult {
  id: number;
  ballotNumber: number;
  candidateName: string | null;
  viceCandidateName: string | null;
  motto: string | null;
  vision: string | null;
  mission: string | null;
  education: string | null;
  careerPath: string | null;
  photoUrl: string | null;
  voteCount: number;
}

export interface PublicTpsMetadata {
  id: number;
  tpsNumber: string | null;
  tpsCode: string | null;
  province: string | null;
  cityRegency: string | null;
  district: string | null;
  village: string | null;
  address: string | null;
  status: string;
  documentHash: string | null;
  txHash: string | null;
  registeredVotersTotal: number;
}

export const PublicService = {
  getAggregatedResults() {
    // Query total votes for each candidate pair directly from votes table for real-time quick count
    const candidateResults = db.prepare(`
      SELECT 
        cp.id,
        cp.ballot_number as ballotNumber,
        cp.candidate_name as candidateName,
        cp.vice_candidate_name as viceCandidateName,
        cp.motto,
        cp.vision,
        cp.mission,
        cp.education,
        cp.career_path as careerPath,
        cp.photo_url as photoUrl,
        (
          SELECT COUNT(*) 
          FROM votes v 
          JOIN voting_sessions s ON v.session_id = s.id
          JOIN tps t ON s.tps_id = t.id
          WHERE v.candidate_pair_id = cp.id
        ) as voteCount
      FROM candidate_pairs cp
      ORDER BY cp.ballot_number ASC
    `).all() as unknown as PublicCandidateResult[];

    // Query TPS statuses and hashes from documents and blockchain_records
    const tpsList = db.prepare(`
      SELECT 
        t.id,
        t.tps_number as tpsNumber,
        t.tps_code as tpsCode,
        t.province,
        t.city_regency as cityRegency,
        t.district,
        t.village,
        t.address,
        t.status,
        t.registered_voters_total as registeredVotersTotal,
        COALESCE(d.signed_file_hash_sha256, br.document_hash) as documentHash,
        br.transaction_hash as txHash
      FROM tps t
      LEFT JOIN documents d ON t.id = d.tps_id AND d.document_type = 'CHASIL_KWK_INSPIRED_RESULT_FORM'
      LEFT JOIN blockchain_records br ON t.id = br.tps_id
      ORDER BY t.tps_number ASC, t.id ASC
    `).all() as unknown as PublicTpsMetadata[];

    return {
      candidates: candidateResults,
      tpsList
    };
  }
};
