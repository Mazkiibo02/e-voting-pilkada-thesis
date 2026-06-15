# Technical Architecture Document / TDD

**Project Name:** Website E-Voting Pilkada Berbasis Blockchain  
**Document Type:** Technical Architecture Document / Technical Design Document  
**Document Date:** 2026-06-15  
**Primary Audience:** AI coding agent, developer, thesis implementation maintainer  
**Package Manager:** npm  
**Current Implementation Milestone:** through `feat/chasil-backend-document-generation`

---

## 1. Architecture Intent

This document defines the current and target technical architecture for the Pilkada-level local-first e-voting project.

The project must remain aligned with these architecture decisions:

1. Pilkada context only.
2. Physical TPS process preserved.
3. Voters do not have permanent login accounts.
4. KPPS grants temporary voting sessions.
5. Booth/tablet votes through temporary active session.
6. Votes are stored locally in SQLite.
7. Blockchain stores final TPS result integrity only.
8. Generated result form is C.Hasil-KWK-inspired, not official KPU output.
9. Witnesses verify but never edit vote totals.
10. Anomaly/K-Means scope must not be reintroduced.

---

## 2. Current Runtime Architecture

```txt
Frontend React/Vite
  ├─ Admin dashboard / C.Hasil preview prototype
  ├─ Booth voting UI (/booth/:boothId)
  └─ Legacy pages still present

Express Backend TypeScript
  ├─ Auth + RBAC
  ├─ Elections / TPS / Candidate Pairs / Voters
  ├─ Temporary Voting Sessions
  ├─ Local Vote Casting
  ├─ TPS Recap and Validation
  ├─ C.Hasil-KWK-inspired Document Generation
  └─ Future: Upload/Hash, Witness, Audit, Blockchain, Public

SQLite Local Database
  ├─ elections, tps, candidate_pairs, voters, users
  ├─ voting_sessions, votes
  ├─ tps_recaps, tps_recap_candidate_totals
  ├─ documents, witness_verifications
  └─ blockchain_records, audit_logs

Hardhat Local Blockchain
  └─ Future final TPS result + document hash + audit hash anchoring
```

---

## 3. Current Backend Structure

Current backend uses a flat `routes/` and `services/` structure, not the future nested module structure.

```txt
backend/src/
├── database/
│   ├── connection.ts
│   ├── schema.sql
│   ├── migrate.ts
│   └── seed.ts
├── middleware/
│   └── auth.ts
├── routes/
│   ├── auth.ts
│   ├── elections.ts
│   ├── tps.ts
│   ├── candidatePairs.ts
│   ├── voters.ts
│   ├── votingSessions.ts
│   ├── votes.ts
│   ├── recaps.ts
│   └── documents.ts
├── services/
│   ├── auth.ts
│   ├── elections.ts
│   ├── tps.ts
│   ├── candidatePairs.ts
│   ├── voters.ts
│   ├── votingSessions.ts
│   ├── votes.ts
│   ├── recaps.ts
│   ├── documents.ts
│   └── chasilTemplate.ts
├── utils/
│   └── htmlEscape.ts
└── index.ts
```

Future refactor into `modules/` can be considered later, but current priority is completing the election flow.

---

## 4. Current Frontend Structure

Important implemented frontend additions:

```txt
frontend/src/pages/BoothVoting.tsx
frontend/src/services/boothApi.ts
frontend/src/pages/ChasilPreview.tsx
```

Important routes:

```txt
/admin/chasil-preview
/booth/:boothId
```

Legacy routes still exist and should be treated carefully:

```txt
/login
/voter
```

The legacy voter flow should not be used as the target flow.

---

## 5. Database Architecture

### 5.1 Current Database Engine

Current implementation uses Node built-in SQLite:

```ts
import { DatabaseSync } from "node:sqlite";
```

Database file:

```txt
backend/data/evoting.sqlite
```

Reasoning:

1. No native `node-gyp` dependency.
2. Works on Windows without Visual Studio C++ Build Tools.
3. Suitable for local-first thesis prototype.

Known caveat:

```txt
node:sqlite may emit ExperimentalWarning depending on Node version.
```

Production migration path:

```txt
Local TPS: SQLite or stable embedded DB
Central/public layer: PostgreSQL/MySQL
```

### 5.2 Current Tables

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

### 5.3 Privacy Storage Rules

1. Raw NIK must never be stored.
2. NIK-like demo input is hashed server-side.
3. Vote records must not store direct voter identity.
4. Vote records are linked to a temporary session.
5. Public APIs must never expose DPT or voter personal data.
6. Blockchain must never store voter identity.

---

## 6. Auth Architecture

Implemented system-user auth:

```txt
POST /auth/login
GET  /auth/me
POST /auth/logout
```

Roles:

```txt
ADMIN
KPPS
WITNESS
```

Password hashing:

```txt
bcryptjs
```

JWT claims:

```json
{
  "sub": "user id",
  "role": "ADMIN | KPPS | WITNESS",
  "assignedTpsId": "number | null",
  "iat": "standard JWT issued-at",
  "exp": "standard JWT expiry"
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

Middleware:

```txt
authenticateToken
requireRole([...])
verifyToken alias for backward compatibility
```

---

## 7. API Architecture

The current backend uses no `/api` prefix. Coding agents must follow this convention unless explicitly instructed to refactor route prefixes.

### 7.1 Auth

```txt
POST /auth/login
GET  /auth/me
POST /auth/logout
```

### 7.2 Elections

```txt
GET    /elections
GET    /elections/:id
POST   /elections
PATCH  /elections/:id
PATCH  /elections/:id/status
DELETE /elections/:id
```

### 7.3 TPS

```txt
GET    /tps
GET    /tps/:id
GET    /elections/:electionId/tps
POST   /tps
PATCH  /tps/:id
PATCH  /tps/:id/status
DELETE /tps/:id
```

### 7.4 Candidate Pairs

```txt
GET    /candidate-pairs
GET    /candidate-pairs/:id
GET    /elections/:electionId/candidate-pairs
POST   /candidate-pairs
PATCH  /candidate-pairs/:id
DELETE /candidate-pairs/:id
```

### 7.5 Voters / DPT

```txt
GET    /voters
GET    /voters/:id
GET    /tps/:tpsId/voters
POST   /voters
PATCH  /voters/:id
DELETE /voters/:id
```

### 7.6 Voting Sessions

```txt
POST /voting-sessions
GET  /voting-sessions
GET  /voting-sessions/:id
GET  /voting-sessions/booth/:boothId/active
POST /voting-sessions/:id/cancel
POST /voting-sessions/:id/expire
```

### 7.7 Votes

```txt
POST /votes/cast
```

Compatibility note:

```txt
A legacy /vote route may still exist for compatibility, but target flow must use /votes/cast and must not submit individual votes to blockchain.
```

### 7.8 Recaps

```txt
GET  /recaps/tps/:tpsId
POST /recaps/tps/:tpsId/generate
POST /recaps/tps/:tpsId/validate
GET  /recaps/elections/:electionId
```

### 7.9 Documents

```txt
POST /documents/tps/:tpsId/chasil/generate
GET  /documents/tps/:tpsId/chasil/preview
GET  /documents/:documentId/download
GET  /documents/tps/:tpsId
```

### 7.10 Future Routes

```txt
POST /documents/tps/:tpsId/upload-signed
GET  /documents/tps/:tpsId/hash
GET  /witness/tps
POST /witness/tps/:tpsId/approve
POST /witness/tps/:tpsId/object
POST /finalization/tps/:tpsId
GET  /public/results
GET  /public/results/tps/:tpsId
```

---

## 8. Domain Model and Status Values

### 8.1 Election

Status:

```txt
DRAFT
ACTIVE
CLOSED
ARCHIVED
```

### 8.2 TPS

Status:

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

### 8.3 Voter

Verification status:

```txt
UNVERIFIED
VERIFIED
REJECTED
```

### 8.4 Voting Session

Status:

```txt
ACTIVE
USED
EXPIRED
CANCELLED
```

Implementation note:

```txt
The current implementation creates sessions directly as ACTIVE.
PENDING is not used in the current codebase.
```

### 8.5 Vote

Rules:

1. Belongs to election.
2. Belongs to TPS.
3. Belongs to one candidate pair.
4. Linked to one session.
5. `session_id` is unique.
6. No direct voter identity.
7. No blockchain write.

### 8.6 Recap

Validation status:

```txt
VALID
INVALID
```

### 8.7 Document

Current status:

```txt
GENERATED
```

Future statuses:

```txt
SIGNED_UPLOADED
HASHED
ANCHOR_READY
ANCHORED
```

### 8.8 Witness Verification

Future statuses:

```txt
PENDING
APPROVED
OBJECTED
ABSENT
NO_RESPONSE
```

---

## 9. Core Transactions

### 9.1 Vote Casting Transaction

Atomic operations:

```txt
validate active session
-> validate candidate pair
-> validate voter and TPS/election consistency
-> insert vote
-> update session status to USED and set used_at
-> update voter has_voted = true
```

Rollback if any step fails.

### 9.2 Recap Generation Transaction

Atomic operations:

```txt
compute vote totals
-> validate recap rules
-> upsert tps_recaps
-> replace recap candidate totals
-> update TPS status to RECAP_GENERATED only if valid
```

Rollback if any step fails.

### 9.3 Document Generation Operation

Operations:

```txt
fetch valid recap
-> render escaped print-ready HTML
-> write generated file to ignored directory
-> upsert document metadata
-> return preview/download URLs
```

No blockchain or signed upload in this operation.

---

## 10. C.Hasil-KWK-Inspired Document Architecture

Current strategy:

```txt
Print-ready HTML with inline CSS
Browser preview
Browser Save as PDF / print
Download as .html attachment
```

Files:

```txt
backend/src/services/chasilTemplate.ts
backend/src/services/documents.ts
backend/src/routes/documents.ts
backend/src/utils/htmlEscape.ts
```

Generated files:

```txt
backend/generated-documents/
backend/data/generated-documents/
```

Both directories must remain ignored by Git.

Security:

1. Escape all dynamic HTML values.
2. No external CDN resources.
3. No voter identity.
4. No official KPU claim.
5. Hash placeholders only until signed upload is implemented.
6. Blockchain hash placeholder only until finalization is implemented.

---

## 11. Security Architecture

Current protections:

1. RBAC middleware.
2. Password hashing with `bcryptjs`.
3. Safe JWT claims.
4. Prepared SQLite statements.
5. No raw NIK storage.
6. NIK-like demo data hashed server-side.
7. KPPS TPS access restriction.
8. Vote casting transaction.
9. Recap generation transaction.
10. Document HTML escaping.
11. No individual vote on blockchain.

Remaining security work:

1. Signed file MIME and size validation.
2. Secure upload storage.
3. SHA-256 hashing service.
4. Audit logging.
5. Audit hash generation.
6. Blockchain finalization access control.
7. Public API sanitization.
8. Legacy flow cleanup.

---

## 12. Environment Variables

Current implemented/needed backend variables:

```txt
PORT=5000
JWT_SECRET=change-this-secret-in-local-development
JWT_EXPIRES_IN=1h
VOTING_SESSION_EXPIRES_MINUTES=5
```

Future variables:

```txt
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=10
HARDHAT_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=
BLOCKCHAIN_PRIVATE_KEY=
CHAIN_ID=31337
```

Frontend likely needs:

```txt
VITE_API_BASE_URL=http://localhost:5000
```

Never expose blockchain private keys in frontend variables.

---

## 13. Blockchain Architecture

Current state:

```txt
Hardhat and Solidity project exists.
Current implemented local vote casting does not use blockchain.
Blockchain finalization is pending.
```

Target smart contract responsibility:

1. Store final TPS result once.
2. Store document hash.
3. Store audit log hash.
4. Store candidate totals.
5. Reject duplicate finalization.
6. Emit finalization event.

Do not store:

```txt
NIK
voter name
birth date
address
phone number
uploaded files
individual voter-linked data
```

---

## 14. Implementation Sequence

### Completed

1. Inspect project and create docs.
2. Remove anomaly detection scope.
3. Add SQLite persistence layer.
4. Add role-based auth.
5. Add election/TPS/candidate/DPT management APIs.
6. Add temporary voting session APIs.
7. Add local vote casting.
8. Add booth voting UI.
9. Add TPS recap generation and validation.
10. Add C.Hasil backend document generation.

### Next

```txt
11. Add signed form upload and SHA-256 hashing.
12. Add witness verification.
13. Add audit log/hash service.
14. Add blockchain finalization.
15. Add public result dashboard.
16. Add frontend role-based management workflows.
17. Clean legacy localStorage voter flow.
18. Add tests and demo documentation.
```

---

## 15. Testing Strategy

Current implementation has been manually/integration-tested through agent scripts, but formal test files are not yet established.

Recommended test targets:

1. Auth login and RBAC.
2. Election/TPS/candidate/voter CRUD.
3. KPPS assigned TPS restrictions.
4. Temporary session creation, conflict, expiry, cancel.
5. Booth polling response privacy.
6. Vote casting transaction.
7. Duplicate vote prevention.
8. Recap validation rules.
9. C.Hasil generation and HTML escaping.
10. Signed upload and hash after next implementation.
11. Witness status transitions.
12. Blockchain finalization once-only behavior.
13. Public API sanitization.

---

## 16. Documentation and Agent Rules

Coding agents must:

1. Read `PRD.md` and `ARCHITECTURE_E_VOTING.md` before changes.
2. Keep one feature/fix per branch.
3. Use npm only.
4. Not run `git push`.
5. Not open PRs.
6. Report files changed, commands run, tests, and recommended commit/push commands.
7. Ask or report uncertainty instead of guessing.
8. Not reintroduce anomaly/K-Means.
9. Not implement voter permanent login.
10. Not call blockchain for individual vote casting.
11. Not expose personal voter data.

---

## 17. Recommended Next Branch

```txt
feat/signed-form-upload-hashing
```

Expected scope:

1. Backend upload endpoint for signed result form.
2. Validate PDF/JPG/JPEG/PNG.
3. Store uploaded file outside public root.
4. Generate SHA-256 hash.
5. Update document metadata.
6. Return safe hash metadata.
7. No witness verification.
8. No blockchain finalization.

Recommended commit message:

```txt
feat: add signed form upload and hashing
```
