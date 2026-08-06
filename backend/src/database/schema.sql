-- Schema for Krandon E-Voting (updated to exact specs: Name 50, Email 50, URL/Paths 100)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS elections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(50) NOT NULL,
  election_type VARCHAR(50),
  region_name VARCHAR(50),
  voting_date VARCHAR(10),
  status VARCHAR(20) DEFAULT 'DRAFT',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  tps_number VARCHAR(20),
  tps_code VARCHAR(30),
  province VARCHAR(50),
  city_regency VARCHAR(50),
  district VARCHAR(50),
  village VARCHAR(50),
  address TEXT,
  status VARCHAR(20) DEFAULT 'DRAFT',
  male_dpt INTEGER DEFAULT 0,
  female_dpt INTEGER DEFAULT 0,
  opened_at DATETIME,
  closed_at DATETIME,
  registered_voters_total INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tps_code_nocase ON tps(tps_code COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS voters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  tps_id INTEGER NOT NULL,
  dpt_number VARCHAR(50),
  full_name VARCHAR(50) NOT NULL,
  address VARCHAR(100),
  gender VARCHAR(10) DEFAULT 'M',
  is_disability INTEGER DEFAULT 0,
  nik_masked VARCHAR(50),
  status VARCHAR(20) DEFAULT 'REGISTERED',
  voted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
  FOREIGN KEY (tps_id) REFERENCES tps(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_voters_tps ON voters(tps_id);
CREATE INDEX IF NOT EXISTS idx_voters_status ON voters(tps_id, status);

CREATE TABLE IF NOT EXISTS candidate_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  ballot_number INTEGER,
  candidate_name VARCHAR(50),
  vice_candidate_name VARCHAR(50),
  coalition_name VARCHAR(50),
  vision_summary TEXT,
  motto TEXT,
  vision TEXT,
  mission TEXT,
  education TEXT,
  career_path TEXT,
  photo_url VARCHAR(100),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  is_deleted INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(50) NOT NULL,
  acronym VARCHAR(20) NOT NULL,
  logo_url VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paslon_parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paslon_id INTEGER NOT NULL,
  party_id INTEGER NOT NULL,
  election_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paslon_id) REFERENCES candidate_pairs(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
  UNIQUE(party_id, election_id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(50) NOT NULL,
  full_name VARCHAR(50),
  email VARCHAR(50) UNIQUE,
  password_hash VARCHAR(60),
  role VARCHAR(30),
  affiliation VARCHAR(50),
  nik VARCHAR(16),
  assigned_tps_id INTEGER,
  device_id VARCHAR(50),
  public_key TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_tps_id) REFERENCES tps(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS voting_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  tps_id INTEGER NOT NULL,
  token VARCHAR(32) UNIQUE NOT NULL,
  booth_id VARCHAR(20),
  voter_gender VARCHAR(10) DEFAULT 'L',
  is_disability INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'PENDING',
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
  voters_male_voted INTEGER DEFAULT 0,
  voters_female_voted INTEGER DEFAULT 0,
  total_valid_votes INTEGER DEFAULT 0,
  total_invalid_votes INTEGER DEFAULT 0,
  validation_status VARCHAR(30) DEFAULT 'NOT_VALIDATED',
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
  vote_total_in_words VARCHAR(50),
  FOREIGN KEY (recap_id) REFERENCES tps_recaps(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_pair_id) REFERENCES candidate_pairs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  tps_id INTEGER,
  recap_id INTEGER,
  document_type VARCHAR(30),
  generated_pdf_path VARCHAR(100),
  uploaded_signed_file_path VARCHAR(100),
  signed_file_hash_sha256 VARCHAR(64),
  qr_payload TEXT,
  status VARCHAR(30) DEFAULT 'NOT_GENERATED',
  generated_at DATETIME,
  signed_file_uploaded_at DATETIME,
  signed_file_original_name VARCHAR(50),
  signed_file_stored_name VARCHAR(50),
  signed_file_mime_type VARCHAR(50),
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
  status VARCHAR(30) DEFAULT 'PENDING',
  note TEXT,
  evidence_file_path VARCHAR(100),
  evidence_file_original_name VARCHAR(50),
  evidence_file_mime_type VARCHAR(50),
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
  document_hash VARCHAR(64),
  audit_log_hash VARCHAR(64),
  transaction_hash VARCHAR(66),
  contract_address VARCHAR(42),
  chain_id INTEGER,
  finalized_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER,
  tps_id INTEGER,
  actor_user_id INTEGER,
  actor_email VARCHAR(50),
  actor_role VARCHAR(30),
  actor_display VARCHAR(50),
  action VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id INTEGER,
  description TEXT,
  metadata_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kpps_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tps_id INTEGER NOT NULL,
  full_name VARCHAR(50) NOT NULL,
  nik VARCHAR(16),
  position VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tps_id) REFERENCES tps(id) ON DELETE CASCADE
);
