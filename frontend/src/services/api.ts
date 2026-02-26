export const API_BASE = "http://localhost:5000";

export async function getCandidates() {
  const res = await fetch(`${API_BASE}/candidates`);
  if (!res.ok) throw new Error("Failed to fetch candidates");
  return res.json();
}