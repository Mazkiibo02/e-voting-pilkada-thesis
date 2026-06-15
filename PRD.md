# Product Requirements Document (PRD)

## Project Title

**Website E-Voting Pilkada Berbasis Blockchain**

## Document Date

2026-06-15

## Document Purpose

This PRD is the primary product and engineering reference for the ongoing refactor and development of the e-voting project.

This version reflects implementation progress completed through:

```txt
feat/chasil-backend-document-generation
```

All future code changes by any coding agent must follow this document and `ARCHITECTURE_E_VOTING.md`.

---

## 1. Product Overview

The system is a **Pilkada-level e-voting web application** that preserves the physical TPS voting process while replacing paper-based candidate selection, manual vote counting, and slow result reporting with a secure, local-first digital voting workflow.

The system supports or is designed to support:

1. Physical TPS operation.
2. In-person voter verification by KPPS officers.
3. Digital voting through a tablet or voting booth device.
4. Local-first voting and vote counting.
5. Automatic TPS result recap.
6. C.Hasil-KWK-inspired TPS result form generation.
7. Wet-signature workflow by KPPS and witnesses.
8. Upload of signed result document.
9. SHA-256 document hash generation.
10. Final TPS result anchoring to blockchain.
11. Witness verification.
12. Public transparency dashboard.

The system is designed for **Pilkada**, not village head elections.

---

## 2. Current Implementation Status

### 2.1 Completed

| Capability | Status |
|---|---|
| Remove K-Means/anomaly runtime scope | Done |
| SQLite database foundation | Done using Node `node:sqlite` |
| Role-based auth | Done for `ADMIN`, `KPPS`, `WITNESS` |
| Election management backend | Done |
| TPS management backend | Done |
| Candidate pair management backend | Done |
| DPT/voter management backend | Done |
| Temporary voting session backend | Done |
| Booth polling backend | Done |
| Local vote casting backend | Done |
| Booth/tablet voting UI | Done |
| TPS recap generation and validation | Done |
| Frontend C.Hasil preview workflow | Done |
| Backend C.Hasil-KWK-inspired form generation | Done as print-ready HTML |

### 2.2 Pending

| Capability | Status |
|---|---|
| Signed form upload | Pending |
| SHA-256 hash generation for uploaded signed form | Pending |
| Witness verification workflow | Pending |
| Audit log service and deterministic audit hash | Pending |
| Blockchain finalization | Pending |
| Public result dashboard backed by final data | Pending |
| Full frontend role-based dashboards | Pending |
| Legacy localStorage voter flow cleanup | Pending |
| Formal automated tests | Pending |
| README/demo script update | Pending |

---

## 3. Product Goals

1. Preserve the physical TPS model.
2. Replace paper candidate selection with digital booth voting.
3. Improve TPS recap speed and accuracy.
4. Improve transparency through public result and hash visibility.
5. Improve auditability through logs, document hashes, and blockchain anchoring.
6. Protect voter privacy.
7. Keep implementation realistic for an undergraduate thesis prototype.

---

## 4. Non-Goals and Hard Prohibitions

The system must not implement or reintroduce:

1. K-Means clustering.
2. TPS anomaly detection.
3. Full remote online voting.
4. Permanent voter login accounts.
5. Raw personal voter data on blockchain.
6. Uploaded document files on blockchain.
7. Claims that generated forms are official KPU legal forms.
8. Claims that hashing can detect all pre-upload image manipulation.
9. A full rewrite without clear need.

---

## 5. Target User Roles

### 5.1 ADMIN

Can:

1. Login.
2. Manage elections.
3. Manage TPS.
4. Manage candidate pairs.
5. Manage DPT/voters.
6. Manage users later.
7. Create and monitor voting sessions.
8. Generate and validate recaps.
9. Generate and download C.Hasil-KWK-inspired forms.
10. Upload signed form later.
11. Monitor witness verification later.
12. Finalize TPS to blockchain later.

### 5.2 KPPS

Can:

1. Login.
2. Access assigned TPS only.
3. Verify voter against DPT.
4. Create temporary voting session.
5. Cancel/expire session.
6. Generate assigned TPS recap.
7. Generate/download assigned TPS result form.
8. Upload signed form later.
9. Finalize assigned TPS later if allowed.

### 5.3 WITNESS

Current:

```txt
Role exists in auth seed data.
Full workflow pending.
```

Target:

1. Login.
2. View assigned TPS recap.
3. View signed form and hash.
4. Approve or object.
5. Upload objection evidence.
6. Never modify vote totals.

### 5.4 Voter

The voter is not a dashboard user.

The voter can:

1. Come physically to TPS.
2. Be verified by KPPS.
3. Vote only through temporary voting session on booth device.
4. Select and confirm one candidate pair.

The voter cannot:

1. Login permanently.
2. Access admin/KPPS/witness dashboards.
3. Vote remotely from personal device.

### 5.5 Public / Observer

Target public users can:

1. View election results.
2. View TPS recap.
3. View finalization status.
4. View document hash and blockchain transaction hash after finalization.

Public users cannot modify data or view DPT/personal voter data.

---

## 6. Current Core Flow

The implemented core flow is now:

```txt
ADMIN/KPPS login
-> Admin manages election/TPS/candidate/DPT data
-> KPPS/Admin creates temporary voting session
-> Booth polls active session
-> Booth displays candidate pairs
-> Voter selects candidate pair
-> Voter confirms vote
-> Backend stores vote locally in SQLite
-> Backend marks session USED
-> Backend marks voter has_voted true
-> TPS is closed by authorized user
-> Backend generates and validates TPS recap
-> Backend generates C.Hasil-KWK-inspired print-ready HTML result form
-> Form can be previewed/downloaded/printed
```

Pending continuation:

```txt
Signed form upload
-> SHA-256 hash generation
-> Witness verification
-> Audit hash generation
-> Blockchain finalization
-> Public transparency dashboard
```

---

## 7. Technical Product Requirements

### 7.1 Database

Use SQLite for thesis/demo local-first implementation.

Current implementation uses:

```txt
node:sqlite / DatabaseSync
backend/data/evoting.sqlite
```

Database file must remain ignored by Git.

Required tables include:

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

### 7.2 Authentication

System-user login is implemented through:

```txt
POST /auth/login
GET  /auth/me
POST /auth/logout
```

JWT payload must contain only safe system-user claims:

```json
{
  "sub": "user id",
  "role": "ADMIN | KPPS | WITNESS",
  "assignedTpsId": "number | null"
}
```

JWT must not contain voter personal data.

### 7.3 Election/TPS/Candidate/DPT Management

Backend APIs must support ADMIN CRUD and KPPS restricted reads.

Implemented resource groups:

```txt
/elections
/tps
/candidate-pairs
/voters
```

Voter privacy rules:

1. Never store raw NIK.
2. Hash NIK-like demo input server-side.
3. Prefer `voter_code` for visible demo identity.
4. Do not expose `nik_hash` by default.
5. Do not expose DPT publicly.

### 7.4 Temporary Voting Session

Implemented endpoints:

```txt
POST /voting-sessions
GET  /voting-sessions
GET  /voting-sessions/:id
GET  /voting-sessions/booth/:boothId/active
POST /voting-sessions/:id/cancel
POST /voting-sessions/:id/expire
```

Session statuses:

```txt
ACTIVE
USED
EXPIRED
CANCELLED
```

Rules:

1. Session is created after KPPS/Admin verification.
2. KPPS is restricted to assigned TPS.
3. Booth polling returns no personal voter data.
4. Session cannot be reused.
5. Expired/cancelled/used sessions cannot cast votes.

### 7.5 Vote Storage

Implemented endpoint:

```txt
POST /votes/cast
```

Rules:

1. Vote must use an active non-expired session.
2. Candidate pair must belong to same election.
3. Voter must belong to same election/TPS.
4. `votes.session_id` must be unique.
5. Vote insert, session update, and voter update must happen atomically.
6. No blockchain call during vote casting.
7. No personal voter data in response.

### 7.6 TPS Recap

Implemented endpoints:

```txt
GET  /recaps/tps/:tpsId
POST /recaps/tps/:tpsId/generate
POST /recaps/tps/:tpsId/validate
GET  /recaps/elections/:electionId
```

Validation rules:

1. Sum of candidate pair totals equals total valid votes.
2. Total valid votes <= total verified voters.
3. Total verified voters <= total registered voters.
4. Each voting session is used at most once.
5. Each used session has exactly one vote.
6. Each vote matches session election/TPS.
7. Candidate pair belongs to the election.
8. `has_voted` consistency is checked.

### 7.7 C.Hasil-KWK-Inspired Form

Current backend implementation generates print-ready HTML, not a native binary PDF.

Implemented endpoints:

```txt
POST /documents/tps/:tpsId/chasil/generate
GET  /documents/tps/:tpsId/chasil/preview
GET  /documents/:documentId/download
GET  /documents/tps/:tpsId
```

The document must be named:

```txt
C.Hasil-KWK-inspired TPS Result Form
```

Required disclaimer:

```txt
Dokumen ini merupakan formulir hasil TPS yang terinspirasi dari C.Hasil-KWK untuk kebutuhan prototipe akademik dan bukan formulir resmi KPU.
```

Current generation strategy:

1. Generate print-ready HTML.
2. Store generated file outside frontend public folder.
3. Store metadata in SQLite.
4. Allow preview and download.
5. Support browser print/Save as PDF.

Pending:

1. Signed form upload.
2. SHA-256 upload hash.
3. Blockchain transaction hash after finalization.

### 7.8 Signed Form Upload and Hashing

Pending next implementation.

Required endpoint:

```txt
POST /documents/tps/:tpsId/upload-signed
```

Requirements:

1. Accept PDF/JPG/JPEG/PNG.
2. Validate MIME type.
3. Validate file size.
4. Store securely outside public folder.
5. Compute SHA-256 hash from uploaded bytes.
6. Store hash and file metadata.
7. Return safe metadata.
8. Explain limitation: hash verifies post-upload integrity, not pre-upload authenticity.

### 7.9 Witness Verification

Pending.

Required statuses:

```txt
PENDING
APPROVED
OBJECTED
ABSENT
NO_RESPONSE
```

Witness must never modify vote totals.

### 7.10 Blockchain Finalization

Pending.

Blockchain must only store final TPS-level result and hashes:

1. Election ID.
2. TPS ID.
3. Candidate pair IDs and vote totals.
4. Total registered voters.
5. Total verified voters.
6. Total valid votes.
7. Total invalid votes.
8. Document hash.
9. Audit log hash.
10. Finalization timestamp.
11. Finalized by account/address.

Blockchain must not store voter identity or uploaded files.

---

## 8. Status Values

### Election

```txt
DRAFT
ACTIVE
CLOSED
ARCHIVED
```

### TPS

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

### Voter Verification

```txt
UNVERIFIED
VERIFIED
REJECTED
```

### Voting Session

```txt
ACTIVE
USED
EXPIRED
CANCELLED
```

### Recap Validation

```txt
VALID
INVALID
```

### Document

Current implemented:

```txt
GENERATED
```

Future values may include:

```txt
SIGNED_UPLOADED
HASHED
ANCHOR_READY
ANCHORED
```

---

## 9. API Contract Summary

Current backend uses no `/api` prefix.

```txt
/auth
/elections
/tps
/candidate-pairs
/voters
/voting-sessions
/votes
/recaps
/documents
```

Future APIs:

```txt
/witness
/finalization
/public
/audit
```

Prompts for coding agents must follow actual current route style unless the project is intentionally refactored.

---

## 10. AI Coding Agent Rules

Mandatory rules:

1. Read `PRD.md` and `ARCHITECTURE_E_VOTING.md` before code changes.
2. Do not reintroduce anomaly detection.
3. Do not reintroduce K-Means clustering.
4. Do not change project context from Pilkada.
5. Do not implement remote online voting.
6. Do not create permanent voter login.
7. Do not store raw NIK.
8. Do not put voter personal data in JWT.
9. Do not store personal voter data on blockchain.
10. Do not store uploaded file bytes on blockchain.
11. Do not claim generated forms are official KPU legal forms.
12. Do not overclaim hash-based tamper detection.
13. Use synthetic data only.
14. Preserve local-first TPS voting architecture.
15. Use npm only.
16. Keep one feature/fix per branch.
17. Do not run `git push`.
18. Do not open a pull request.
19. The user commits/pushes manually unless explicitly stated otherwise.
20. After implementation, report files changed, tests run, results, and recommended commands.

---

## 11. Updated Acceptance Criteria

### Already Satisfied

1. SQLite database foundation exists.
2. Role-based auth works for system users.
3. Admin can manage election/TPS/candidate/DPT via backend API.
4. KPPS can be restricted to assigned TPS.
5. Temporary voting sessions can be created.
6. Booth can poll active session.
7. Booth UI can display candidates and submit vote.
8. Local vote casting works.
9. Same session cannot vote twice.
10. TPS recap can be generated and validated.
11. C.Hasil-KWK-inspired form can be generated/previewed/downloaded as print-ready HTML.

### Still Required

1. KPPS signed form upload.
2. SHA-256 signed file hash generation.
3. Witness review/approval/objection.
4. Audit log hash generation.
5. Blockchain finalization.
6. Public result dashboard with document hash and transaction hash.
7. Full frontend role-based workflows.
8. Legacy localStorage voter flow cleanup.
9. Automated test suite.
10. Final README/demo scripts.

---

## 12. Next Recommended Implementation

Branch:

```txt
feat/signed-form-upload-hashing
```

Commit message:

```txt
feat: add signed form upload and hashing
```

Scope:

1. Upload signed/scanned result form.
2. Preview or return metadata for uploaded file.
3. Compute SHA-256 hash.
4. Store file path and hash in documents metadata.
5. Keep witness verification and blockchain finalization out of scope.
