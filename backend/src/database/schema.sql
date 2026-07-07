-- Schema for Krandon E-Voting (initial)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS elections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  election_type TEXT,
  region_name TEXT,
  voting_date TEXT,
  status TEXT DEFAULT 'DRAFT',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  tps_number TEXT,
  tps_code TEXT,
  province TEXT,
  city_regency TEXT,
  district TEXT,
  village TEXT,
  address TEXT,
  status TEXT DEFAULT 'DRAFT',
  registered_voters_total INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidate_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  ballot_number INTEGER,
  candidate_name TEXT,
  vice_candidate_name TEXT,
  coalition_name TEXT,
  vision_summary TEXT,
  motto TEXT,
  vision TEXT,
  mission TEXT,
  education TEXT,
  career_path TEXT,
  photo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  full_name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT,
  affiliation TEXT,
  assigned_tps_id INTEGER,
  status TEXT DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_tps_id) REFERENCES tps(id) ON DELETE SET NULL
);

-- Optional tables for future use (no business logic implemented in this branch)
CREATE TABLE IF NOT EXISTS voting_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  tps_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  booth_id TEXT,
  status TEXT DEFAULT 'PENDING',
  expires_at DATETIME,
  used_at DATETIME,
  created_by_user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
  FOREIGN KEY (tps_id) REFERENCES tps(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  tps_id INTEGER NOT NULL,
  candidate_pair_id INTEGER NOT NULL,
  session_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
  FOREIGN KEY (tps_id) REFERENCES tps(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_pair_id) REFERENCES candidate_pairs(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES voting_sessions(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_session_id ON votes(session_id);

CREATE TABLE IF NOT EXISTS tps_recaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  tps_id INTEGER NOT NULL,
  total_registered_voters INTEGER DEFAULT 0,
  total_verified_voters INTEGER DEFAULT 0,
  total_valid_votes INTEGER DEFAULT 0,
  total_invalid_votes INTEGER DEFAULT 0,
  validation_status TEXT DEFAULT 'NOT_VALIDATED',
  generated_at DATETIME,
  generated_by_user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
  FOREIGN KEY (tps_id) REFERENCES tps(id) ON DELETE CASCADE,
  FOREIGN KEY (generated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tps_recap_candidate_totals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recap_id INTEGER NOT NULL,
  candidate_pair_id INTEGER NOT NULL,
  vote_total INTEGER DEFAULT 0,
  vote_total_in_words TEXT,
  FOREIGN KEY (recap_id) REFERENCES tps_recaps(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_pair_id) REFERENCES candidate_pairs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  tps_id INTEGER,
  recap_id INTEGER,
  document_type TEXT,
  generated_pdf_path TEXT,
  uploaded_signed_file_path TEXT,
  signed_file_hash_sha256 TEXT,
  qr_payload TEXT,
  status TEXT DEFAULT 'NOT_GENERATED',
  generated_at DATETIME,
  signed_file_uploaded_at DATETIME,
  signed_file_original_name TEXT,
  signed_file_stored_name TEXT,
  signed_file_mime_type TEXT,
  signed_file_size_bytes INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS witness_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  tps_id INTEGER NOT NULL,
  witness_user_id INTEGER,
  candidate_pair_id INTEGER,
  status TEXT DEFAULT 'PENDING',
  note TEXT,
  evidence_file_path TEXT,
  evidence_file_original_name TEXT,
  evidence_file_mime_type TEXT,
  evidence_file_size_bytes INTEGER,
  signed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
  FOREIGN KEY (tps_id) REFERENCES tps(id) ON DELETE CASCADE,
  FOREIGN KEY (witness_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (candidate_pair_id) REFERENCES candidate_pairs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS blockchain_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  tps_id INTEGER NOT NULL,
  recap_id INTEGER,
  document_hash TEXT,
  audit_log_hash TEXT,
  transaction_hash TEXT,
  contract_address TEXT,
  chain_id INTEGER,
  finalized_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER,
  tps_id INTEGER,
  actor_user_id INTEGER,
  actor_email TEXT,
  actor_role TEXT,
  actor_display TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id INTEGER,
  description TEXT,
  metadata_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
