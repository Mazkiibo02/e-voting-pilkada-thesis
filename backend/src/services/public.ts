import db from "../database/connection";

export interface PublicCandidateResult {
  id: number;
  ballotNumber: number;
  candidateName: string | null;
  viceCandidateName: string | null;
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
}

export const PublicService = {
  getAggregatedResults() {
    // Query total votes for each candidate pair aggregated from all TPS recaps
    const candidateResults = db.prepare(`
      SELECT 
        cp.id,
        cp.ballot_number as ballotNumber,
        cp.candidate_name as candidateName,
        cp.vice_candidate_name as viceCandidateName,
        COALESCE(SUM(ct.vote_total), 0) as voteCount
      FROM candidate_pairs cp
      LEFT JOIN tps_recap_candidate_totals ct ON cp.id = ct.candidate_pair_id
      GROUP BY cp.id, cp.ballot_number, cp.candidate_name, cp.vice_candidate_name
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
