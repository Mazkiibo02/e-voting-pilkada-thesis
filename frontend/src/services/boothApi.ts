import { API_BASE } from "./api";

export interface CandidatePair {
  id: number;
  ballotNumber: number;
  candidateName: string;
  viceCandidateName: string;
  coalitionName?: string;
}

export interface ActiveSession {
  sessionId: number;
  electionId: number;
  tpsId: number;
  boothId: string;
  status: string;
  expiresAt: string;
  election: {
    name: string;
    electionType: string;
  };
  tps: {
    tpsNumber: string;
    tpsCode: string;
  };
  candidatePairs: CandidatePair[];
}

export interface ActiveSessionResponse {
  data: ActiveSession | null;
  message?: string;
}

export interface CastVoteResponse {
  message: string;
  data?: {
    sessionId: number;
    electionId: number;
    tpsId: number;
    candidatePairId: number;
    status: string;
    castAt: string;
  };
}

/**
 * Polls the backend for an active voting session on a specific booth.
 */
export async function getActiveBoothSession(boothId: string): Promise<ActiveSessionResponse> {
  const res = await fetch(`${API_BASE}/voting-sessions/booth/${encodeURIComponent(boothId)}/active`);
  if (!res.ok) {
    throw new Error("Gagal memeriksa status sesi voting aktif di TPS.");
  }
  return res.json();
}

/**
 * Submits the vote choice to the backend.
 */
export async function castVote(sessionId: number, candidatePairId: number): Promise<CastVoteResponse> {
  const res = await fetch(`${API_BASE}/votes/cast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
      candidatePairId,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Gagal menyimpan suara ke dalam sistem.");
  }

  return res.json();
}
