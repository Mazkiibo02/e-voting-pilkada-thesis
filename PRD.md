# Product Requirements Document (PRD)

## Project Title

**Website E-Voting Pilkada Berbasis Blockchain**

## Document Purpose

This PRD is the primary product and engineering reference for the ongoing refactor and development of the e-voting project. The project already has an existing codebase and a partially working implementation. All future code changes by any coding agent must follow this document.

This PRD is intended to prevent implementation drift, especially drift back into the previous anomaly detection and K-Means direction.

---

## 1. Product Overview

The system is a **Pilkada-level e-voting web application** that preserves the physical TPS voting process while replacing paper-based candidate selection, manual vote counting, and slow result reporting with a secure, local-first digital voting workflow.

The system must support:

- Physical TPS operation.
- In-person voter verification by KPPS officers.
- Digital voting through a tablet or other voting booth device.
- Local-first voting and vote counting.
- Automatic TPS result recap.
- Downloadable C.Hasil-KWK-inspired TPS result form.
- Wet-signature workflow by TPS officers and witnesses.
- Upload of the signed result document.
- Document hash generation.
- Final TPS result anchoring to blockchain.
- Witness verification by party/candidate witnesses.
- Public transparency dashboard.

The system must be designed for **Pilkada**, not village head elections.

---

## 2. Background and Problem Statement

The conventional Pilkada workflow depends heavily on printed documents, manual vote counting, physical result transport, and result recapitulation workflows. These processes may cause:

- Slow result reporting.
- Potential manual counting errors.
- High operational dependency on physical documents.
- Limited immediate public transparency.
- Difficulty verifying whether uploaded result documents were altered after submission.
- High operational workload for KPPS.

The proposed system does not eliminate TPS, KPPS, or witnesses. Instead, it strengthens the TPS process by digitizing voting, recapitulation, document generation, witness verification, document hashing, and public result publication.

The system is inspired by the function of Sirekap and C.Hasil-KWK reporting, but it is not an official KPU application and must not claim to produce legally official KPU documents.

---

## 3. Product Goals

1. **Preserve the physical TPS model**
   - Voters still come to TPS.
   - KPPS still verifies voters.
   - Voting is still performed privately in a voting booth.

2. **Replace paper candidate selection with digital voting**
   - Candidate pair ballots are displayed on a tablet or voting booth device.
   - Voters cast their vote digitally.

3. **Improve recapitulation speed**
   - Votes are counted automatically by the local TPS system.
   - TPS recap is generated immediately after voting closes.

4. **Improve transparency**
   - Public users can view results per TPS.
   - Public users can view finalization status.
   - Public users can view document hashes.

5. **Improve auditability**
   - System records audit logs for important election events.
   - Final TPS results and hashes are anchored to blockchain.

6. **Reduce selected operational costs**
   - Reduce document duplication.
   - Reduce physical result transport.
   - Reduce manual recap workload.
   - Support conservative KPPS reduction scenario.

7. **Protect voter privacy**
   - Do not store real personal voter data permanently.
   - Do not store personal voter data on blockchain.
   - Use temporary voting sessions instead of permanent voter login accounts.

---

## 4. Non-Goals

The system must not implement the following:

1. **No anomaly detection**
   - Do not implement K-Means clustering.
   - Do not implement TPS anomaly detection.
   - Remove any existing anomaly detection references from UI, API, routes, services, or documentation.

2. **No full online remote voting**
   - Voters must not vote from personal devices at home.
   - Voting must happen at TPS after KPPS verification.

3. **No permanent voter login**
   - Voters do not have permanent usernames or passwords.
   - Voters vote through temporary TPS voting sessions created by KPPS.

4. **No direct storage of personal voter data on blockchain**
   - Never store NIK, name, birth date, address, phone number, or voter identity on blockchain.

5. **No claim of official KPU legal document**
   - The generated result form is inspired by C.Hasil-KWK structure.
   - It is not an official KPU legal document.

6. **No claim of full forensic image tampering detection**
   - The system verifies integrity after upload using hashing and blockchain anchoring.
   - The system does not claim it can fully detect Photoshop or pre-upload manipulation.

7. **No total rewrite unless necessary**
   - The current project is already partially implemented.
   - Refactor incrementally and preserve working code where possible.

---

## 5. Current Project Context

The current project has the following known structure:

```txt
backend/
blockchain/
frontend/
package.json
package-lock.json
start-all.js
demo.js
README.md
```

Known technology stack:

```txt
Frontend:
- React
- Vite
- React Router v6
- TypeScript / TSX currently exists in frontend files

Backend:
- Node.js
- Express
- TypeScript

Blockchain:
- Solidity
- Hardhat
- ethers.js

Package Manager:
- npm
```

Current implementation already includes partial voting, backend API, blockchain integration, candidate dashboard, dummy voter seeding, and demo automation.

The refactor must transform the existing system into the Pilkada local-first e-voting architecture described in this PRD.

---

## 6. Target Architecture

The recommended architecture is **hybrid local-first**.

### 6.1 Local TPS Layer

The local TPS layer handles the core voting process:

```txt
KPPS Officer App
    -> Local Backend
        -> Voting Booth Device
        -> Local Vote Storage
        -> TPS Recap Generator
        -> Result Form Generator
```

Responsibilities:

- Voter verification using local DPT data.
- Temporary voting session creation.
- Voting booth activation.
- Vote casting.
- One-vote-only enforcement.
- Local vote counting.
- TPS result generation.
- Form download.
- Signed form upload.
- Document hash generation.

### 6.2 Central / Public Layer

For the current thesis/demo implementation, the central layer may run inside the same backend but must be separated logically by module.

Responsibilities:

- Admin monitoring.
- Public result dashboard.
- Witness verification.
- TPS finalization.
- Blockchain anchoring.

### 6.3 Blockchain Layer

Blockchain must only store final, non-sensitive election records:

- TPS ID.
- Election ID.
- Candidate vote totals.
- Total registered voters.
- Total verified voters.
- Total valid votes.
- Total invalid votes if supported.
- Document hash.
- Audit log hash.
- Finalization timestamp.

Blockchain must not store personal voter data.

---

## 7. Recommended Database

For the current thesis/demo version, use:

```txt
SQLite
```

Reason:

- Lightweight.
- Easy to run locally.
- Suitable for local-first TPS simulation.
- No external database server required.
- Better than memory arrays.
- Easier to migrate later to MySQL or PostgreSQL.

Future production-like migration can use:

```txt
Local TPS: SQLite
Central Server: PostgreSQL or MySQL
```

---

## 8. User Roles and Permissions

### 8.1 Authenticated Roles

#### 1. Admin Pusat

Permissions:

- Login to admin dashboard.
- Manage election data.
- Manage TPS data.
- Manage candidate pair data.
- Manage voter/DPT data.
- Manage user accounts.
- Monitor voting results.
- Monitor TPS status.
- View uploaded TPS result documents.
- View witness verification status.
- View blockchain finalization status.

#### 2. Petugas TPS / KPPS

Permissions:

- Login to TPS officer dashboard.
- Verify voter data against DPT.
- Grant voting access.
- Manage active TPS voting session.
- Close TPS voting session.
- Generate TPS recap.
- Download/print TPS result form.
- Upload signed TPS result form.
- Finalize TPS result if allowed.
- View local TPS result and document hash.

#### 3. Saksi Parpol / Saksi Pasangan Calon

Permissions:

- Login to witness dashboard.
- View assigned TPS recap.
- Check vote count consistency.
- Approve TPS result.
- Submit objection.
- Upload objection evidence.
- Add digital witness verification/signature.
- View uploaded result form and hash.

### 8.2 Unauthenticated Actors

#### 4. Voter / Pemilih

Permissions:

- Vote only after KPPS grants temporary access.
- Select candidate pair.
- Confirm vote.
- Cannot login permanently.
- Cannot access dashboards.

#### 5. Publik / Observer

Permissions:

- View public election result.
- View recap per TPS.
- View TPS finalization status.
- View document hash.
- No login required.
- Cannot modify any data.

---

## 9. End-to-End Election Flow

### 9.1 Before Voting Day

1. Admin creates election.
2. Admin creates TPS data.
3. Admin creates candidate pair data.
4. Admin imports or seeds DPT/voter data.
5. Admin creates KPPS user accounts.
6. Admin creates witness accounts and assigns them to TPS or candidate pair.
7. Admin prepares the election session.

### 9.2 Voter Arrival and Verification

1. Voter comes physically to TPS.
2. Voter goes to verification desk.
3. KPPS officer inputs voter identity information.
4. System checks voter against local DPT.
5. If voter is valid and has not voted:
   - system creates a temporary voting session.
   - system marks the voter as verified or present.
6. If voter is invalid or has already voted:
   - system rejects voting access.

### 9.3 Voting Booth Flow

1. Voting booth device waits for an active session.
2. Voting booth checks session status using polling.
3. When KPPS grants access, the booth displays candidate pairs.
4. Voter selects one candidate pair.
5. Voter confirms selection.
6. System stores vote locally.
7. System marks the session as used.
8. System prevents the same voter/session from voting again.
9. Booth returns to waiting mode.

### 9.4 TPS Closing and Recap

1. KPPS closes TPS voting session.
2. System counts all valid votes.
3. System generates TPS recap.
4. System validates:
   - total valid votes equals total candidate votes.
   - total votes does not exceed verified voters.
   - verified voters does not exceed DPT.
   - each session is used at most once.
5. System generates C.Hasil-KWK-inspired TPS result form.
6. KPPS downloads and prints the result form.
7. KPPS and relevant witnesses sign the printed form manually.

### 9.5 Signed Form Upload

1. KPPS scans or photographs the signed result form.
2. KPPS uploads the signed result form to the system.
3. System stores the uploaded file.
4. System calculates file hash.
5. System associates the hash with the TPS result.
6. System shows uploaded document preview and hash.

### 9.6 Witness Verification

1. Witness logs in.
2. Witness views assigned TPS recap.
3. Witness checks:
   - DPT count.
   - verified voter count.
   - valid vote count.
   - candidate pair vote totals.
   - uploaded result form.
   - document hash.
4. Witness may approve the result.
5. Witness may submit objection.
6. Witness may upload objection evidence.
7. System records witness status in audit log.

Witness approval is recommended but finalization must not depend on all witnesses approving, because some witnesses may be absent or may refuse to respond. The system must record all witness statuses.

### 9.7 Finalization and Blockchain Anchoring

1. TPS result is finalized by authorized user.
2. System generates audit log hash.
3. System sends final TPS result and hashes to blockchain.
4. Blockchain stores immutable final TPS record.
5. System stores blockchain transaction hash.
6. Public result page displays TPS final status and hash data.

---

## 10. C.Hasil-KWK-Inspired Result Form Requirements

The system must generate a downloadable PDF result form inspired by the Pilkada C.Hasil-KWK structure.

### 10.1 Important Naming Rule

Use this wording in UI and code comments:

```txt
C.Hasil-KWK-inspired TPS Result Form
```

Avoid claiming:

```txt
Official KPU C.Hasil-KWK Form
```

### 10.2 Form Must Be Auto-Filled

The generated form must be automatically filled from system data.

Required fields:

#### Election Metadata

- Election name.
- Election type:
  - Governor and Vice Governor.
  - Mayor and Vice Mayor.
  - Regent and Vice Regent.
- Province.
- City/regency.
- District.
- Village/subdistrict.
- TPS number.
- TPS code.
- Voting date.
- Voting start time.
- Voting end time.
- Counting start time.
- Counting end time.

#### Officer Metadata

- KPPS officer name.
- Officer role.
- Optional device/session ID.
- TPS assignment.

#### Voter and Participation Data

- Total DPT voters.
- DPT male count.
- DPT female count.
- Verified/present voters.
- Present male count.
- Present female count.
- DPTb count if supported.
- DPK count if supported.
- Voters with disabilities if supported.

#### Digital Voting Usage Data

Because this is an e-voting system, adapt the paper ballot section into digital voting usage data:

- Total voting rights available.
- Total voting sessions created.
- Total voting sessions used.
- Total cancelled/invalid sessions if supported.
- Total unused voting rights.

#### Candidate Pair Vote Result

For every candidate pair:

- Candidate pair number.
- Candidate 1 full name with title.
- Candidate 2 full name with title.
- Supporting party or supporting coalition if available.
- Total valid votes.
- Vote total in words if supported.

#### Valid and Invalid Vote Summary

- Total valid votes.
- Total invalid votes if supported.
- Total valid + invalid votes.
- Validation status.

#### Signature Areas

The PDF must include signature areas for:

- KPPS chair.
- KPPS members if needed.
- Witnesses from candidate pairs or supporting parties.
- Optional supervisor/Panwascam/Panwaskel placeholder if needed for simulation.

#### Security and Verification Area

The PDF must include:

- QR code for document verification.
- Document ID.
- TPS result hash.
- Generated timestamp.
- System signature placeholder if implemented.
- Blockchain transaction hash after finalization if already available.

### 10.3 Download, Print, Sign, Upload Flow

The form workflow must be:

```txt
Generate recap
-> Download PDF form
-> Print form
-> Manual wet signature by KPPS/witnesses
-> Scan or photograph signed form
-> Upload signed form
-> Generate file hash
-> Store file hash
-> Finalize TPS result
-> Anchor hash and result to blockchain
```

### 10.4 Document Integrity Limitation

The system can verify that an uploaded document has not changed after upload by comparing hashes. The system does not guarantee that the image or scan was not manipulated before upload.

---

## 11. Data Privacy and Data Retention

### 11.1 Personal Data Rules

Never store real citizen data in the demo.

For development:

- Use synthetic DPT seed data only.
- Use fictional names, NIK-like identifiers, and birth dates.
- Do not use real NIK, phone numbers, addresses, or identities.

### 11.2 Voter Identity Storage

The system may temporarily process voter identity for verification.

Permanent storage must minimize sensitive information:

Recommended:

- Store synthetic voter ID.
- Store hashed NIK-like identifier if needed.
- Store TPS assignment.
- Store verification status.
- Store voted status.

Avoid storing:

- Real NIK.
- Real phone number.
- Real address.
- Real family data.
- Personal voter identity on blockchain.

### 11.3 Post-Election Data Purge

The system should support a post-election data destruction concept:

```txt
Finalize election
-> purge temporary voting sessions
-> purge temporary identity verification cache
-> retain anonymized election result
-> retain audit hash
-> retain document hash
-> retain blockchain transaction hash
```

This is a digital equivalent of limiting sensitive voter data retention.

---

## 12. Voting Session Requirements

Voters must not login using permanent accounts.

Instead:

1. KPPS verifies the voter.
2. Backend creates a temporary voting session.
3. Voting booth polls for active session.
4. Voting booth receives only session data, not personal voter data.
5. Session expires after a short time or after vote is cast.
6. Session cannot be reused.
7. Each voter can only receive one valid used session.

Recommended polling interval:

```txt
1 to 2 seconds
```

WebSocket may be implemented later, but polling is the recommended first implementation for stability and simplicity.

---

## 13. Vote Storage Rules

During TPS operation, votes are stored locally in the backend database.

Each vote record must:

- Belong to an election.
- Belong to a TPS.
- Belong to one candidate pair.
- Be linked to a temporary session ID.
- Not expose voter personal data.
- Be immutable after cast.
- Be counted only once.

The system must enforce:

```txt
one valid session = maximum one vote
```

---

## 14. Recap Validation Rules

Before TPS can be finalized, the system must validate:

```txt
total_candidate_votes == total_valid_votes
total_valid_votes <= total_verified_voters
total_verified_voters <= total_registered_voters
each_session_used_at_most_once == true
signed_result_form_uploaded == true
document_hash_exists == true
```

If witness approval is implemented, finalization can proceed even if not all witnesses approve, but the system must store witness status.

---

## 15. Blockchain Requirements

### 15.1 Blockchain Scope

Blockchain is used for anchoring final TPS result integrity, not for storing all raw votes or personal data.

### 15.2 Data to Store On-Chain

The smart contract should store:

- Election ID.
- TPS ID.
- Candidate pair IDs.
- Candidate vote totals.
- Total registered voters.
- Total verified voters.
- Total valid votes.
- Total invalid votes if supported.
- Document hash.
- Audit log hash.
- Finalized by address/account.
- Finalization timestamp.

### 15.3 Data Not Allowed On-Chain

Never store:

- Voter NIK.
- Voter name.
- Voter birth date.
- Voter address.
- Phone number.
- Uploaded document file.
- Raw audit log.
- Vote linked to voter identity.

### 15.4 Smart Contract Behavior

The smart contract must:

- Allow finalizing a TPS only once.
- Reject duplicate TPS finalization.
- Allow reading finalized TPS result.
- Emit an event when TPS is finalized.
- Store hashes as strings or bytes32.
- Avoid unnecessary complex logic.

---

## 16. Witness Verification Requirements

Witness verification is an important part of the Pilkada process.

Witnesses must be able to:

- Login.
- View assigned TPS.
- View candidate pair result.
- View total registered voters.
- View total verified voters.
- View total valid votes.
- View uploaded signed form.
- View document hash.
- Approve result.
- Submit objection.
- Upload evidence.
- Add digital verification/signature.

Witnesses must not be able to:

- Modify vote count.
- Modify voter data.
- Modify candidate data.
- Modify uploaded TPS form.
- Finalize blockchain result unless explicitly allowed later.

Witness statuses:

```txt
PENDING
APPROVED
OBJECTED
ABSENT
NO_RESPONSE
```

---

## 17. Public Transparency Requirements

Public users must be able to view:

- Election overview.
- Candidate pair list.
- Total votes per candidate pair.
- Result per TPS.
- TPS finalization status.
- Uploaded result document metadata.
- Document hash.
- Blockchain transaction hash if available.

Public users must not be able to:

- View personal voter data.
- View sensitive KPPS personal data.
- Modify any data.
- Download private internal audit logs.
- See raw DPT data.

---

## 18. Suggested Backend Modules

The backend should be organized by modules:

```txt
backend/src/
  app.ts
  server.ts
  config/
  database/
  modules/
    auth/
    users/
    elections/
    tps/
    candidates/
    voters/
    voting-sessions/
    votes/
    recap/
    documents/
    witnesses/
    blockchain/
    audit/
  middleware/
  utils/
```

### 18.1 Module Responsibilities

#### auth

- Login for admin, KPPS, and witness.
- JWT-based authentication.
- Role-based authorization.

#### users

- User management.
- Role assignment.

#### elections

- Election setup.
- Election type.
- Election status.

#### tps

- TPS creation.
- TPS status.
- TPS assignment.

#### candidates

- Candidate pair data.
- Full names with academic/professional titles.
- Party/supporting coalition data.

#### voters

- DPT data.
- Synthetic voter seed.
- Verification status.
- Hashed identity if needed.

#### voting-sessions

- Temporary session creation.
- Session expiration.
- Session used status.
- Booth polling endpoint.

#### votes

- Cast vote.
- Prevent duplicate vote.
- Store local vote.

#### recap

- Generate TPS recap.
- Validate result consistency.
- Prepare result data for PDF.

#### documents

- Generate C.Hasil-KWK-inspired PDF.
- Upload signed form.
- Generate file hash.
- Store document metadata.

#### witnesses

- Witness assignment.
- Witness approval.
- Witness objection.
- Evidence upload.

#### blockchain

- Load contract ABI.
- Connect to local Hardhat provider.
- Submit final TPS result.
- Store transaction hash.

#### audit

- Record important events.
- Generate audit log hash.

---

## 19. Suggested Frontend Structure

```txt
frontend/src/
  app/
  routes/
  layouts/
  pages/
    admin/
    officer/
    booth/
    witness/
    public/
  components/
  features/
    auth/
    elections/
    tps/
    candidates/
    voters/
    voting/
    recap/
    documents/
    witnesses/
    dashboard/
  services/
  stores/
  utils/
```

### 19.1 Main Pages

#### Admin

- Login page.
- Dashboard.
- Election management.
- TPS management.
- Candidate pair management.
- Voter/DPT management.
- User management.
- Result monitoring.
- TPS status monitoring.

#### Officer / KPPS

- Login page.
- TPS dashboard.
- Voter verification page.
- Grant voting access page.
- TPS session management.
- TPS recap page.
- Download result form page.
- Upload signed form page.
- Finalization page.

#### Booth

- Waiting screen.
- Candidate pair selection screen.
- Vote confirmation screen.
- Vote success screen.
- Session expired screen.

#### Witness

- Login page.
- Assigned TPS list.
- TPS recap detail.
- Document preview/hash.
- Approve result.
- Submit objection.
- Upload evidence.

#### Public

- Public result dashboard.
- Result per TPS.
- Candidate pair result.
- Finalization status.
- Document hash viewer.

---

## 20. Suggested API Endpoints

Endpoint names may be adjusted based on current project conventions.

```txt
POST   /api/auth/login

GET    /api/elections
POST   /api/elections
GET    /api/elections/:id

GET    /api/tps
POST   /api/tps
GET    /api/tps/:id
PATCH  /api/tps/:id/status

GET    /api/candidates
POST   /api/candidates
PATCH  /api/candidates/:id

GET    /api/voters
POST   /api/voters/seed
POST   /api/voters/verify

POST   /api/voting-sessions
GET    /api/voting-sessions/booth/:boothId/active
POST   /api/voting-sessions/:id/cancel

POST   /api/votes/cast

GET    /api/recap/tps/:tpsId
POST   /api/recap/tps/:tpsId/generate

GET    /api/documents/tps/:tpsId/form
POST   /api/documents/tps/:tpsId/upload-signed
GET    /api/documents/tps/:tpsId/hash

GET    /api/witness/tps
POST   /api/witness/tps/:tpsId/approve
POST   /api/witness/tps/:tpsId/object
POST   /api/witness/tps/:tpsId/evidence

POST   /api/finalization/tps/:tpsId
GET    /api/finalization/tps/:tpsId

GET    /api/public/results
GET    /api/public/results/tps/:tpsId
```

---

## 21. Required Status Values

### Election Status

```txt
DRAFT
READY
OPEN
CLOSED
FINALIZED
```

### TPS Status

```txt
NOT_STARTED
OPEN
CLOSED
RECAP_GENERATED
FORM_DOWNLOADED
SIGNED_FORM_UPLOADED
WITNESS_REVIEW
FINALIZED
BLOCKCHAIN_ANCHORED
```

### Voting Session Status

```txt
PENDING
ACTIVE
USED
EXPIRED
CANCELLED
```

### Witness Status

```txt
PENDING
APPROVED
OBJECTED
ABSENT
NO_RESPONSE
```

### Document Status

```txt
NOT_GENERATED
GENERATED
DOWNLOADED
SIGNED_UPLOADED
HASHED
ANCHOR_READY
ANCHORED
```

---

## 22. Refactor Plan

### Phase 1: Remove Anomaly Detection Context

- Remove anomaly detection UI.
- Remove anomaly API endpoints.
- Remove K-Means references.
- Remove unused anomaly data services.
- Update navigation and labels.

### Phase 2: Add Database Layer

- Add SQLite.
- Add migrations or schema initialization.
- Move away from memory-only state.
- Seed synthetic Pilkada data.

### Phase 3: Role-Based Auth

- Implement admin, KPPS, and witness roles.
- Protect routes by role.
- Keep public routes open.

### Phase 4: TPS Officer Flow

- Implement voter verification.
- Implement voting access grant.
- Implement TPS session management.

### Phase 5: Voting Booth Flow

- Implement booth polling.
- Implement candidate pair display.
- Implement vote confirmation.
- Implement one-session-one-vote rule.

### Phase 6: TPS Recap

- Implement automatic recap.
- Implement validation rules.
- Implement TPS status transitions.

### Phase 7: C.Hasil-KWK-Inspired Form

- Generate PDF result form.
- Auto-fill election, TPS, candidate pair, and vote result data.
- Include signature areas.
- Include QR/hash fields.
- Support download.

### Phase 8: Signed Document Upload

- Upload signed scan/photo.
- Generate SHA-256 hash.
- Store document metadata.
- Prepare for blockchain anchoring.

### Phase 9: Witness Verification

- Implement witness dashboard.
- Implement approval and objection.
- Implement evidence upload.
- Store witness statuses.

### Phase 10: Blockchain Finalization

- Update smart contract.
- Finalize TPS once.
- Store final TPS result and hashes.
- Store transaction hash in backend.

### Phase 11: Public Dashboard

- Show total results.
- Show result per TPS.
- Show finalization status.
- Show document hash and blockchain transaction.

### Phase 12: Demo and UI Polish

- Improve UI/UX.
- Improve responsive design.
- Add loading and error states.
- Improve dashboard layout.
- Update README and demo script.

---

## 23. AI Coding Agent Rules

These rules are mandatory.

1. Always read this PRD before changing code.
2. Do not reintroduce anomaly detection.
3. Do not reintroduce K-Means clustering.
4. Do not change the project back to village head election context.
5. The system context is Pilkada.
6. Do not implement full remote online voting.
7. Do not create permanent voter login accounts.
8. Do not store real voter identity on blockchain.
9. Do not store uploaded document files on blockchain.
10. Do not claim generated forms are official KPU legal forms.
11. Use synthetic voter data only for development.
12. Preserve local-first TPS voting architecture.
13. Refactor incrementally; avoid unnecessary full rewrite.
14. Keep frontend, backend, and blockchain separated by responsibility.
15. Use npm as the package manager.
16. Before large changes, create a short implementation plan.
17. After changes, update relevant documentation.
18. Maintain clear role-based permissions.
19. Keep public pages read-only.
20. Keep witness role read/verify/approve/object only.
21. Never allow witnesses to modify vote counts.
22. Never allow voters to access dashboards.
23. Never expose raw DPT data to public pages.
24. Ensure all finalization actions are auditable.
25. Ensure final TPS result cannot be changed after blockchain anchoring.

---

## 24. Acceptance Criteria

### Core Election Flow

- Admin can create and manage election, TPS, candidate pairs, voter data, and users.
- KPPS can verify voter data.
- KPPS can grant temporary voting access.
- Voting booth can detect active session.
- Voter can select and confirm one candidate pair.
- Vote is stored locally.
- Same session cannot vote twice.
- Same voter cannot receive a second used voting session.

### TPS Recap

- KPPS can close TPS.
- System can generate recap.
- Candidate pair vote totals are correct.
- Total valid votes equals sum of candidate pair votes.
- Total valid votes does not exceed verified voters.
- Verified voters does not exceed DPT.

### C.Hasil-KWK-Inspired Form

- System can generate downloadable PDF.
- PDF includes election metadata.
- PDF includes TPS metadata.
- PDF includes candidate pair names with titles.
- PDF includes party/supporting coalition information if available.
- PDF includes vote totals.
- PDF includes total valid and invalid votes.
- PDF includes signature areas.
- PDF includes QR/hash verification fields.

### Signed Form and Hash

- KPPS can upload signed result form.
- System calculates SHA-256 hash.
- System stores document metadata.
- System displays hash to authorized users and public page.

### Witness Verification

- Witness can login.
- Witness can view assigned TPS recap.
- Witness can approve or object.
- Witness can upload evidence.
- Witness cannot edit vote totals.

### Blockchain Finalization

- Authorized user can finalize TPS.
- System sends final TPS result and hashes to blockchain.
- Blockchain rejects duplicate finalization.
- Backend stores transaction hash.
- Public page displays finalization status and hash.

### Public Transparency

- Public users can view total results.
- Public users can view result per TPS.
- Public users can view document hash.
- Public users cannot see voter personal data.

---

## 25. Security Requirements

- Use JWT for authenticated dashboard users.
- Apply role-based authorization middleware.
- Validate all request bodies.
- Sanitize uploaded file names.
- Restrict upload MIME types.
- Limit upload file size.
- Generate file hash server-side.
- Never trust frontend-calculated totals.
- Recalculate recap on backend.
- Do not expose private keys in frontend.
- Do not commit private keys or secrets.
- Use `.env` for environment variables.
- Keep blockchain private key in backend/server environment only if signing is needed.
- Use provider-only mode when writing transactions is not required.
- Store only non-sensitive data on blockchain.

---

## 26. UX Requirements

The UI should be simple, clean, and suitable for election operation.

Priority:

- Clear navigation by role.
- Large buttons for voting booth.
- Clear candidate pair cards.
- Confirmation step before vote submission.
- Visible TPS status.
- Visible recap validation status.
- Clear upload status.
- Clear witness status.
- Clear public result visualization.

Voting booth UI must be optimized for tablet usage.

---

## 27. Terminology

Use these terms consistently:

```txt
Pilkada
TPS
KPPS
DPT
DPTb
DPK
Pasangan Calon
Saksi Parpol
Saksi Pasangan Calon
C.Hasil-KWK-inspired TPS Result Form
Rekap Hasil TPS
Finalisasi Hasil TPS
Hash Dokumen
Audit Log Hash
Blockchain Anchoring
Temporary Voting Session
Local-First TPS
```

Avoid these outdated or incorrect terms:

```txt
Kepala Desa
Anomaly Detection
K-Means
Dummy DPT in user-facing UI
Official KPU Form
Remote Online Voting
Permanent Voter Login
```

For development code and seeders, synthetic data is allowed, but user-facing labels must use real-system terminology such as **Data Voter** or **DPT**, not **Dummy DPT**.

---

## 28. Notes for Thesis Alignment

The system should be described as:

```txt
A Pilkada-level e-voting website using local-first TPS operation and blockchain-based final result integrity anchoring.
```

The research emphasis is:

- Digital voting process at TPS.
- Faster TPS recap.
- C.Hasil-KWK-inspired digital result document.
- Witness verification.
- Public transparency.
- Blockchain integrity anchoring.
- Privacy-preserving voter verification.

The system must not be presented as replacing all official legal election infrastructure. It is a prototype and academic system design.

---

## 29. Recommended Agent Workflow

Before modifying the existing project, the coding agent should follow this workflow:

1. Read `PRD.md` fully.
2. Inspect the current codebase.
3. Create or update `CURRENT_STATE.md` describing the existing implementation.
4. Create or update `GAP_ANALYSIS.md` comparing current implementation against this PRD.
5. Propose an incremental implementation plan.
6. Implement one phase at a time.
7. Test each phase before moving to the next.
8. Update README or technical notes after meaningful changes.

The coding agent must not make broad architecture changes without tying them back to this PRD.

---

## 30. Final Implementation Principle

The most important design principle is:

```txt
Voting must be fast and local.
Results must be transparent.
Final records must be tamper-evident.
Voter privacy must be protected.
The system must remain realistic for TPS-based Pilkada operation.
```
