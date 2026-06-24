# Current State Analysis: Krandon Vote Sim

**Document Date:** 2026-06-15  
**Project:** Website E-Voting Pilkada Berbasis Blockchain  
**Analysis Scope:** Updated implementation inventory after incremental refactor branches completed in this ChatGPT session.  
**Primary Source of Truth:** `PRD.md` and `ARCHITECTURE_E_VOTING.md`

---

## 1. Executive Summary

The project has moved from an early, partially working e-voting prototype into a backend-driven local-first Pilkada TPS e-voting system foundation.

The following major foundations are now implemented:

1. Old K-Means/anomaly detection runtime scope removed.
2. SQLite persistence foundation added using Node built-in `node:sqlite`.
3. Role-based authentication for `ADMIN`, `KPPS`, and `WITNESS` implemented.
4. Election, TPS, candidate pair, and DPT/voter management APIs implemented.
5. Temporary voting session APIs implemented.
6. Local vote casting implemented using SQLite transactions.
7. Booth/tablet voting UI implemented at `/booth/:boothId`.
8. TPS recap generation and validation APIs implemented.
9. C.Hasil-KWK-inspired backend document generation implemented as print-ready HTML.
10. Frontend prototype for C.Hasil preview-before-download and preview-before-upload implemented.
11. Signed C.Hasil Upload System (multer integration, JPEG/PNG/PDF validation, secure randomized local storage).
12. Signed Document Metadata & SHA-256 Hashing tracked in SQLite for tamper detection.
13. Activity Log / Audit Trail service and table (`audit_logs` enhanced with `actor_email` and `description`, ADMIN-only API route `GET /audit-logs`, and React `AuditLogs.tsx` frontend page).
14. Demo automation improvements (`demo-activate-booth.js` to automate booth setup, and port-readiness wait in `start-all.js`).
15. Witness Verification Flow with Objection Evidence Upload (database schema migration, backend endpoints `/witness/recap`, `/witness/verify`, and `/witness/evidence/:verificationId`, automatic TPS status update, and WitnessDashboard frontend page with login redirect integration).
16. Deterministic audit log hash generation (`generateTpsAuditHash` in `AuditLogsService`).
17. Blockchain Finalization (Solidity contract refactor, wallet signer connection, finalization endpoint `/finalization/tps/:tpsId`, database logging, status transition to `BLOCKCHAIN_ANCHORED`, and dynamic anchor button with loader in `ChasilPreview.tsx`).

The project is now aligned with the main local-first TPS voting architecture, but the following important modules remain incomplete:

1. Public result dashboard backed by finalized data and hashes.
2. Full frontend admin/KPPS/witness management interfaces.
3. Legacy frontend voter/localStorage cleanup.
4. Automated tests and remaining README documentation updates.

---

## 2. Root Project Structure

Known current root structure:

```txt
krandon-vote-sim/
├── backend/
├── blockchain/
├── frontend/
├── package.json
├── package-lock.json
├── start-all.js
├── demo.js
├── README.md
├── PROJECT_SUMMARY.md
├── PRD.md
├── ARCHITECTURE_E_VOTING.md
├── CURRENT_STATE.md
└── GAP_ANALYSIS.md
```

Package manager:

```txt
npm
```

Important current project policy:

```txt
Coding agents must not run git push or open PRs.
The user runs git push manually.
One feature or fix must stay in one branch only.
```

---

## 3. Implemented Branches and Outcomes

| Branch | Status | Main Outcome |
|---|---:|---|
| `docs/project-audit-prd-architecture` | Done | Added initial `CURRENT_STATE.md` and `GAP_ANALYSIS.md`. |
| `refactor/remove-anomaly-detection` | Done | Removed runtime K-Means/anomaly detection route/service/UI references. Kept only audit/guardrail documentation references. |
| `feat/chasil-preview-workflow` | Done | Added frontend preview workflow for C.Hasil before download and preview selected signed file before upload. Replaced `.txt` mock download with browser print/Save as PDF. |
| `feat/sqlite-persistence-layer` | Done | Added SQLite foundation using `node:sqlite`, schema, migration, seed data, and ignored local DB files. |
| `feat/role-based-auth` | Done | Added `ADMIN`, `KPPS`, `WITNESS` login, JWT safe claims, RBAC middleware, bcryptjs password hashing, and `.env.example`. |
| `feat/elections-tps-dpt-management` | Done | Added backend CRUD APIs for elections, TPS, candidate pairs, and DPT/voters with RBAC and privacy controls. |
| `feat/temporary-voting-session` | Done | Added temporary voting session APIs, booth polling endpoint, session expiry/cancel behavior, and KPPS TPS restriction. |
| `feat/local-vote-casting` | Done | Added local vote casting using SQLite transactions, one-session-one-vote enforcement, and no blockchain per-vote calls. |
| `feat/booth-voting-ui` | Done | Added frontend `/booth/:boothId` tablet UI that polls active sessions and submits votes to backend. |
| `feat/tps-recap-validation` | Done | Added TPS recap generation, validation rules, candidate vote totals, and TPS status update to `RECAP_GENERATED`. |
| `feat/chasil-backend-document-generation` | Done | Added backend-generated C.Hasil-KWK-inspired print-ready HTML document, preview, download, and metadata storage. |
| `chore/demo-local-flow-helper` | Done | Implemented Signed C.Hasil upload system, SQLite metadata tracking, SHA-256 file hashing, Audit Log / Activity Trail service & admin view, and demo automation improvements (booth activation script, start-all port readiness check). |
| `feat/witness-verification` | Done | Implemented complete Witness Verification flow including database schema migration, backend endpoints, and WitnessDashboard frontend UI. |
| `feat/blockchain-finalization` | Done | Refactored EVoting.sol smart contract, created finalization route and blockchain service using ethers.js to anchor results, and integrated anchoring UI in ChasilPreview.tsx. |

---

## 4. Frontend Current State

### 4.1 Technology Stack

```txt
React
Vite
React Router v6
TypeScript / TSX
Tailwind CSS
shadcn-ui / Radix-based components
Recharts
fetch-based API calls
```

### 4.2 Current Frontend Routes

| Route | Purpose | Current Status |
|---|---|---|
| `/` | Public home / previous result display | Exists, not yet fully aligned with new backend finalization model. |
| `/login` | Legacy login UI | Exists; legacy voter/admin localStorage behavior may remain. |
| `/voter` | Legacy voter dashboard | Exists; should not be used for new TPS voting flow. |
| `/admin` | Admin dashboard | Exists; includes link to C.Hasil preview and booth demo. Still not a full backend-driven admin console. |
| `/admin/chasil-preview` | Frontend C.Hasil preview workflow | Implemented for supervisor demo. Uses mock/local data and print/Save as PDF flow. |
| `/admin/audit-logs` | Frontend Activity Log / Audit Trail UI page | Implemented. Displays system activity logs from backend, includes filtering options. |
| `/booth/:boothId` | New physical booth/tablet voting UI | Implemented. Polls backend active session and submits vote via `/votes/cast`. |
| `/results` | Public result page | Exists, not yet backed by finalized blockchain/document hash flow. |
| `*` | 404 fallback | Exists. |

### 4.3 Booth Voting UI

Implemented page:

```txt
frontend/src/pages/BoothVoting.tsx
frontend/src/services/boothApi.ts
```

Implemented behavior:

1. Reads `boothId` from route parameter.
2. Polls backend endpoint:

```txt
GET /voting-sessions/booth/:boothId/active
```

3. Displays waiting state when no active session exists.
4. Displays election, TPS, and candidate pair cards when a session is active.
5. Allows candidate selection.
6. Shows explicit confirmation step.
7. Submits vote to:

```txt
POST /votes/cast
```

8. Shows success state and returns to waiting mode.
9. Does not ask for NIK, DOB, email, or password.
10. Does not store voter identity or vote choice in localStorage.
11. Does not call blockchain directly.

### 4.4 Frontend C.Hasil Preview Workflow

Implemented page:

```txt
frontend/src/pages/ChasilPreview.tsx
```

Implemented behavior:

1. Preview C.Hasil-KWK-inspired TPS result form before download.
2. Print / Save as PDF through browser `window.print()`.
3. Preview selected signed/scanned file before simulated upload.
4. Supports PDF/JPG/JPEG/PNG preview on the frontend.
5. Does not silently upload after file selection.
6. Shows academic prototype disclaimer.

This frontend workflow was created for thesis supervisor demonstration. Backend signed file upload and hashing are still pending.

### 4.5 Legacy Frontend Areas

The old `/login` and `/voter` flows may still exist and may still use localStorage/NIK/DOB style behavior from the old prototype. These are not the target voting architecture. The correct voting flow is now:

```txt
KPPS creates temporary voting session
-> booth polls active session
-> voter selects candidate on booth device
-> vote is stored locally by backend
```

Legacy frontend cleanup is still needed later.

---

## 5. Backend Current State

### 5.1 Technology Stack

```txt
Node.js v22.x recommended
Express 5.x
TypeScript
JWT / jsonwebtoken
bcryptjs
node:sqlite / DatabaseSync
ethers.js still present for future blockchain adapter
npm
```

SQLite implementation uses Node built-in:

```ts
import { DatabaseSync } from "node:sqlite";
```

Known warning:

```txt
node:sqlite may emit ExperimentalWarning depending on Node version.
```

This is acceptable for thesis prototype, but production migration may use PostgreSQL/MySQL or a stable SQLite driver.

### 5.2 Backend Data Storage

Current database file:

```txt
backend/data/evoting.sqlite
```

Ignored by Git:

```txt
backend/data/*.sqlite
backend/data/*.sqlite-wal
backend/data/*.sqlite-shm
backend/data/*.sqlite-journal
backend/data/*.db
backend/uploads/
backend/generated-documents/
backend/data/generated-documents/
backend/.env
```

Database source files:

```txt
backend/src/database/connection.ts
backend/src/database/schema.sql
backend/src/database/migrate.ts
backend/src/database/seed.ts
```

### 5.3 Implemented SQLite Tables

Implemented/expected tables:

```txt
elections
tps
candidate_pairs
voters
users
voting_sessions
votes
tps_recaps
tps_recap_candidate_totals
documents
witness_verifications
blockchain_records
audit_logs
```

Important constraints:

```txt
votes.session_id has a unique index to enforce one session = one vote.
```

### 5.4 Seed Data

Current seed data includes:

1. One demo Pilkada election.
2. Three TPS records.
3. Three candidate pairs.
4. Synthetic voters assigned to TPS.
5. System users:

```txt
admin@example.local / Admin123! / ADMIN
kpps@example.local / Kpps123! / KPPS
witness@example.local / Witness123! / WITNESS
```

Passwords are hashed using `bcryptjs`. Demo NIK-like values are hashed before storage. No real citizen data should be used.

---

## 6. Backend Routes Current State

The backend currently follows non-`/api` route prefixes.

### 6.1 Auth

```txt
POST /auth/login
GET  /auth/me
POST /auth/logout
```

Implemented behavior:

1. Login by system user email/password.
2. Uses SQLite `users` table.
3. Password checked using `bcryptjs`.
4. JWT payload contains safe system-user claims:

```json
{
  "sub": "user id",
  "role": "ADMIN | KPPS | WITNESS",
  "assignedTpsId": "number | null"
}
```

JWT must not contain:

```txt
NIK
voter name
birth date
address
password_hash
vote-linked identity
```

### 6.2 Election Management

```txt
GET    /elections
GET    /elections/:id
POST   /elections
PATCH  /elections/:id
PATCH  /elections/:id/status
DELETE /elections/:id
```

Access:

```txt
ADMIN: read/write
KPPS: read-only where allowed
```

Allowed election statuses:

```txt
DRAFT
ACTIVE
CLOSED
ARCHIVED
```

### 6.3 TPS Management

```txt
GET    /tps
GET    /tps/:id
GET    /elections/:electionId/tps
POST   /tps
PATCH  /tps/:id
PATCH  /tps/:id/status
DELETE /tps/:id
```

Access:

```txt
ADMIN: read/write
KPPS: read assigned TPS only
```

Allowed TPS statuses:

```txt
DRAFT
OPEN
CLOSED
RECAP_GENERATED
DOCUMENT_UPLOADED
WITNESS_VERIFICATION
FINALIZED
BLOCKCHAIN_ANCHORED
```

### 6.4 Candidate Pair Management

```txt
GET    /candidate-pairs
GET    /candidate-pairs/:id
GET    /elections/:electionId/candidate-pairs
POST   /candidate-pairs
PATCH  /candidate-pairs/:id
DELETE /candidate-pairs/:id
```

Behavior:

1. Candidate pairs belong to an election.
2. Ballot number is unique per election.
3. Candidate name and vice candidate name are required.
4. Coalition and vision summary are optional.

### 6.5 DPT / Voter Management

```txt
GET    /voters
GET    /voters/:id
GET    /tps/:tpsId/voters
POST   /voters
PATCH  /voters/:id
DELETE /voters/:id
```

Privacy behavior:

1. Raw NIK is never stored.
2. NIK-like demo input is hashed server-side using SHA-256.
3. `nik_hash` is not returned by default.
4. Optional `includeHash` is ADMIN-only if available.
5. KPPS is restricted to assigned TPS.
6. Voter responses must not expose raw NIK.

Allowed verification statuses:

```txt
UNVERIFIED
VERIFIED
REJECTED
```

### 6.6 Temporary Voting Sessions

```txt
POST /voting-sessions
GET  /voting-sessions
GET  /voting-sessions/:id
GET  /voting-sessions/booth/:boothId/active
POST /voting-sessions/:id/cancel
POST /voting-sessions/:id/expire
```

Implemented behavior:

1. ADMIN can manage any session.
2. KPPS can manage only assigned TPS sessions.
3. Session creation verifies election/TPS/voter consistency.
4. Session creation marks voter verification status as `VERIFIED` if needed.
5. Session creation does not set `has_voted = true`.
6. Booth polling returns election/TPS/candidate pair data but no personal voter data.
7. Duplicate active session for the same voter or booth returns conflict.
8. Session expiry duration uses:

```txt
VOTING_SESSION_EXPIRES_MINUTES=5
```

Allowed session statuses:

```txt
ACTIVE
USED
EXPIRED
CANCELLED
```

### 6.7 Local Vote Casting

```txt
POST /votes/cast
```

Request body:

```json
{
  "sessionId": 1,
  "candidatePairId": 1
}
```

Implemented behavior:

1. Validates session exists.
2. Validates session status is `ACTIVE`.
3. Rejects expired session and marks it `EXPIRED` if needed.
4. Validates candidate pair belongs to same election.
5. Validates voter belongs to same election and TPS.
6. Validates `has_voted = false`.
7. Inserts one local vote record into SQLite.
8. Marks session as `USED` and sets `used_at`.
9. Sets `voters.has_voted = true`.
10. Uses atomic transaction.
11. Does not call blockchain.
12. Returns sanitized response without voter identity.

### 6.8 TPS Recap and Validation

```txt
GET  /recaps/tps/:tpsId
POST /recaps/tps/:tpsId/generate
POST /recaps/tps/:tpsId/validate
GET  /recaps/elections/:electionId
```

Implemented behavior:

1. Generates recap from local SQLite votes.
2. Calculates candidate pair totals.
3. Calculates total registered voters.
4. Calculates total verified voters.
5. Calculates total valid votes.
6. Uses total invalid votes = 0 for now.
7. Generates Indonesian `terbilang` for vote totals.
8. Stores recap and candidate totals atomically.
9. Updates TPS status to `RECAP_GENERATED` only after valid generation.
10. Enforces ADMIN/KPPS access rules.

Implemented validation rules include:

1. Sum of candidate pair totals equals total valid votes.
2. Total valid votes does not exceed total verified voters.
3. Total verified voters does not exceed total registered voters.
4. Each voting session is used at most once.
5. Each used voting session has exactly one vote.
6. Vote/session election and TPS consistency.
7. Candidate pair election consistency.
8. `has_voted` consistency with used sessions/votes.

### 6.9 C.Hasil-KWK-Inspired Document & Signed Upload

```txt
POST /documents/tps/:tpsId/chasil/generate
GET  /documents/tps/:tpsId/chasil/preview
GET  /documents/:documentId/download
GET  /documents/tps/:tpsId
POST /documents/:documentId/signed-upload
GET  /documents/:documentId/signed-download
GET  /documents/:documentId/signed-preview
```

Implemented behavior:

1. Requires existing valid TPS recap.
2. Generates print-ready HTML document.
3. Stores generated HTML under ignored generated-documents directory.
4. Upserts document metadata in SQLite `documents` table.
5. Provides HTML preview with `Content-Type: text/html`.
6. Provides attachment download.
7. Includes disclaimer that it is an academic prototype and not an official KPU form.
8. Includes election metadata, TPS metadata, recap summary, candidate totals, signature areas, and integrity placeholders.
9. Escapes dynamic HTML content using utility helper.
10. Implements signed form upload using multer (with PDF/JPEG/PNG validations and size checks).
11. Generates SHA-256 integrity hash from the exact uploaded bytes and stores metadata in database.
12. Provides endpoints for authorized users (ADMIN, KPPS restricted to assigned TPS) to preview and download the signed C.Hasil document.
13. Does not call blockchain.

### 6.10 Activity Log / Audit Trail

```txt
GET /audit-logs
```

Implemented behavior:

1. Enhanced database schema with `audit_logs` table containing `actor_email` and `description` tracking.
2. Admin-only route `GET /audit-logs` that allows retrieving, filtering, and paging through system activity logs.
3. Backend service (`src/services/auditLogs.ts`) to programmatically log crucial events.
4. Logged actions include: `AUTH_LOGIN`, `VOTING_SESSION_CREATED`, `VOTING_SESSION_CANCELLED`, `VOTE_CAST`, `TPS_STATUS_UPDATED`, `TPS_RECAP_GENERATED`, `CHASIL_GENERATED`, and `SIGNED_FORM_UPLOADED`.
5. Strictly avoids logging sensitive details such as voter NIK, nik_hash, passwords, JWT tokens, or absolute file paths.
6. Helper `generateTpsAuditHash(tpsId)` computes a deterministic cryptographic hash chain over the audit logs associated with a selected TPS.

### 6.11 Finalization

```txt
POST /finalization/tps/:tpsId
```

Implemented behavior:

1. Authenticates ADMIN/KPPS users.
2. Formulates candidates vote totals arrays and registered/verified voter statistics from database.
3. Validates status and queries document hash from `documents` (using `signed_file_hash_sha256` or generated HTML file hash).
4. Submits statistics to on-chain Solidity `anchorTpsResult` method.
5. Logs receipt on database `blockchain_records` table, transitions status to `BLOCKCHAIN_ANCHORED`, and writes to `audit_logs`.

---

## 7. Current End-to-End Implemented Flow

The following backend-driven flow is currently implemented:

```txt
Admin/KPPS login
-> Admin manages election/TPS/candidate/DPT data
-> KPPS/Admin creates temporary voting session
-> Booth device polls active session
-> Booth displays candidate pairs
-> Voter selects and confirms candidate pair
-> Backend stores local vote in SQLite
-> Backend marks session USED
-> Backend marks voter has_voted true
-> Admin/KPPS closes TPS manually through TPS status endpoint
-> Backend generates TPS recap and validation
-> Backend generates C.Hasil-KWK-inspired HTML form
-> Form can be previewed/downloaded/printed
```

Pending after this flow:

```txt
Public hash/result dashboard
```

---

## 8. Blockchain Current State

Blockchain stack still exists:

```txt
Solidity
Hardhat
ethers.js
local Hardhat chain
```

However, the current implemented vote flow no longer uses blockchain for individual vote casting. This is correct according to the new architecture.

Blockchain finalization is implemented (feat/blockchain-finalization) to support final TPS result anchoring on-chain:

1. Refactored Solidity contract `EVoting.sol` to store final TPS result records.
2. Stores candidate totals, document hash, audit log hash, and finalization timestamp.
3. Strict enforcement prevents duplicate TPS finalization.
4. Emits `TpsResultAnchored` event.
5. Saves transaction hash in backend `blockchain_records` table and updates TPS status.
6. Display finalization metadata on the ChasilPreview management dashboard.

---

## 9. Known Technical Risks

### High Priority

1. Public result dashboard is not yet integrated with recap/document/blockchain data.
2. Legacy `/voter` and localStorage voting flow may still exist and must not be used for target workflow.
3. Full frontend management UI for Admin/KPPS/Witness is still incomplete.

### Medium Priority

1. `node:sqlite` can emit experimental warnings depending on Node version.
2. Generated C.Hasil document is HTML/print-ready, not binary PDF yet.
3. Automated tests are not yet formalized in repository.

### Low Priority

1. Frontend bundle size optimization.
2. UI polish for tablet booth and admin dashboard.
3. README/demo script updates.
4. Route prefix consistency decision (`/api` vs no `/api`).

---

## 10. Current Recommended Next Branch

Next branch:

```txt
feat/public-result-dashboard
```

Purpose:

1. Create public results transparency dashboard.
2. Clean up legacy voter login flow and localStorage objects.
3. Integrate public APIs to load data directly from SQLite database and blockchain records.

Recommended commit message:

```txt
feat: add public results dashboard
```

Agent reminder:

```txt
Do not run git push. The user pushes manually.
```
