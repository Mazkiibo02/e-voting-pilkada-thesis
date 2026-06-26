import { API_BASE } from "./api";

export interface CandidatePair {
  id: number;
  ballotNumber: number;
  candidateName: string;
  viceCandidateName: string;
  coalitionName?: string;
  motto?: string;
  vision?: string;
  mission?: string;
  education?: string;
  careerPath?: string;
  photoUrl?: string;
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

export interface BoothStatusResponse {
  status: "LOCKED" | "UNLOCKED";
  data?: ActiveSession;
  message?: string;
}

/**
 * Checks the status of the booth (LOCKED vs UNLOCKED).
 */
export async function checkBoothStatus(boothId: string): Promise<BoothStatusResponse> {
  const res = await fetch(`${API_BASE}/voting-sessions/booth/${boothId}/status`, {
    method: "GET",
  });
  if (!res.ok) {
    throw new Error("Gagal memeriksa status bilik.");
  }
  return res.json();
}

/**
 * Retrieves the active voting session using the token.
 */
export async function getBoothSessionByToken(token: string, boothId: string): Promise<ActiveSessionResponse> {
  const res = await fetch(`${API_BASE}/voting-sessions/booth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, boothId }),
  });
  if (!res.ok) {
    throw new Error("Gagal mengambil status sesi voting aktif di TPS.");
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
