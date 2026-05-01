// Local Storage utilities for e-voting system

export interface Voter {
  nik: string;
  name: string;
  dob: string;
  hasVoted: boolean;
  votedFor?: string;
  anomaly?: string;
  tps?: string;
}

export interface Candidate {
  id: string;
  name: string;
  description: string;
  voteCount: number;
}

export interface Admin {
  email: string;
  password: string;
}

const VOTERS_KEY = 'evoting_voters';
const CANDIDATES_KEY = 'evoting_candidates';
const ADMIN_KEY = 'evoting_admin';

// Initialize mock data
export const initializeMockData = () => {
  if (!localStorage.getItem(VOTERS_KEY)) {
    const tpsOptions = ['TPS 01', 'TPS 02', 'TPS 03'];
    const mockVoters: Voter[] = [
      { nik: '3301012001850001', name: 'Budi Santoso', dob: '1985-01-20', hasVoted: false, tps: 'TPS 01' },
      { nik: '3301022002900002', name: 'Siti Aminah', dob: '1990-02-20', hasVoted: false, tps: 'TPS 01' },
      { nik: '3301032003920003', name: 'Ahmad Wijaya', dob: '1992-03-20', hasVoted: false, tps: 'TPS 01' },
      { nik: '3301042004880004', name: 'Dewi Lestari', dob: '1988-04-20', hasVoted: false, tps: 'TPS 02' },
      { nik: '3301052005910005', name: 'Eko Prasetyo', dob: '1991-05-20', hasVoted: false, tps: 'TPS 02' },
      { nik: '3301062006930006', name: 'Fitri Handayani', dob: '1993-06-20', hasVoted: false, tps: 'TPS 02' },
      { nik: '3301072007890007', name: 'Gunawan Setiawan', dob: '1989-07-20', hasVoted: false, tps: 'TPS 03' },
      // Duplicate NIK for anomaly detection
      { nik: '3301012001850001', name: 'Budi Palsu', dob: '1985-01-20', hasVoted: false, anomaly: 'Duplicate NIK', tps: 'TPS 01' },
      // Invalid age for anomaly detection
      { nik: '3301082008200008', name: 'Anak Kecil', dob: '2020-08-20', hasVoted: false, anomaly: 'Invalid Age', tps: 'TPS 03' },
      { nik: '3301092009190009', name: 'Orang Tua', dob: '1900-09-20', hasVoted: false, anomaly: 'Invalid Age', tps: 'TPS 03' },
    ];
    localStorage.setItem(VOTERS_KEY, JSON.stringify(mockVoters));
  }

  if (!localStorage.getItem(CANDIDATES_KEY)) {
    const mockCandidates: Candidate[] = [
      { id: 'candidate-a', name: 'H. Supriyadi, S.Sos', description: 'Calon Kepala Desa dengan pengalaman 10 tahun di pemerintahan desa. Fokus pada pembangunan infrastruktur dan peningkatan ekonomi warga.', voteCount: 0 },
      { id: 'candidate-b', name: 'Drs. Bambang Hartono', description: 'Pengusaha lokal yang berkomitmen memajukan UMKM desa. Visi: Desa Krandon mandiri dan sejahtera.', voteCount: 0 },
      { id: 'candidate-c', name: 'Hj. Sri Wahyuni, M.Pd', description: 'Mantan kepala sekolah dengan dedikasi tinggi. Prioritas: pendidikan, kesehatan, dan pemberdayaan perempuan.', voteCount: 0 },
    ];
    localStorage.setItem(CANDIDATES_KEY, JSON.stringify(mockCandidates));
  }

  if (!localStorage.getItem(ADMIN_KEY)) {
    const admin: Admin = {
      email: 'admin@desa.go.id',
      password: 'admin123',
    };
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  }
};

// Voter operations
export const getVoters = (): Voter[] => {
  const data = localStorage.getItem(VOTERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getVoterByNIK = (nik: string, dob: string): Voter | null => {
  const voters = getVoters();
  const voter = voters.find(v => v.nik === nik && v.dob === dob);
  return voter || null;
};

export const updateVoter = (nik: string, updates: Partial<Voter>) => {
  const voters = getVoters();
  const index = voters.findIndex(v => v.nik === nik);
  if (index !== -1) {
    voters[index] = { ...voters[index], ...updates };
    localStorage.setItem(VOTERS_KEY, JSON.stringify(voters));
  }
};

export const detectAnomalies = (): void => {
  const voters = getVoters();
  const nikCounts: { [key: string]: number } = {};

  voters.forEach(voter => {
    // Count NIK duplicates
    nikCounts[voter.nik] = (nikCounts[voter.nik] || 0) + 1;

    // Check age validity
    const age = new Date().getFullYear() - new Date(voter.dob).getFullYear();
    if (age < 17 || age > 120) {
      voter.anomaly = 'Invalid Age';
    } else if (nikCounts[voter.nik] > 1) {
      voter.anomaly = 'Duplicate NIK';
    } else {
      delete voter.anomaly;
    }
  });

  localStorage.setItem(VOTERS_KEY, JSON.stringify(voters));
};

// Candidate operations
export const getCandidates = (): Candidate[] => {
  const data = localStorage.getItem(CANDIDATES_KEY);
  return data ? JSON.parse(data) : [];
};

export const updateCandidateVote = (candidateId: string) => {
  const candidates = getCandidates();
  const candidate = candidates.find(c => c.id === candidateId);
  if (candidate) {
    candidate.voteCount += 1;
    localStorage.setItem(CANDIDATES_KEY, JSON.stringify(candidates));
  }
};

export const addCandidate = (candidate: Omit<Candidate, 'voteCount'>) => {
  const candidates = getCandidates();
  candidates.push({ ...candidate, voteCount: 0 });
  localStorage.setItem(CANDIDATES_KEY, JSON.stringify(candidates));
};

export const deleteCandidate = (id: string) => {
  const candidates = getCandidates();
  const filtered = candidates.filter(c => c.id !== id);
  localStorage.setItem(CANDIDATES_KEY, JSON.stringify(filtered));
};

// Admin operations
export const validateAdmin = (email: string, password: string): boolean => {
  const data = localStorage.getItem(ADMIN_KEY);
  if (!data) return false;
  const admin: Admin = JSON.parse(data);
  return admin.email === email && admin.password === password;
};

// Reset all data
export const resetAllData = () => {
  localStorage.removeItem(VOTERS_KEY);
  localStorage.removeItem(CANDIDATES_KEY);
  initializeMockData();
  detectAnomalies();
};

// Statistics
export const getStatistics = () => {
  const voters = getVoters();
  const candidates = getCandidates();

  return {
    totalVoters: voters.length,
    totalVotes: voters.filter(v => v.hasVoted).length,
    totalAnomalies: voters.filter(v => v.anomaly).length,
    candidates: candidates.map(c => ({
      name: c.name,
      votes: c.voteCount,
    })),
  };
};

// Get unique TPS list
export const getTpsList = (): string[] => {
  const voters = getVoters();
  const tpsSet = new Set(voters.map(v => v.tps).filter(Boolean) as string[]);
  return Array.from(tpsSet).sort();
};

// Get statistics filtered by TPS
export const getStatisticsByTps = (tps?: string) => {
  const voters = getVoters();
  const candidates = getCandidates();
  const filteredVoters = tps ? voters.filter(v => v.tps === tps) : voters;

  // Count votes per candidate from filtered voters
  const voteCounts: Record<string, number> = {};
  candidates.forEach(c => { voteCounts[c.id] = 0; });
  filteredVoters.forEach(v => {
    if (v.hasVoted && v.votedFor) {
      voteCounts[v.votedFor] = (voteCounts[v.votedFor] || 0) + 1;
    }
  });

  const totalVotes = filteredVoters.filter(v => v.hasVoted).length;

  return {
    totalRegistered: filteredVoters.length,
    totalVotes,
    participation: filteredVoters.length > 0 ? ((totalVotes / filteredVoters.length) * 100).toFixed(1) : '0',
    candidates: candidates.map(c => ({
      id: c.id,
      name: c.name,
      votes: tps ? voteCounts[c.id] : c.voteCount,
      percentage: totalVotes > 0 ? (((tps ? voteCounts[c.id] : c.voteCount) / totalVotes) * 100).toFixed(1) : '0',
    })),
  };
};
