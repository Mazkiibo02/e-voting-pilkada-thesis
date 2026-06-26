export const API_BASE = `${import.meta.env.VITE_API_BASE_URL}`;

export async function getCandidates() {
  const res = await fetch(`${API_BASE}/candidates`);
  if (!res.ok) throw new Error("Failed to fetch candidates");
  return res.json();
}