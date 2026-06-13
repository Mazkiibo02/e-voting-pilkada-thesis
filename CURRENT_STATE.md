# Current State Analysis: Krandon Vote Sim

**Document Date:** 2026-06-13  
**Project:** Website E-Voting Pilkada Berbasis Blockchain  
**Analysis Scope:** Comprehensive audit of implemented features and current architecture  

---

## 1. Project Structure Overview

### Root Level
```
krandon-vote-sim/
├── backend/                 # Express API with TypeScript
├── blockchain/              # Solidity contracts + Hardhat
├── frontend/                # React + Vite + shadcn-ui
├── node_modules/
├── package.json            # Root package (no scripts)
├── package-lock.json
├── start-all.js            # Automation script to start all services
├── demo.js                 # Demo script (minimal content)
├── README.md               # Generic setup instructions
├── PROJECT_SUMMARY.md      # Indonesian technical analysis
├── PRD.md                  # Product Requirements Document
├── ARCHITECTURE_E_VOTING.md # Architecture Design Document
```

### Package Manager
- **Primary:** npm
- **Lock file:** package-lock.json
- **No pnpm or yarn** locks detected

---

## 2. Frontend Current State

### Technology Stack
- **Framework:** React 18.3.1
- **Build Tool:** Vite 5.4.19
- **Router:** React Router v6.30.1
- **Styling:** Tailwind CSS 3.4.17
- **UI Components:** shadcn-ui (Radix-based)
- **Form:** React Hook Form + Zod validation
- **HTTP Client:** fetch (no axios/tanstack-query wrapper for API calls)
- **Query Management:** TanStack React Query 5.83.0
- **Toast Notifications:** Sonner 1.7.4
- **Charts:** Recharts 2.15.4
- **TypeScript:** 5.8.3

### Pages and Routes

| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/` | Homepage | Public vote display, candidates list, stats | Implemented |
| `/login` | Login | Dual-tab voter & admin login | Implemented |
| `/voter` | VoterDashboard | Vote casting interface | Implemented |
| `/admin` | AdminDashboard | Admin monitoring + TPS filter | Implemented |
| `/results` | PublicResults | Public result display | Implemented |
| `*` | NotFound | 404 fallback | Implemented |

### Current Frontend Data Flow

**Data Storage:** LocalStorage only
- `evoting_voters` - Mock voter array (NIK, name, DOB, hasVoted, anomaly flags)
- `evoting_candidates` - Candidate array with vote counts
- `evoting_admin` - Single admin credential
- `currentVoter` - Session storage for logged-in voter
- `isAdmin` - Session flag for admin

**Key Components:**
1. **Login Page:** 
   - Voter tab: NIK + DOB authentication (no backend verification)
   - Admin tab: Email + Password (hardcoded: admin@desa.go.id / admin123)
   - Calls `getVoterByNIK()` from localStorage
   - No JWT token communication with backend

2. **VoterDashboard:**
   - Displays voter info (name, NIK)
   - Shows "Terverifikasi Blockchain" badge (false claim - not actually blockchain-verified)
   - Shows anomaly flags ("Anomali Terdeteksi")
   - Vote selection and confirmation UI
   - Calls `updateCandidateVote()` to increment vote count in localStorage
   - No backend API call for vote submission

3. **AdminDashboard:**
   - TPS filter dropdown (TPS 01, TPS 02, TPS 03)
   - Statistics: total voters, voted count, anomaly count
   - Voter table with anomaly filtering
   - Bar chart and Pie chart visualizations
   - Reset data button
   - No actual election/TPS management

4. **Homepage:**
   - Fetches `/api/candidates` from backend API
   - Displays candidate list with vote counts
   - Shows election status as "active"
   - Bar and Pie charts for results
   - Auto-refresh capability

5. **PublicResults:**
   - Minimal implementation visible in directory structure
   - Not fully reviewed in code inspection

### Frontend Technical Issues

1. **No Backend Integration for Core Voting:** Most voting happens in localStorage, not backend
2. **No Actual Authentication:** Voter login is just localStorage lookup
3. **Anomaly Detection in UI:** Displays "Anomali Terdeteksi" badges (should be removed per PRD)
4. **No TPS Concept:** Voters are not assigned to TPS properly
5. **No Blockchain Verification:** "Terverifikasi Blockchain" badge is cosmetic
6. **No Role-Based UI:** Single login, no distinct KPPS/witness/admin roles
7. **No Session Management:** Direct localStorage, no JWT/token-based session
8. **No Document Upload UI:** No file upload or form generation feature
9. **No PDF Generation:** No C.Hasil-KWK form display
10. **No Witness Dashboard:** No separate witness interface

---

## 3. Backend Current State

### Technology Stack
- **Framework:** Express 5.2.1
- **Language:** TypeScript 5.9.3
- **Runtime:** Node.js (ts-node-dev for development)
- **JWT:** jsonwebtoken 9.0.3
- **Blockchain:** ethers.js 6.16.0
- **CORS:** cors 2.8.6
- **Env Config:** dotenv 17.3.1
- **Data Storage:** JSON files (fs) + in-memory operations

### Directory Structure

```
backend/src/
├── index.ts              # Main Express app entry point
├── data/
│   ├── voters.json       # Voter list (DPT mock data)
│   └── tps.json          # TPS data (referenced but not deeply used)
├── middleware/
│   └── auth.ts           # JWT verification middleware
├── routes/
│   ├── auth.ts           # POST /auth/login - NIK-based token
│   ├── votes.ts          # POST /vote - vote submission with blockchain
│   └── anomaly.ts        # GET /anomaly - anomaly detection analysis
├── services/
│   ├── blockchain.ts     # Ethers.js contract connection
│   ├── kmeansTPS.ts      # K-Means clustering algorithm
│   ├── generateTPS.ts    # TPS data generation
│   └── seedVotes.js      # Vote seeding (referenced in PROJECT_SUMMARY)
├── tsconfig.json
├── package.json
└── README.md
```

### Current Routes and Endpoints

#### 1. Authentication Routes (`/auth`)
```
POST /auth/login
  Input: { nik: string }
  Output: { token: string }
  Behavior: JWT sign with NIK, 1h expiry
  Issue: Stores NIK in JWT claim (privacy concern)
```

#### 2. Voting Routes (`/vote`)
```
POST /vote (protected with verifyToken)
  Input: { candidateId: number }
  Behavior:
    1. Extract NIK from JWT
    2. Find voter in voters.json
    3. Check if already voted (is_voted flag)
    4. Call blockchain castVote(tpsId=1, candidateId)
    5. Mark voter as voted
    6. Return transaction hash
  Issues:
    - Stores raw NIK in JWT
    - Hardcoded TPS ID = 1 (not multi-TPS capable)
    - Vote stored directly on blockchain per individual vote
    - No validation of candidate existence
    - No duplicate vote prevention at blockchain level
```

#### 3. Public Candidate Routes (unauthenticated)
```
GET /candidates
  Output: Array of { id, name, voteCount }
  Behavior: Fetches candidatesCount from blockchain, loops to read each candidate
  
GET /candidates/:id
  Output: { id, name, voteCount }
  Behavior: Fetches single candidate from blockchain
```

#### 4. Anomaly Routes (`/anomaly`)
```
GET /anomaly (unprotected)
  Output: { totalTPS, totalAnomaly, anomalyPercentage, anomalies: array }
  Behavior:
    1. Reads tps.json
    2. Runs K-Means clustering with k=2
    3. Identifies smallest cluster as "anomaly"
    4. Returns top 20 anomalies
  Issues: Should be removed per PRD
```

### Current Services

#### blockchain.ts
- **Status:** Partially implemented
- **Provider:** Ethers.js JSON-RPC to http://127.0.0.1:8545
- **Contract Address:** Hardcoded default `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **ABI Loading:** From `/blockchain/artifacts/contracts/EVoting.sol/EVoting.json`
- **Functions:**
  - Contract object (read-only, no wallet signer)
  - `castVote()` function throws "Voting disabled sementara (no wallet)" error
- **Issues:** 
  - No actual voting transaction (castVote disabled)
  - Vote endpoint calls undefined/disabled function
  - No transaction signing capability
  - Address is hardcoded and auto-updated by start-all.js

#### kmeansTPS.ts
- **Algorithm:** K-Means with k=2 default
- **Features:** 
  - Calculates turnout ratio and candidate ratio
  - Clusters TPS data
  - Marks smallest cluster as anomaly
- **Issues:** Should be removed entirely per PRD (no anomaly detection in target)

#### generateTPS.ts
- **Purpose:** Generate synthetic TPS data
- **Called:** In index.ts on startup to generate 1000 TPS records
- **Output:** TPS data with turnout and voting statistics
- **Issue:** Generates test data, not used by core voting flow

#### seedVotes.js
- Referenced in PROJECT_SUMMARY.md but not directly called in current code
- Purpose unclear in current context

### Current Data Storage

**Voters (voters.json)**
```json
{
  "nik": "3301010001",
  "name": "Ahmad",
  "age": 25,
  "is_voted": false,
  "cluster": -1,
  "anomaly": true
}
```
- **Issues:**
  - No DPT/TPS assignment
  - Anomaly field (should be removed)
  - No hashed identity
  - Age stored (privacy concern)
  - is_voted flag without session concept

**TPS (tps.json)**
- Referenced in anomaly route
- Contains turnout, registered voters, candidate votes
- Used only for anomaly clustering

### Authentication & Authorization

**Current State:**
- **Only JWT-based auth:** verifyToken middleware
- **Only one login flow:** NIK-based (single voter login)
- **No role support:** No KPPS, Admin, Witness roles
- **No authorization checks:** Protected routes just verify token exists
- **Token claims:** Contains NIK (privacy issue)
- **Secret:** Hardcoded "supersecret" in auth.ts

**Issues:**
- No role-based access control (RBAC)
- No KPPS officer verification endpoint
- No witness dashboard routes
- No admin election management routes
- Permanent voter login (PRD requires temporary voting sessions)

### Blockchain Integration

**Smart Contract (EVoting.sol)**
- **Language:** Solidity 0.8.20
- **Structure:**
  ```solidity
  struct Candidate {
    uint256 id;
    string name;
  }
  mapping(uint256 => Candidate) candidates;
  mapping(uint256 => mapping(uint256 => uint256)) votes;  // votes[tpsId][candidateId]
  
  functions:
  - addCandidate(string name) - public, no access control
  - castVote(uint256 tpsId, uint256 candidateId) - public, increments votes
  - getVotes(uint256 tpsId, uint256 candidateId) - view
  - candidatesCount() - view
  - getCandidate(uint256 id) - view, returns (id, name, 0)
  ```
- **Issues per PRD:**
  - ❌ No access control (anyone can vote)
  - ❌ Stores raw individual votes on-chain (should store only final TPS result)
  - ❌ No duplicate vote prevention
  - ❌ No TPS result structure (should store: totalVerified, totalValid, etc.)
  - ❌ No document hash field
  - ❌ No audit hash field
  - ❌ No finalization concept
  - ✅ Simple candidate storage (OK as-is)

**Deployment (scripts/deploy.js)**
- Deploys contract to Hardhat local node
- Adds 3 sample candidates
- Outputs contract address to console
- start-all.js parses this output and updates backend config file

**Hardhat Configuration (hardhat.config.js)**
- Solidity version: 0.8.20
- No networks configured (default localhost:8545)
- No testnet or mainnet setup
- No environment variables for chain config

### Backend Technical Issues

1. **Data Persistence:** JSON files not suitable for production (no concurrency safety)
2. **No Database:** Missing SQLite (per architecture target)
3. **No TPS Management:** Only hardcoded TPS ID 1
4. **No Voting Sessions:** No temporary voter access concept
5. **K-Means Bloat:** Unnecessary anomaly detection code
6. **Missing Routes:** No endpoints for recap, document, witness, finalization
7. **Privacy:** NIK stored in JWT and visible in logs
8. **Blockchain Voting:** Each vote sent individually on-chain (should be batch finalization)
9. **No PDF Generation:** No document generation service
10. **No File Upload:** No upload handling or hashing
11. **No Recap Validation:** No business logic for recap validation rules

---

## 4. Blockchain Current State

### Hardhat Setup
- **Version:** 2.22.3
- **Solidity:** 0.8.20
- **Network:** Local development only
- **RPC URL:** http://127.0.0.1:8545 (default Hardhat)
- **Chain ID:** 31337 (Hardhat default)
- **Account 0:** `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (test account)
- **Private Key 0:** `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

### Smart Contract Structure

**File:** blockchain/contracts/EVoting.sol

```solidity
contract EVoting {
  struct Candidate {
    uint256 id;
    string name;
  }
  
  uint256 public candidateCount = 0;
  uint256 public tpsCount = 0;
  
  mapping(uint256 => Candidate) public candidates;
  mapping(uint256 => mapping(uint256 => uint256)) public votes;
  
  event VoteCast(uint256 indexed tpsId, uint256 indexed candidateId, uint256 timestamp);
  
  function addCandidate(string memory _name) public
  function castVote(uint256 _tpsId, uint256 _candidateId) public
  function getVotes(uint256 _tpsId, uint256 _candidateId) public view returns (uint256)
  function candidatesCount() public view returns (uint256)
  function getCandidate(uint256 _id) public view returns (uint256, string memory, uint256)
}
```

### Current Contract Behavior
- ✅ Can add candidates (no limit)
- ✅ Can cast votes per TPS and candidate
- ✅ Can read vote totals
- ❌ No access control
- ❌ No ownership/admin
- ❌ No duplicate vote prevention
- ❌ Stores individual votes (not final TPS result)
- ❌ No finalization mechanism
- ❌ No document/audit hash storage
- ❌ No event emission with transaction hash

### Deployment Pipeline

**start-all.js flow:**
1. Starts Hardhat node (waits 6 seconds)
2. Runs deploy.js script
3. Parses contract address from output
4. Updates `backend/src/services/blockchain.ts` with address
5. Starts backend
6. Starts frontend

**Issues:**
- File mutation during startup (not ideal for CI/CD)
- No environment variable configuration
- Address hardcoded in blockchain.ts
- Private key exposed in project files
- No deployment verification

### Blockchain Directory Structure
```
blockchain/
├── contracts/
│   └── EVoting.sol
├── scripts/
│   └── deploy.js
├── ignition/
│   └── modules/
│       └── Lock.js          (unused, from Hardhat template)
├── artifacts/
│   └── (generated after compile)
├── cache/
│   └── (build artifacts)
├── hardhat.config.js
├── package.json
└── README.md
```

---

## 5. Current Implemented Features Summary

### ✅ Working Features

| Feature | Status | Notes |
|---------|--------|-------|
| Frontend React App | Working | Vite build, pages render |
| Voter Login | Working | LocalStorage-based, frontend only |
| Admin Login | Working | Hardcoded credentials in localStorage |
| Vote Casting UI | Working | Candidate selection interface |
| Vote Count Display | Working | Shows numbers, no blockchain verification |
| Blockchain Node Startup | Working | Hardhat local node starts |
| Contract Deployment | Working | Contract deploys to local chain |
| Candidate Storage | Working | On blockchain and in contract state |
| Anomaly Detection | Working | K-Means runs on startup and in anomaly endpoint |
| TPS Data Generation | Working | generateTPS() generates mock data |
| Auto-update Contract Address | Working | start-all.js parses and updates blockchain.ts |

### ❌ Not Working / Missing

| Feature | Status | Reason |
|---------|--------|--------|
| Backend Vote Submission | Broken | castVote() throws disabled error |
| Actual Blockchain Voting | Broken | No wallet/signer configured |
| JWT Authentication | Partial | Implemented but not used in frontend for voting |
| Role-Based Access Control | Missing | No KPPS, witness, or admin roles |
| TPS Management | Missing | Hardcoded TPS ID = 1 |
| Voting Sessions | Missing | No temporary access concept |
| Multi-TPS Support | Missing | Only TPS 1 works |
| Database Integration | Missing | Using JSON files and localStorage |
| PDF Generation | Missing | No C.Hasil-KWK form feature |
| Document Upload | Missing | No file upload handling |
| Document Hashing | Missing | No SHA-256 implementation |
| Witness Verification | Missing | No witness role/dashboard |
| Recap Generation | Missing | No server-side recap validation |
| Blockchain Finalization | Missing | No concept of final TPS result |
| Public Transparency | Partial | Results display exists but no integrity proof |

---

## 6. Current Data Model

### Voters (frontend localStorage)
```typescript
interface Voter {
  nik: string;
  name: string;
  dob: string;
  hasVoted: boolean;
  votedFor?: string;
  anomaly?: string;      // "Duplicate NIK" | "Invalid Age" | undefined
  tps?: string;          // "TPS 01" | "TPS 02" | "TPS 03"
}
```

### Candidates (frontend localStorage)
```typescript
interface Candidate {
  id: string;
  name: string;
  description: string;
  voteCount: number;
}
```

### On Blockchain (EVoting.sol)
```solidity
struct Candidate {
  uint256 id;
  string name;
}

mapping(uint256 => Candidate) candidates;
mapping(uint256 => mapping(uint256 => uint256)) votes;  // [tpsId][candidateId]
```

---

## 7. Known Technical Risks

### 🔴 High Priority Issues

1. **Privacy Violation:** NIK stored in JWT token claims (visible in logs/network)
2. **No Blockchain Wallet:** Voting endpoint has disabled casting function
3. **Individual Vote Storage:** Each vote sent to blockchain (expensive, violates PRD)
4. **Anomaly Detection Active:** K-Means runs on every backend startup
5. **No Access Control:** Smart contract has no permission checks
6. **JSON File Concurrency:** Multiple requests could corrupt data files
7. **Hardcoded Secrets:** JWT secret "supersecret" visible in source
8. **Private Key Exposure:** Hardhat account key visible in PROJECT_SUMMARY.md

### 🟡 Medium Priority Issues

1. **No Database:** SQLite completely missing
2. **Voting Sessions Missing:** No temporary access concept per PRD
3. **Anomaly Badges in UI:** User-facing anomaly detection (should be removed)
4. **No Role Authorization:** All authenticated users treated equally
5. **Blockchain Address Mutation:** start-all.js mutates source files
6. **Tight Coupling:** Frontend can't work without backend and blockchain
7. **No Testing:** No unit, integration, or contract tests visible
8. **No API Documentation:** No OpenAPI/Swagger specs

### 🟢 Low Priority Issues

1. **Unused Imports:** Some imports in files not utilized
2. **Error Handling:** Generic error responses without specificity
3. **No Logging:** Minimal structured logging for audit trail
4. **No Rate Limiting:** Endpoints open to abuse
5. **No Input Validation:** Limited request validation

---

## 8. File Structure Detailed Inspection

### Frontend Components
- **UI Components:** Full shadcn-ui library installed (accordion, alert, dialog, table, etc.)
- **Page Components:** 6 pages (Homepage, Login, VoterDashboard, AdminDashboard, PublicResults, NotFound)
- **Utilities:** storage.ts (localStorage CRUD), utils.ts (general utilities)
- **Services:** api.ts (fetch wrapper likely)
- **Hooks:** use-mobile.tsx (responsive detection), use-toast.ts (toast notifications)
- **Styling:** Tailwind CSS with custom CSS files (App.css, index.css)

### Backend Middleware
- **auth.ts:** JWT verification only, no authorization logic

### Configuration Files
- **tsconfig.json (backend):** TypeScript config for backend compilation
- **tsconfig.json (frontend):** Vite + React TypeScript
- **tsconfig.app.json:** App-specific TS config
- **tsconfig.node.json:** Node-specific TS config
- **Vite config:** SWC transpiler, React plugin
- **Tailwind config:** CSS processing with Tailwind
- **PostCSS config:** CSS plugin pipeline
- **ESLint config:** Code quality rules

---

## 9. Current Session and Authentication Flow

### Voter Login Flow (Current)
```
1. User enters NIK + DOB
2. Frontend calls getVoterByNIK(nik, dob)
3. Matches against localStorage voters
4. Stores { nik, name, dob, ... } in localStorage[currentVoter]
5. Displays Dashboard
6. Vote submission calls localStorage update (no backend)
```

### Admin Login Flow (Current)
```
1. User enters email + password
2. Frontend validates against hardcoded admin@desa.go.id / admin123
3. Sets localStorage[isAdmin] = true
4. Displays AdminDashboard
```

### Backend Authentication (Current, Not Used in Voting)
```
1. Frontend would call POST /auth/login with { nik }
2. Backend finds voter in voters.json
3. Signs JWT with nik claim
4. Returns token
5. Frontend stores token
6. Subsequent requests include Authorization: Bearer <token>
```

**Gap:** Frontend doesn't actually use the JWT flow - voting happens entirely in localStorage.

---

## 10. Areas Needing Manual Review

1. **Demo.js Content:** File exists but content not fully inspected
2. **PublicResults.tsx:** Page structure not fully reviewed
3. **Full storage.ts:** Complete utility functions list not catalogued
4. **Blockchain test scenarios:** No test files found or inspected
5. **Complete API service flow:** frontend/services/api.ts not fully reviewed
6. **Deployment workflow details:** start-all.js external process handling
7. **Error scenarios:** How errors cascade through the stack
8. **Performance:** No performance metrics or benchmarks observed
9. **Security testing:** No indication of security audit
10. **Build artifacts:** Compiled blockchain contracts ABI structure

---

## 11. Dependencies Summary

### Frontend Critical Dependencies
- React 18, Vite 5, React Router v6
- Radix UI (Accordion, Dialog, Tabs, etc.)
- TanStack Query, Recharts
- Tailwind CSS, TypeScript

### Backend Critical Dependencies
- Express 5, TypeScript
- ethers.js 6 (blockchain interaction)
- jsonwebtoken (JWT)
- dotenv (environment config)

### Blockchain Critical Dependencies
- Hardhat 2.22.3
- Solidity 0.8.20
- @nomicfoundation/hardhat-toolbox

**No development databases configured (SQLite missing completely)**

---

## Summary

The current project is a **partially working e-voting prototype** with:

**Strengths:**
- Frontend UI framework well-structured with modern components
- Blockchain infrastructure setup (Hardhat, contract deployment)
- Basic voting UI and candidate display
- Frontend/backend/blockchain separated by folder

**Critical Gaps:**
- K-Means and anomaly detection active (PRD violation)
- No real voting session or temporary access mechanism
- No database layer (SQLite completely missing)
- No role-based authorization
- Blockchain stores individual votes instead of final results
- No document generation, hashing, or witness verification
- Private voter data in JWT claims
- Frontend voting bypasses backend entirely

**Status:** About 20-30% aligned with PRD and ARCHITECTURE documents. Significant refactoring needed.
