# Gap Analysis: Current vs Target Architecture

**Document Date:** 2026-06-13  
**Analysis Based On:** PRD.md and ARCHITECTURE_E_VOTING.md  
**Scope:** Complete gap analysis between implemented features and required Pilkada e-voting system  

---

## 1. Target Architecture Summary

### Target System Design (from ARCHITECTURE_E_VOTING.md and PRD.md)

**Core Concept:** Hybrid local-first TPS-based e-voting with blockchain-anchored final results

```
Frontend (React/Vite)
    ↓
Express Backend (TypeScript)
    ↓
SQLite Database (local-first)
    ↓
Hardhat Blockchain (finalization only)
```

**Key Principles:**
1. ✅ Pilkada-level voting (not village head)
2. ✅ Physical TPS preserved (voters come to booth)
3. ✅ Digital voting replaces paper ballots
4. ✅ Local-first operation (no internet dependency)
5. ✅ Temporary voting sessions (not permanent voter login)
6. ✅ Automatic recap generation
7. ✅ C.Hasil-KWK-inspired PDF forms
8. ✅ Witness verification
9. ✅ Blockchain stores only final TPS results + hashes
10. ✅ Public transparency dashboard

---

## 2. Current vs Target Comparison

### 2.1 Architecture Layer Comparison

| Layer | Current | Target | Gap |
|-------|---------|--------|-----|
| **Frontend** | React + Vite ✅ | React + Vite ✅ | None |
| **Backend** | Express ✅ | Express ✅ | None |
| **Language** | TypeScript ✅ | TypeScript ✅ | None |
| **Database** | localStorage + JSON files ❌ | SQLite ❌ | **Critical:** SQLite missing |
| **Blockchain** | Hardhat local ✅ | Hardhat local ✅ | None |
| **Package Mgr** | npm ✅ | npm ✅ | None |

### 2.2 Core Feature Comparison

| Feature | Current | Target | Gap | Priority |
|---------|---------|--------|-----|----------|
| **Voter Authentication** | Permanent NIK login ❌ | Temporary voting sessions ❌ | **HIGH:** Session system missing | 🔴 |
| **Role-Based Access** | None ❌ | Admin, KPPS, Witness ❌ | **HIGH:** Authorization system missing | 🔴 |
| **TPS Management** | Single TPS (ID=1) ❌ | Multi-TPS with full CRUD ❌ | **HIGH:** TPS module missing | 🔴 |
| **Vote Storage** | Individual votes on blockchain ❌ | Local votes, final batch on blockchain ❌ | **HIGH:** Storage architecture wrong | 🔴 |
| **Recap Generation** | None ❌ | Server-side validation ❌ | **HIGH:** Recap module missing | 🔴 |
| **PDF Form Generation** | None ❌ | C.Hasil-KWK-inspired PDF ❌ | **HIGH:** Document generation missing | 🔴 |
| **Document Upload** | None ❌ | SHA-256 hashing ❌ | **HIGH:** File handling missing | 🔴 |
| **Witness Verification** | None ❌ | Approval/objection/evidence ❌ | **HIGH:** Witness module missing | 🔴 |
| **Blockchain Finalization** | Per-vote storing ❌ | Batch TPS finalization ❌ | **HIGH:** Finalization logic wrong | 🔴 |
| **Public Transparency** | Partial display ⚠️ | Full dashboard with hashes ⚠️ | **MEDIUM:** Enhancement needed | 🟡 |
| **Anomaly Detection** | K-Means implemented 🚫 | Removed 🚫 | **HIGH:** Should be deleted | 🔴 |

---

## 3. Detailed Gap Analysis by Module

### 3.1 Database Layer Gap

**Current State:**
- ❌ No database
- ❌ Data stored in JSON files (voters.json, tps.json)
- ❌ Frontend uses localStorage
- ❌ No concurrency control
- ❌ No transactions

**Target State:**
- ✅ SQLite database
- ✅ Proper schema with relations
- ✅ Migrations support
- ✅ ACID compliance
- ✅ Support for all entities (Elections, TPS, Voters, Sessions, Votes, Recap, Documents, Witnesses, AuditLogs, BlockchainRecords)

**Gap Analysis:**
- **Files to Create:** database/connection.ts, database/schema.sql, database/migrations/
- **Files to Remove:** dependency on JSON files in services
- **Migration Work:** Parse existing voters.json → SQLite schema
- **Testing:** Need DB initialization tests
- **Risk:** Data migration, concurrent request handling
- **Effort:** 🔴 HIGH - Core infrastructure

---

### 3.2 Authentication & Authorization Gap

**Current State:**
- ✅ JWT implemented but minimal
- ❌ No role-based authorization
- ❌ No KPPS role
- ❌ No Witness role  
- ❌ No permanent admin accounts
- ❌ Voters stored in data files
- ❌ Frontend bypasses backend auth

**Target State:**
- ✅ JWT with role claims
- ✅ RBAC middleware
- ✅ Admin account management
- ✅ KPPS officer accounts
- ✅ Witness accounts
- ✅ Session-based temporary voter access
- ✅ Protected endpoints by role

**Gap Analysis:**

**New Routes Needed:**
```
POST   /api/auth/admin-login
POST   /api/auth/kpps-login
POST   /api/auth/witness-login
POST   /api/auth/logout
GET    /api/auth/me
```

**New Middleware Needed:**
- `requireRole(roles: string[])`
- `requireTpsAssignment()`
- `requireWitnessAssignment()`

**Data Model Changes:**
```
Users table (new):
  - id, email, passwordHash, role, assignedTpsId, status

Session table (new):
  - id, voterId, tpsId, boothId, expiresAt, usedAt, status
```

**Files to Modify:**
- `middleware/auth.ts` - Add authorization checks
- `routes/auth.ts` - Add role-based login endpoints

**Files to Create:**
- `middleware/authorization.ts`
- `routes/users.ts`
- `services/auth.ts` (password hashing, JWT generation)

**Effort:** 🔴 HIGH - Security critical

---

### 3.3 TPS Management Gap

**Current State:**
- ❌ No TPS CRUD
- ❌ Hardcoded TPS ID = 1
- ❌ No TPS assignment to KPPS
- ❌ No TPS status tracking
- ❌ Voters not linked to TPS

**Target State:**
- ✅ Full TPS module
- ✅ Create, read, update TPS data
- ✅ TPS status state machine
- ✅ Voter assignment to TPS
- ✅ KPPS assignment to TPS
- ✅ Multi-TPS voting support

**Gap Analysis:**

**New Schema:**
```sql
Elections:
  id, name, type, province, cityRegency, votingDate, status

TPS:
  id, electionId, tpsNumber, tpsCode, province, cityRegency, 
  district, village, status, registeredVotersTotal, 
  registeredVotersMale, registeredVotersFemale

Voters (renamed from current):
  id, electionId, tpsId, nikHash, displayVoterCode, name, 
  gender, birthDate, isDisability, verificationStatus, hasVoted

Voting Sessions (new):
  id, electionId, tpsId, voterId, boothId, status, expiresAt, usedAt

Votes (renamed from blockchain storage):
  id, electionId, tpsId, candidatePairId, sessionId
```

**New Routes:**
```
GET    /api/elections
POST   /api/elections
GET    /api/elections/:id
PATCH  /api/elections/:id/status

GET    /api/tps
POST   /api/tps
GET    /api/tps/:id
PATCH  /api/tps/:id/status
```

**Frontend Changes Needed:**
- AdminDashboard: Election CRUD UI
- AdminDashboard: TPS CRUD UI
- VoterDashboard: TPS assignment display

**Effort:** 🔴 HIGH - Core domain logic

---

### 3.4 Voting Session Gap

**Current State:**
- ❌ No voting sessions
- ❌ Voter permanent login with NIK
- ❌ No temporary voter access
- ❌ No booth polling
- ❌ No session status tracking

**Target State:**
- ✅ Temporary voting sessions (PENDING → ACTIVE → USED)
- ✅ Session expiration
- ✅ Booth polling (every 1-2 seconds)
- ✅ One voter = one used session
- ✅ No session reuse

**Gap Analysis:**

**New Routes:**
```
POST   /api/voting-sessions (create session after voter verification)
GET    /api/voting-sessions/booth/:boothId/active (booth polling)
POST   /api/voting-sessions/:id/cancel
POST   /api/voting-sessions/:id/expire
```

**Booth Polling Behavior:**
```
Booth Device:
  Every 1-2 seconds:
    GET /api/voting-sessions/booth/:boothId/active
    
  If session found and ACTIVE:
    Display candidates
    Listen for vote selection
    
  On vote confirmation:
    POST /api/votes/cast with { sessionId, candidatePairId }
    Mark session as USED
    Return to waiting screen
```

**Frontend Components Needed:**
- New "BoothLayout" for voting booth device
- Booth candidate selector UI
- Booth waiting screen
- Booth voting confirmation modal
- Booth success screen

**Backend Services Needed:**
- voting-sessions service for CRUD
- session expiration handler
- booth endpoint security (TPS isolation)

**Effort:** 🔴 HIGH - Core voting flow

---

### 3.5 Vote Casting & Storage Gap

**Current State:**
- ❌ Vote submitted directly to blockchain per cast
- ❌ Voter stores vote in localStorage
- ❌ No server-side validation
- ❌ No duplicate prevention at blockchain level
- ❌ Blockchain is "real-time vote ledger" (wrong model)

**Target State:**
- ✅ Votes stored locally in SQLite
- ✅ One session = one vote maximum
- ✅ Server-side duplicate prevention
- ✅ Final TPS result batched to blockchain
- ✅ Blockchain is "finalization ledger" only

**Gap Analysis:**

**Vote Casting Route:**
```
POST /api/votes/cast (protected, requires session)
  Input: { sessionId, candidatePairId }
  Validation:
    - Session exists and is ACTIVE
    - Session hasn't been used
    - Candidate exists
    - Not already voted in this election (voter-level)
  Action:
    - Create vote record
    - Mark session as USED
    - Return success
```

**Duplicate Prevention:**
```sql
CREATE UNIQUE INDEX idx_one_vote_per_session
ON votes(sessionId);

-- Ensures max 1 vote per session
```

**Database Table:**
```sql
Votes:
  id INT PRIMARY KEY
  electionId INT
  tpsId INT
  candidatePairId INT
  sessionId INT UNIQUE
  createdAt TIMESTAMP
```

**Files to Modify:**
- `routes/votes.ts` - Complete rewrite for new flow
- `services/blockchain.ts` - Remove per-vote casting

**Files to Create:**
- `services/voting-sessions.ts`
- `services/votes.ts`

**Effort:** 🔴 HIGH - Critical voting logic

---

### 3.6 Recap Generation & Validation Gap

**Current State:**
- ❌ No recap generation
- ❌ No validation logic
- ❌ No recap storage
- ❌ Vote counts manually calculated by blockchain

**Target State:**
- ✅ Server-side recap generation
- ✅ Validation against PRD rules:
  - sum(candidate_votes) == total_valid_votes
  - total_valid_votes <= verified_voters
  - verified_voters <= registered_voters
  - each session used at most once
- ✅ Recap stored in database
- ✅ TPS status transitions (CLOSED → RECAP_GENERATED)

**Gap Analysis:**

**Recap Rules (from ARCHITECTURE section 10):**
```
1. sum(candidate_pair_vote_totals) == total_valid_votes ✅
2. total_valid_votes <= total_verified_voters ✅
3. total_verified_voters <= total_registered_voters ✅
4. each voting session is used at most once ✅
5. each used voting session has exactly one vote ✅
6. signed result form exists (later) ⚠️
7. document hash exists (later) ⚠️
```

**New Routes:**
```
GET  /api/recap/tps/:tpsId
POST /api/recap/tps/:tpsId/generate (KPPS role required)
POST /api/recap/tps/:tpsId/validate
```

**Database Tables:**
```sql
TpsRecap:
  id, electionId, tpsId, totalRegisteredVoters, totalVerifiedVoters,
  totalValidVotes, totalInvalidVotes, totalVotes, validationStatus,
  generatedAt, generatedByUserId

TpsRecapCandidateTotal:
  id, recapId, candidatePairId, voteTotal, voteTotalInWords
```

**Service Logic:**
```typescript
function generateRecap(tpsId: uint256) {
  const votes = db.votes.where({ tpsId });
  const candidates = db.candidates.all();
  
  const candidateTotals = candidates.map(c => ({
    candidateId: c.id,
    total: votes.filter(v => v.candidatePairId === c.id).length
  }));
  
  const totalValid = sum(candidateTotals.map(ct => ct.total));
  const verifiedVoters = db.voters.where({ tpsId, verified: true }).count();
  const registeredVoters = db.voters.where({ tpsId }).count();
  
  return {
    candidateTotals,
    totalValid,
    verifiedVoters,
    registeredVoters,
    isValid: validateRules(...)
  };
}
```

**Files to Create:**
- `services/recap.ts`
- `routes/recap.ts`

**Frontend Components Needed:**
- KPPS: Recap review page
- KPPS: Validation checklist UI
- KPPS: Download form button
- Admin: Recap monitoring dashboard

**Effort:** 🔴 HIGH - Critical business logic

---

### 3.7 Document Generation Gap

**Current State:**
- ❌ No PDF generation
- ❌ No C.Hasil-KWK form
- ❌ No form download
- ❌ No QR code generation

**Target State:**
- ✅ Server-side PDF generation
- ✅ C.Hasil-KWK-inspired form structure
- ✅ Auto-filled with election/TPS/result data
- ✅ Signature areas
- ✅ QR payload field
- ✅ Hash placeholder fields
- ✅ Download endpoint

**Gap Analysis:**

**Form Sections (from ARCHITECTURE section 11.2):**
1. Header (election name, type, province, city, TPS code)
2. Officer metadata (name, time, generated timestamp)
3. Voter participation (DPT male/female, verified, etc.)
4. Digital voting usage (sessions created, used, cancelled)
5. Candidate pair results (ballot number, names, party, votes)
6. Valid/invalid vote summary
7. Signature areas (KPPS, witnesses)
8. Security area (doc ID, QR, hash fields)

**Recommended Library:**
- pdfkit (simple, stable, structured layout support)
- Alternative: pdf-lib (more control)
- Alternative: puppeteer (HTML-to-PDF, adds complexity)

**New Routes:**
```
GET  /api/documents/tps/:tpsId/form
POST /api/documents/tps/:tpsId/generate-form
GET  /api/documents/:id/download
```

**Database Table:**
```sql
Documents:
  id, electionId, tpsId, recapId, documentType,
  generatedPdfPath, uploadedSignedFilePath, fileHash, qrPayload,
  status, generatedAt, uploadedAt
```

**Document Types:**
- CHASIL_KWK_INSPIRED_RESULT_FORM (generated)
- SIGNED_RESULT_FORM (uploaded)

**Files to Create:**
- `services/documents.ts` (PDF generation)
- `routes/documents.ts`
- `utils/pdf-templates.ts` (form structure)

**Frontend Components:**
- KPPS: Form preview page
- KPPS: Download button
- KPPS: Print UI helpers

**Effort:** 🔴 HIGH - User-facing feature

---

### 3.8 Document Upload & Hashing Gap

**Current State:**
- ❌ No file upload handling
- ❌ No SHA-256 hashing
- ❌ No file storage
- ❌ No document metadata

**Target State:**
- ✅ File upload endpoint
- ✅ SHA-256 hash generation (server-side)
- ✅ MIME type validation
- ✅ File size limits
- ✅ Secure file storage (outside public root)
- ✅ Document metadata storage

**Gap Analysis:**

**Upload Endpoint:**
```
POST /api/documents/tps/:tpsId/upload-signed
  Input: multipart/form-data with file
  Validation:
    - File size <= 10MB (configurable)
    - MIME type in [application/pdf, image/jpeg, image/png]
    - TPS exists and belongs to authenticated user's organization
  Processing:
    1. Save file to /uploads/{tpsId}/{timestamp}-{filename}
    2. Calculate SHA-256 hash of file bytes
    3. Create document record in database
    4. Return { documentId, hash, mimeType, size }
```

**Middleware Needed:**
- `upload.middleware.ts` - File upload handling
- File size limit enforcement
- MIME type validation

**Dependencies:**
- `multer` (file upload handling)
- `crypto` (built-in Node.js for SHA-256)
- Or `crypto-js` library

**Environment Variables:**
```
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=10
```

**Database Columns:**
```sql
Documents:
  uploadedSignedFilePath VARCHAR
  fileHash VARCHAR(64)  -- SHA-256 hex
  uploadedBy INT
  uploadedAt TIMESTAMP
```

**Files to Create/Modify:**
- Create: `middleware/upload.ts`
- Create: `services/hashing.ts`
- Modify: `routes/documents.ts`

**Security Considerations:**
- ✅ Sanitize file names
- ✅ Do not execute uploaded files
- ✅ Store outside public frontend folder
- ✅ Hash verification for integrity
- ❌ Cannot detect pre-upload manipulation (documented limitation)

**Effort:** 🟡 MEDIUM - Standard file handling

---

### 3.9 Witness Verification Gap

**Current State:**
- ❌ No witness role
- ❌ No witness dashboard
- ❌ No approval/objection mechanism
- ❌ No evidence upload
- ❌ No witness status tracking

**Target State:**
- ✅ Witness role (SAKSI_PARPOL)
- ✅ Witness assignment to TPS or candidate pair
- ✅ Witness dashboard showing assigned TPS
- ✅ Approval and objection UI
- ✅ Evidence upload capability
- ✅ Witness status: PENDING, APPROVED, OBJECTED, ABSENT, NO_RESPONSE

**Gap Analysis:**

**New Routes:**
```
GET  /api/witness/tps (get assigned TPS list)
GET  /api/witness/tps/:tpsId (get recap for verification)
POST /api/witness/tps/:tpsId/approve
POST /api/witness/tps/:tpsId/object (with optional note)
POST /api/witness/tps/:tpsId/evidence (file upload)
```

**Database Tables:**
```sql
Witnesses:
  id, electionId, userId, assignedTpsId, assignedCandidatePairId

WitnessVerification:
  id, electionId, tpsId, witnessUserId, candidatePairId,
  status (PENDING|APPROVED|OBJECTED|ABSENT|NO_RESPONSE),
  note, evidenceFilePath, signedAt, createdAt
```

**Key Requirement (PRD section 16):**
- ✅ Witnesses can approve or object
- ✅ Witnesses can upload evidence
- ✅ Witnesses can add digital verification/signature
- ❌ Witnesses CANNOT modify vote totals
- ❌ Finalization does NOT require all witnesses to approve
  - Witness statuses recorded but not blocking
  - Handles ABSENT, NO_RESPONSE cases

**Frontend Components Needed:**
- New layout: WitnessLayout
- New pages: WitnessDashboard, TpsRecapDetail, WitnessForm
- Evidence upload modal
- Approval/objection confirmation dialogs

**Files to Create:**
- `routes/witness.ts`
- `services/witness.ts`

**Effort:** 🔴 HIGH - New feature module

---

### 3.10 Blockchain Finalization Gap

**Current State:**
- ❌ Individual votes sent to blockchain
- ❌ No final TPS result concept
- ❌ Contract has no access control
- ❌ Contract has no finalization function
- ❌ No document/audit hash storage
- ❌ Votes stored on-chain with TPS+candidateId mappings

**Target State:**
- ✅ Blockchain stores final TPS results only
- ✅ Contract prevents duplicate finalization
- ✅ Contract stores: result totals, document hash, audit log hash
- ✅ Contract emits finalization event
- ✅ Backend stores transaction hash
- ✅ Admin or authorized KPPS can finalize

**Gap Analysis:**

**Smart Contract Refactor:**

Current:
```solidity
mapping(uint256 => mapping(uint256 => uint256)) votes;  // [tpsId][candidateId]
event VoteCast(uint256 tpsId, uint256 candidateId, uint256 timestamp);
```

Target:
```solidity
struct CandidateResult {
  uint256 candidatePairId;
  uint256 voteTotal;
}

struct TpsFinalResult {
  uint256 electionId;
  uint256 tpsId;
  uint256 totalRegisteredVoters;
  uint256 totalVerifiedVoters;
  uint256 totalValidVotes;
  uint256 totalInvalidVotes;
  string documentHash;
  string auditLogHash;
  uint256 finalizedAt;
  bool finalized;
}

mapping(uint256 => mapping(uint256 => TpsFinalResult)) finalResults;
  // [electionId][tpsId]

event TpsFinalized(
  uint256 indexed electionId,
  uint256 indexed tpsId,
  string documentHash,
  string auditLogHash,
  uint256 finalizedAt
);

function finalizeTps(
  uint256 electionId,
  uint256 tpsId,
  uint256[] candidatePairIds,
  uint256[] voteTotals,
  uint256 totalRegistered,
  uint256 totalVerified,
  uint256 totalValid,
  uint256 totalInvalid,
  string memory documentHash,
  string memory auditLogHash
) public {
  require(!finalResults[electionId][tpsId].finalized, "Already finalized");
  
  // Store result...
  // Emit event...
}

function getTpsFinalResult(uint256 electionId, uint256 tpsId) 
  public view returns (TpsFinalResult) {
  return finalResults[electionId][tpsId];
}
```

**New Backend Routes:**
```
POST /api/finalization/tps/:tpsId (finalize after witness review)
GET  /api/finalization/tps/:tpsId (get finalization status)
```

**Finalization Process:**
```
1. KPPS/Admin clicks "Finalize TPS"
2. System validates:
   - All required documents uploaded
   - All required signatures present
   - Recap validation passed
   - (Optional: Witness approval)
3. System generates audit log hash
4. System calls blockchain finalizeTps()
5. Backend stores transaction hash
6. TPS status → BLOCKCHAIN_ANCHORED
7. Public dashboard updates
```

**Audit Log Hash Generation:**
```
1. Query all audit logs for TPS
2. Serialize in deterministic order:
   - timestamp, action, userId, entityType, entityId, metadata
3. SHA-256(serialized logs)
4. Store as string in blockchain
```

**Database Table:**
```sql
BlockchainRecords:
  id, electionId, tpsId, recapId, documentHash, auditLogHash,
  transactionHash, contractAddress, chainId, finalizedAt,
  finalizedByUserId
```

**Files to Modify:**
- `blockchain/contracts/EVoting.sol` - Complete rewrite
- `blockchain/scripts/deploy.js` - Update to deploy new contract
- `blockchain/scripts/seedVotes.js` - Delete or repurpose

**Files to Create:**
- `routes/finalization.ts`
- `services/finalization.ts`
- `services/audit.ts` (audit log hash)

**Frontend Components:**
- KPPS: Finalization checklist
- KPPS: Confirm finalization dialog
- Admin: Finalization status dashboard
- Public: Blockchain hash display

**Effort:** 🔴 HIGH - Architecture change

---

### 3.11 Public Transparency Gap

**Current State:**
- ⚠️ PublicResults page exists
- ❌ No document hash display
- ❌ No blockchain transaction hash
- ❌ No finalization status
- ❌ No integrity proof

**Target State:**
- ✅ Vote totals per TPS
- ✅ Vote totals per candidate pair
- ✅ Election summary
- ✅ TPS finalization status
- ✅ Document hash display
- ✅ Blockchain transaction hash
- ✅ Read-only (no modifications)

**Gap Analysis:**

**Public Routes:**
```
GET /api/public/results (election overview)
GET /api/public/results/tps/:tpsId (TPS details + hashes)
GET /api/public/results/documents/:documentId/hash (hash verification)
```

**Response Structure:**
```json
{
  "election": {
    "id": 1,
    "name": "Pilkada Provinsi...",
    "type": "GOVERNOR"
  },
  "tps": {
    "id": 1,
    "tpsNumber": "001",
    "location": "Village A, District B"
  },
  "results": {
    "candidatePairs": [
      {
        "id": 1,
        "names": "A & B",
        "party": "Party X",
        "votes": 150
      }
    ],
    "totalValid": 500,
    "totalInvalid": 5,
    "participation": {
      "registered": 1000,
      "verified": 505
    }
  },
  "finalization": {
    "status": "FINALIZED",
    "finalizedAt": "2024-06-15T14:30:00Z",
    "documentHash": "abc123...",
    "auditLogHash": "def456...",
    "transactionHash": "0x789..."
  }
}
```

**Data Sanitization Rules:**
- ❌ Do NOT return raw voter NIK
- ❌ Do NOT return voter birth dates
- ❌ Do NOT return voter addresses
- ❌ Do NOT return internal audit logs
- ✅ Return only aggregated statistics

**Frontend Component Updates:**
- PublicResults: Enhance to show finalization status
- PublicResults: Add hash verification section
- PublicResults: Add blockchain transaction link (block explorer)

**Files to Create:**
- `routes/public.ts`

**Files to Modify:**
- `frontend/src/pages/PublicResults.tsx`

**Effort:** 🟡 MEDIUM - Enhancement

---

### 3.12 Anomaly Detection Removal Gap

**Current State:**
- 🚫 K-Means clustering active (should be removed)
- 🚫 Anomaly detection in backend (anomaly.ts route)
- 🚫 Anomaly badges in voter dashboard UI
- 🚫 Anomaly flags in voter data

**Target State:**
- ✅ K-Means completely removed
- ✅ Anomaly detection completely removed
- ✅ No anomaly UI elements
- ✅ No anomaly data fields

**Gap Analysis:**

**Files to Delete:**
- `backend/src/services/kmeansTPS.ts`
- `backend/src/routes/anomaly.ts`

**Files to Modify:**
- `backend/src/index.ts`:
  - Remove: `import { runKMeansTPS }`
  - Remove: `voters = runKMeansTPS(voters)`
  - Remove: `app.use("/anomaly", anomalyRoutes)`

- `backend/src/data/voters.json`:
  - Remove: `cluster` field
  - Remove: `anomaly` field

- `frontend/src/lib/storage.ts`:
  - Remove: `detectAnomalies()` function
  - Remove: `anomaly` field from Voter interface
  - Remove K-Means documentation

- `frontend/src/pages/Login.tsx`:
  - Remove: `detectAnomalies()` call

- `frontend/src/pages/VoterDashboard.tsx`:
  - Remove: Anomaly badge display
  - Remove: AlertTriangle icon for anomalies

- `frontend/src/pages/AdminDashboard.tsx`:
  - Remove: Anomaly count statistics
  - Remove: Anomaly filtering

- `PROJECT_SUMMARY.md`:
  - Remove: K-Means algorithm section
  - Remove: Anomaly detection explanation

**Testing:**
- Verify anomaly endpoint returns 404
- Verify no K-Means runs on startup
- Verify frontend doesn't display anomaly flags

**Effort:** 🟢 LOW - Pure deletion

---

## 4. Missing Core Modules

### Modules That Need Creation

| Module | Purpose | Status | Estimated Lines |
|--------|---------|--------|------------------|
| `database/` | SQLite initialization | ❌ Missing | ~200 |
| `routes/elections.ts` | Election management | ❌ Missing | ~50 |
| `routes/tps.ts` | TPS CRUD | ❌ Missing | ~80 |
| `routes/candidates.ts` | Candidate pair CRUD | ❌ Missing | ~80 |
| `routes/voters.ts` | Voter/DPT management | ❌ Missing | ~100 |
| `routes/voting-sessions.ts` | Session management | ❌ Missing | ~100 |
| `routes/recap.ts` | Recap generation | ❌ Missing | ~100 |
| `routes/documents.ts` | Form and upload | ❌ Missing | ~120 |
| `routes/witness.ts` | Witness verification | ❌ Missing | ~100 |
| `routes/finalization.ts` | TPS finalization | ❌ Missing | ~80 |
| `routes/public.ts` | Public results | ❌ Missing | ~60 |
| `services/elections.ts` | Election logic | ❌ Missing | ~80 |
| `services/tps.ts` | TPS logic | ❌ Missing | ~100 |
| `services/voting-sessions.ts` | Session logic | ❌ Missing | ~80 |
| `services/recap.ts` | Recap validation | ❌ Missing | ~150 |
| `services/documents.ts` | PDF generation | ❌ Missing | ~200 |
| `services/witness.ts` | Witness logic | ❌ Missing | ~80 |
| `services/finalization.ts` | Finalization logic | ❌ Missing | ~100 |
| `services/audit.ts` | Audit logging | ❌ Missing | ~100 |
| `middleware/authorization.ts` | RBAC middleware | ❌ Missing | ~50 |
| `middleware/upload.ts` | File upload | ❌ Missing | ~60 |

**Total Estimated Code:** ~2,000 new lines of backend logic

---

## 5. Risk Ranking & Priority Matrix

### 🔴 HIGH PRIORITY - Blocking all other work

| Item | Risk | Impact | Effort | Blocker? |
|------|------|--------|--------|----------|
| Database layer (SQLite) | High | Critical | High | YES |
| Authentication & RBAC | High | Critical | High | YES |
| Anomaly detection removal | High | Correctness | Low | YES |
| TPS management module | High | Critical | High | YES |
| Voting sessions system | High | Critical | High | YES |
| Vote storage architecture change | High | Critical | High | YES |

### 🟡 MEDIUM PRIORITY - Can run in parallel

| Item | Risk | Impact | Effort | Blocker? |
|------|------|--------|--------|----------|
| Recap generation | Medium | Important | High | NO |
| PDF document generation | Medium | Important | High | NO |
| Document upload & hashing | Medium | Important | Medium | NO |
| Witness module | Medium | Important | High | NO |
| Blockchain contract refactor | Medium | Important | High | NO |
| Public dashboard enhancement | Medium | Nice-to-have | Medium | NO |

### 🟢 LOW PRIORITY - Polish phase

| Item | Risk | Impact | Effort | Blocker? |
|------|------|--------|--------|----------|
| UI/UX improvements | Low | Polish | Medium | NO |
| Performance optimization | Low | Technical | Medium | NO |
| Error handling refinement | Low | Technical | Low | NO |
| Logging & monitoring | Low | Technical | Medium | NO |

---

## 6. Recommended Implementation Phases

### Phase 0: Foundation (Setup & Preparation)
**Duration:** 1-2 days  
**Deliverables:**
- [ ] Create CURRENT_STATE.md
- [ ] Create GAP_ANALYSIS.md
- [ ] Initialize SQLite schema
- [ ] Set up database migrations
- [ ] Remove K-Means and anomaly detection code
- [ ] Update PROJECT_SUMMARY.md

**Files Affected:**
```
+ database/schema.sql
+ database/migrations/
- backend/src/services/kmeansTPS.ts
- backend/src/routes/anomaly.ts
~ backend/src/index.ts
~ PROJECT_SUMMARY.md
```

**Branch:** `docs/project-audit-prd-architecture` ← **Current**

---

### Phase 1: Core Infrastructure (Database & Auth)
**Duration:** 3-4 days  
**Blocking:** All other phases  
**Deliverables:**
- [ ] SQLite integration
- [ ] Database schema initialization
- [ ] Role-based authentication
- [ ] User management (Admin, KPPS, Witness)
- [ ] JWT with role claims
- [ ] Authorization middleware

**Files Affected:**
```
+ database/connection.ts
+ middleware/authorization.ts
+ services/auth.ts
+ routes/users.ts
+ routes/auth.ts (refactor)
+ env.example
~ backend/src/middleware/auth.ts
~ backend/src/index.ts
```

**Branch:** `feat/database-and-auth`

---

### Phase 2: Election & TPS Management
**Duration:** 2-3 days  
**Depends On:** Phase 1  
**Deliverables:**
- [ ] Election CRUD
- [ ] TPS CRUD with status machine
- [ ] Voter/DPT import and management
- [ ] KPPS assignment to TPS
- [ ] Admin election monitoring dashboard

**Files Affected:**
```
+ routes/elections.ts
+ routes/tps.ts
+ routes/voters.ts
+ services/elections.ts
+ services/tps.ts
+ services/voters.ts
```

**Branch:** `feat/elections-and-tps-management`

---

### Phase 3: Voting Session & Vote Casting
**Duration:** 3-4 days  
**Depends On:** Phase 1, 2  
**Deliverables:**
- [ ] Temporary voting sessions (not permanent login)
- [ ] Voter verification flow (KPPS officer)
- [ ] Booth polling endpoint (1-2 second intervals)
- [ ] Vote casting with duplicate prevention
- [ ] Session state machine (PENDING → ACTIVE → USED)
- [ ] Booth UI for voting (ReactComponents)

**Files Affected:**
```
+ routes/voting-sessions.ts
+ routes/votes.ts (complete rewrite)
+ services/voting-sessions.ts
+ services/votes.ts
+ frontend/src/components/BoothLayout.tsx
+ frontend/src/pages/BoothDashboard.tsx
~ frontend/src/pages/VoterDashboard.tsx (refactor to KPPS flow)
```

**Branch:** `feat/voting-sessions-and-voting`

---

### Phase 4: Recap Generation & Validation
**Duration:** 2-3 days  
**Depends On:** Phase 3  
**Deliverables:**
- [ ] TPS recap generation with validation rules
- [ ] Recap storage in database
- [ ] Recap review UI for KPPS
- [ ] Validation checklist display
- [ ] TPS status transitions (CLOSED → RECAP_GENERATED)

**Files Affected:**
```
+ routes/recap.ts
+ services/recap.ts
+ frontend/src/pages/RecapReviewPage.tsx
```

**Branch:** `feat/recap-generation`

---

### Phase 5: Document Generation & Upload
**Duration:** 3-4 days  
**Depends On:** Phase 4  
**Deliverables:**
- [ ] C.Hasil-KWK-inspired PDF generation
- [ ] Form auto-filling with election/TPS/result data
- [ ] Signature areas and QR field
- [ ] File upload endpoint with validation
- [ ] SHA-256 document hashing
- [ ] Document metadata storage

**Files Affected:**
```
+ routes/documents.ts
+ services/documents.ts
+ services/pdf-generator.ts
+ middleware/upload.ts
+ frontend/src/pages/DocumentUploadPage.tsx
+ frontend/src/components/DocumentPreviewModal.tsx
```

**Branch:** `feat/document-generation-and-upload`

---

### Phase 6: Witness Verification
**Duration:** 2-3 days  
**Depends On:** Phase 5  
**Deliverables:**
- [ ] Witness role and dashboard
- [ ] Witness assignment to TPS
- [ ] Recap verification UI
- [ ] Approval/objection mechanism
- [ ] Evidence upload
- [ ] Witness status tracking (PENDING, APPROVED, OBJECTED, etc.)

**Files Affected:**
```
+ routes/witness.ts
+ services/witness.ts
+ frontend/src/layouts/WitnessLayout.tsx
+ frontend/src/pages/WitnessDashboard.tsx
+ frontend/src/pages/TpsRecapDetail.tsx
+ frontend/src/components/WitnessApprovalForm.tsx
```

**Branch:** `feat/witness-verification`

---

### Phase 7: Blockchain Finalization
**Duration:** 2-3 days  
**Depends On:** Phase 6  
**Deliverables:**
- [ ] Refactor EVoting.sol for final result storage
- [ ] Finalization endpoint (TPS → blockchain)
- [ ] Audit log hash generation
- [ ] Transaction hash storage
- [ ] Finalization status tracking
- [ ] Public blockchain hash display

**Files Affected:**
```
~ blockchain/contracts/EVoting.sol (major rewrite)
~ blockchain/scripts/deploy.js
+ routes/finalization.ts
+ services/finalization.ts
+ services/audit.ts
+ frontend/src/pages/FinalizationPage.tsx
```

**Branch:** `feat/blockchain-finalization`

---

### Phase 8: Public Transparency & Reporting
**Duration:** 1-2 days  
**Depends On:** Phase 7  
**Deliverables:**
- [ ] Public results API endpoints
- [ ] Public dashboard with finalization status
- [ ] Document hash verification display
- [ ] Blockchain transaction link
- [ ] Data sanitization (no personal data)

**Files Affected:**
```
+ routes/public.ts
~ frontend/src/pages/PublicResults.tsx
```

**Branch:** `feat/public-transparency`

---

### Phase 9: Testing & QA
**Duration:** 3-5 days  
**Deliverables:**
- [ ] Unit tests for all services
- [ ] Integration tests for voting flow
- [ ] Smart contract tests
- [ ] API endpoint tests
- [ ] Frontend component tests
- [ ] Security audit
- [ ] Manual testing checklist

**Branch:** `test/comprehensive-testing`

---

### Phase 10: Documentation & Demo
**Duration:** 1-2 days  
**Deliverables:**
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Database schema documentation
- [ ] Architecture finalization document
- [ ] Deployment guide
- [ ] Demo script update
- [ ] README update

**Branch:** `docs/final-documentation`

---

## 7. Files Likely Affected by Each Phase

### Phase-by-Phase File Impact Summary

| Phase | Create | Modify | Delete |
|-------|--------|--------|--------|
| 0 | docs | multiple | kmeansTPS.ts, anomaly.ts |
| 1 | database/, auth services | index.ts, auth.ts | - |
| 2 | election/tps routes | index.ts | - |
| 3 | voting routes | votes.ts, frontend pages | - |
| 4 | recap routes | - | - |
| 5 | documents routes, pdf generator | - | - |
| 6 | witness routes | - | - |
| 7 | blockchain routes | EVoting.sol, deploy.js | - |
| 8 | public routes | PublicResults.tsx | - |
| 9 | test files | - | - |
| 10 | docs | README.md, ARCHITECTURE_E_VOTING.md | - |

---

## 8. Terminology Mismatches to Fix

| Current | Target | Where | Notes |
|---------|--------|-------|-------|
| "Desa" (village) | "Pilkada" | Homepage, UI labels | Change election scope |
| "Simulasi Sistem E-Voting" | "Pilkada E-Voting System" | All UIs | Professional naming |
| Direct blockchain voting | TPS-based voting | Architecture | Fundamental shift |
| Voter NIK login | KPPS verification → Session | Auth flow | Temporary access |
| "Terverifikasi Blockchain" | "Verified by KPPS" | VoterDashboard | Accurate claim |
| "Anomali Terdeteksi" | (remove) | UI | Not part of system |
| Individual vote record | Voting session | Data model | Conceptual shift |
| tpsId hardcoded | tpsId dynamic | Backend | Multi-TPS support |

---

## 9. Security & Privacy Gaps

### Critical Security Issues

1. **NIK in JWT Claims**
   - Current: JWT payload contains `{ nik: "3301010001" }`
   - Risk: Visible in logs, network traffic (if not HTTPS), localStorage
   - Fix: Use opaque session tokens, store NIK only server-side

2. **No Access Control on Smart Contract**
   - Current: Anyone can call `castVote()`
   - Risk: External manipulation of vote counts
   - Fix: Add `onlyFinalized()` modifier for voting phase

3. **Hardcoded Secrets in Source**
   - Current: JWT secret "supersecret" visible in auth.ts
   - Risk: Secret reuse across deployments
   - Fix: Move to `.env` file with 'Never commit' rule

4. **Private Key in Project Files**
   - Current: Hardhat default key visible in PROJECT_SUMMARY.md
   - Risk: Account compromise
   - Fix: Use test-only accounts, not documented keys

5. **File Upload Without Validation**
   - Current: (not yet implemented)
   - Risk: Arbitrary file execution, DoS
   - Fix: Strict MIME type, size limits, store outside web root

### Privacy Issues

1. **Voter Birth Date Storage**
   - Current: Stored in voters.json age field
   - Issue: PII exposure
   - Fix: Remove age, hash NIK instead

2. **No Data Deletion Policy**
   - Current: All voter data retained indefinitely
   - Issue: Regulatory (GDPR, POPIA) compliance
   - Fix: Implement post-election purge function

3. **Audit Logs May Contain PII**
   - Current: (not yet implemented)
   - Issue: Audit logs could log NIK or voter names
   - Fix: Sanitize audit log fields, use only IDs

---

## 10. Testing Gaps

### Missing Test Coverage

| Component | Current | Target | Priority |
|-----------|---------|--------|----------|
| Database layer | None | Unit tests | High |
| Auth middleware | None | Unit + integration | High |
| Recap validation | None | Unit tests | High |
| Vote duplicate prevention | None | Integration | High |
| Smart contract | None | Hardhat tests | High |
| Voting flow | None | End-to-end | Medium |
| PDF generation | None | Unit tests | Medium |
| Document hashing | None | Unit tests | Medium |
| Public API sanitization | None | Integration | Medium |

**Recommended Test Framework:** Jest (already familiar with Node/TypeScript projects)

---

## 11. Summary of Gaps

### Gap Count by Category

```
Database:
  ❌ SQLite integration (1)
  ❌ Schema design (1)
  ❌ Migrations (1)
  = 3 gaps

Authentication:
  ❌ Role-based RBAC (1)
  ❌ User management (1)
  ❌ Multiple login endpoints (1)
  = 3 gaps

Core Voting:
  ❌ Voting sessions (1)
  ❌ Booth polling (1)
  ❌ Multi-TPS support (1)
  ❌ Vote storage refactor (1)
  = 4 gaps

Business Logic:
  ❌ Election management (1)
  ❌ TPS management (1)
  ❌ Recap generation (1)
  ❌ Recap validation (1)
  = 4 gaps

Documents:
  ❌ PDF generation (1)
  ❌ File upload (1)
  ❌ Document hashing (1)
  = 3 gaps

Features:
  ❌ Witness module (1)
  ❌ Blockchain finalization (1)
  🚫 Anomaly detection removal (1)
  = 3 gaps

Public/UI:
  ❌ Public API endpoints (1)
  ❌ Public dashboard (1)
  ❌ Booth UI (1)
  ❌ KPPS officer UI (1)
  ❌ Witness UI (1)
  ❌ Admin UI (1)
  = 6 gaps

Total: 26 major architectural gaps
```

---

## 12. Assumptions & Uncertainties

### Assumptions Made

1. **SQLite Location:** Assumed backend/database.sqlite (local file)
2. **PDF Library:** Assumed pdfkit (not yet chosen)
3. **File Storage:** Assumed backend/uploads/{tpsId}/ directory
4. **Hardhat Node:** Assumed localhost:8545 remains default
5. **JWT Expiry:** Assumed 1h for regular users (configurable)
6. **Session Expiry:** Assumed 30-60 minutes for voting sessions
7. **Polling Interval:** Assumed 1-2 seconds for booth polling
8. **Role Count:** Assumed 3 main roles (Admin, KPPS, Witness)
9. **TPS Count:** Assumed demo with 1-100 TPS (not millions)
10. **Blockchain:** Assumed Ethereum mainnet-style chain (not Bitcoin-style UTXO)

### Uncertainties to Clarify

1. **Candidate Pair vs Single Candidate:** PRD mentions "pairs" (governor + vice), need confirmation on structure
2. **Witness Count per TPS:** Should witness approval be required or optional per PRD?
3. **Supporting Party vs Coalition:** Distinction unclear, assumed supporting coalition for groups
4. **Valid vs Invalid Vote Definition:** What marks a vote as invalid?
5. **C.Hasil-KWK Form Compliance:** Which sections are absolutely required vs optional?
6. **Multi-language Support:** Indonesian UI only or should support English?
7. **Timezone Handling:** Assume all in Indonesia timezone (WIB)?
8. **Blockchain Network:** Hardhat local only or support for testnets later?
9. **Frontend Booth Device:** What OS/browser target (iPad iOS, Android, Windows)?
10. **Load Testing Requirements:** Expected concurrent voters per TPS?

---

## 13. Recommended Next Branch

### Branch: `feat/database-and-auth`

**After Phase 0 documentation, proceed with Phase 1:**

```bash
git checkout -b feat/database-and-auth
```

**Scope:**
1. Initialize SQLite with schema
2. Implement role-based authentication
3. Create User and Admin management
4. Add RBAC middleware

**Why First:**
- Blocks all subsequent phases
- Enables parallel development of other modules
- Clears privacy concerns early (JWT redesign)

---

## 14. Checklist: Before Starting Implementation

- [ ] Review and approve CURRENT_STATE.md
- [ ] Review and approve GAP_ANALYSIS.md
- [ ] Clarify "candidate pair" data model with requirements owner
- [ ] Confirm SQLite is final choice (vs MySQL/PostgreSQL)
- [ ] Decide on PDF library (pdfkit vs alternatives)
- [ ] Plan booth device target platform (iPad vs Android vs Web)
- [ ] Set up database backup strategy
- [ ] Plan testing strategy (Jest vs other)
- [ ] Security review of planned architecture
- [ ] Clarify witness approval blocking vs non-blocking finalization

---

## Summary

**Current Project Status:** 20-30% aligned with PRD/ARCHITECTURE

**Key Findings:**
1. ✅ Technology stack (React, Express, Hardhat) is correct
2. ❌ Architecture concept is fundamentally wrong (per-vote blockchain storage)
3. ❌ SQLite database completely missing
4. ❌ Role-based authorization absent
5. ❌ Temporary voting sessions missing
6. 🚫 Anomaly detection active (should be removed)
7. ❌ 26 major architectural gaps identified

**Recommended Action:** Execute Phase 0 (foundation), then Phase 1 (database & auth), unblocking all other phases.

**Estimated Total Effort:** 5-6 weeks for full implementation including testing and documentation.
