# Technical Architecture Document / TDD

**Project Name:** Website E-Voting Pilkada Berbasis Blockchain  
**Document Type:** Technical Architecture Document / Technical Design Document  
**Primary Audience:** AI coding agent, developer, thesis implementation maintainer  
**Package Manager:** npm  
**Project Scope:** Pilkada-level TPS-based e-voting prototype with local-first operation, C.Hasil-KWK-inspired result form, witness verification, and blockchain final result anchoring.

---

## 1. Architecture Intent

This document defines the technical architecture for refactoring the existing half-built e-voting project into a Pilkada-level local-first e-voting system.

The architecture must keep the project aligned with the latest product direction:

- The system is for **Pilkada**, not village head elections.
- The system preserves the physical TPS process.
- The system replaces paper-based candidate selection with digital voting on a tablet or booth device.
- The system replaces slow manual recapitulation with automatic TPS recap.
- The system generates a downloadable **C.Hasil-KWK-inspired TPS Result Form**.
- The system supports manual wet signatures and signed form upload.
- The system hashes uploaded documents and anchors final TPS result integrity to blockchain.
- The system supports witness verification by Saksi Parpol / Saksi Pasangan Calon.
- The system provides a public transparency dashboard.
- The system must remove the old anomaly detection and K-Means direction.

This document is not a generic architecture document. It is an implementation guardrail for the existing project.

---

## 2. Current Project Baseline

The existing project is known to use this root structure:

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

Known stack:

```txt
Frontend:
- React
- Vite
- React Router v6
- TypeScript / TSX files exist

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

The current project already has partial implementation for voting, candidates, backend API, blockchain integration, dummy vote seeding, and automation scripts. The target architecture must refactor incrementally instead of blindly rewriting the project.

---

## 3. High-Level System Architecture

The target architecture is **hybrid local-first**.

Voting and TPS operations run locally first. Public recap and blockchain anchoring happen after TPS data is finalized.

```txt
+-----------------------+          +-------------------------+
|  Admin / Public UI    |          | Witness Verification UI |
+-----------+-----------+          +------------+------------+
            |                                   |
            v                                   v
+------------------------------------------------------------+
|                    Express Backend API                     |
|                                                            |
|  Auth | TPS | Voters | Sessions | Votes | Recap | Docs     |
|  Witness | Public Results | Audit | Blockchain Adapter      |
+--------------------------+---------------------------------+
                           |
                           v
+------------------------------------------------------------+
|                       SQLite Database                      |
|  Elections | TPS | Candidates | Voters | Sessions | Votes  |
|  Recaps | Documents | Witnesses | Audit Logs | Tx Records |
+--------------------------+---------------------------------+
                           |
                           v
+------------------------------------------------------------+
|                  Hardhat Local Blockchain                  |
|       Final TPS Result + Document Hash + Audit Hash        |
+------------------------------------------------------------+
```

TPS operation model:

```txt
KPPS Officer App
    -> verifies voter against local DPT
    -> grants temporary voting session

Voting Booth Device
    -> polls backend for active session
    -> displays candidate pairs
    -> casts one vote
    -> returns to waiting mode

Backend
    -> stores local vote
    -> enforces one-session-one-vote
    -> generates TPS recap
    -> generates result form
    -> handles signed form upload
    -> hashes document
    -> finalizes result to blockchain
```

---

## 4. Core Architecture Principles

### 4.1 Voting Must Be Local-First

Voting must not depend on external internet connectivity during the TPS voting process.

Local-first is required for:

- Speed.
- Reliability.
- Reduced network dependency.
- Reduced attack surface.
- Realistic TPS operation.

### 4.2 Blockchain Is for Final Integrity, Not Raw Voting

The blockchain must only store final TPS-level result records and hashes.

Do not store:

- Raw voter identity.
- NIK.
- Name.
- Birth date.
- Address.
- Uploaded files.
- Individual vote linked to voter identity.

### 4.3 Voter Does Not Have Permanent Login

The voter is not an authenticated dashboard user. The voter receives temporary access after KPPS verification.

### 4.4 C.Hasil-KWK-Inspired Form Is a System Output

The system must generate a PDF form inspired by Pilkada C.Hasil-KWK structure. It must not claim to generate an official KPU legal document.

### 4.5 Witnesses Verify, But Do Not Modify Results

Witnesses may approve, object, upload evidence, and add digital verification. They must never be allowed to modify vote totals.

### 4.6 Privacy by Design

The system must minimize personal data storage. Real citizen data must not be used in development.

### 4.7 Incremental Refactor

The current project is already partially built. The coding agent should refactor by phases and preserve working modules when possible.

---

## 5. Target Runtime Components

### 5.1 Frontend Runtime

Technology:

```txt
React
Vite
React Router v6
TypeScript / TSX
CSS or existing styling approach
```

Responsibilities:

- Role-based pages.
- Voting booth interface.
- KPPS officer workflow.
- Admin dashboard.
- Witness dashboard.
- Public result dashboard.
- PDF download trigger.
- Signed form upload UI.

### 5.2 Backend Runtime

Technology:

```txt
Node.js
Express
TypeScript
JWT
SQLite
ethers.js
```

Responsibilities:

- Authentication.
- Authorization.
- Database access.
- TPS state machine.
- Voter verification.
- Voting session management.
- Vote casting.
- Recap generation.
- C.Hasil-KWK-inspired PDF generation.
- File upload.
- SHA-256 document hash generation.
- Witness verification.
- Blockchain finalization adapter.
- Public result API.

### 5.3 Database Runtime

Recommended:

```txt
SQLite
```

Reason:

- Simple local deployment.
- Suitable for local-first TPS simulation.
- No external server required.
- Better than memory arrays.
- Easy to seed and reset for demo.

### 5.4 Blockchain Runtime

Technology:

```txt
Solidity
Hardhat
ethers.js
```

Responsibilities:

- Store final TPS result.
- Store document hash.
- Store audit log hash.
- Reject duplicate TPS finalization.
- Emit finalization event.

---

## 6. Proposed Directory Architecture

### 6.1 Backend

```txt
backend/
  src/
    app.ts
    server.ts

    config/
      env.ts
      constants.ts

    database/
      connection.ts
      schema.ts
      seed.ts
      migrations/

    modules/
      auth/
        auth.routes.ts
        auth.controller.ts
        auth.service.ts
        auth.types.ts

      users/
        users.routes.ts
        users.controller.ts
        users.service.ts
        users.types.ts

      elections/
        elections.routes.ts
        elections.controller.ts
        elections.service.ts
        elections.types.ts

      tps/
        tps.routes.ts
        tps.controller.ts
        tps.service.ts
        tps.types.ts

      candidates/
        candidates.routes.ts
        candidates.controller.ts
        candidates.service.ts
        candidates.types.ts

      voters/
        voters.routes.ts
        voters.controller.ts
        voters.service.ts
        voters.types.ts

      voting-sessions/
        votingSessions.routes.ts
        votingSessions.controller.ts
        votingSessions.service.ts
        votingSessions.types.ts

      votes/
        votes.routes.ts
        votes.controller.ts
        votes.service.ts
        votes.types.ts

      recap/
        recap.routes.ts
        recap.controller.ts
        recap.service.ts
        recap.types.ts

      documents/
        documents.routes.ts
        documents.controller.ts
        documents.service.ts
        documents.types.ts
        pdf.service.ts
        hash.service.ts

      witnesses/
        witnesses.routes.ts
        witnesses.controller.ts
        witnesses.service.ts
        witnesses.types.ts

      public-results/
        publicResults.routes.ts
        publicResults.controller.ts
        publicResults.service.ts

      blockchain/
        blockchain.routes.ts
        blockchain.controller.ts
        blockchain.service.ts
        contract.service.ts
        blockchain.types.ts

      audit/
        audit.service.ts
        audit.types.ts

    middleware/
      auth.middleware.ts
      role.middleware.ts
      error.middleware.ts
      validation.middleware.ts
      upload.middleware.ts

    utils/
      crypto.ts
      date.ts
      response.ts
      validation.ts
```

### 6.2 Frontend

```txt
frontend/
  src/
    app/
      App.tsx
      router.tsx

    layouts/
      AdminLayout.tsx
      OfficerLayout.tsx
      WitnessLayout.tsx
      PublicLayout.tsx
      BoothLayout.tsx

    pages/
      admin/
        AdminLoginPage.tsx
        AdminDashboardPage.tsx
        ElectionManagementPage.tsx
        TpsManagementPage.tsx
        CandidateManagementPage.tsx
        VoterManagementPage.tsx
        UserManagementPage.tsx
        ResultMonitoringPage.tsx

      officer/
        OfficerLoginPage.tsx
        OfficerDashboardPage.tsx
        VoterVerificationPage.tsx
        GrantVotingAccessPage.tsx
        TpsSessionPage.tsx
        TpsRecapPage.tsx
        DownloadResultFormPage.tsx
        UploadSignedFormPage.tsx
        FinalizationPage.tsx

      booth/
        BoothWaitingPage.tsx
        BoothCandidateSelectionPage.tsx
        BoothConfirmationPage.tsx
        BoothSuccessPage.tsx
        BoothExpiredPage.tsx

      witness/
        WitnessLoginPage.tsx
        WitnessDashboardPage.tsx
        WitnessTpsDetailPage.tsx
        WitnessApprovalPage.tsx
        WitnessObjectionPage.tsx

      public/
        PublicHomePage.tsx
        PublicResultPage.tsx
        PublicTpsResultPage.tsx
        PublicDocumentHashPage.tsx

    components/
      common/
      forms/
      tables/
      cards/
      status/
      upload/
      result/

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
      public-results/

    services/
      apiClient.ts
      authApi.ts
      tpsApi.ts
      votingApi.ts
      recapApi.ts
      documentsApi.ts
      witnessApi.ts
      publicApi.ts

    stores/
      authStore.ts
      boothStore.ts

    utils/
      format.ts
      constants.ts
```

### 6.3 Blockchain

```txt
blockchain/
  contracts/
    EVotingFinalization.sol

  scripts/
    deploy.js
    seed.js

  test/
    EVotingFinalization.test.js

  artifacts/
  hardhat.config.js
```

---

## 7. Domain Model

### 7.1 Election

Represents one Pilkada event.

Suggested fields:

```txt
id
name
type
province
cityRegency
status
votingDate
votingStartTime
votingEndTime
countingStartTime
countingEndTime
createdAt
updatedAt
```

Election types:

```txt
GOVERNOR
MAYOR
REGENT
```

### 7.2 TPS

Represents a polling station.

Suggested fields:

```txt
id
electionId
tpsNumber
tpsCode
province
cityRegency
district
village
status
registeredVotersTotal
registeredVotersMale
registeredVotersFemale
createdAt
updatedAt
```

### 7.3 Candidate Pair

Represents Pilkada candidate pair.

Suggested fields:

```txt
id
electionId
ballotNumber
candidate1Name
candidate1Title
candidate2Name
candidate2Title
supportingParty
supportingCoalition
photoUrl
createdAt
updatedAt
```

### 7.4 User

Authenticated system users only.

Suggested fields:

```txt
id
name
email
passwordHash
role
assignedTpsId
assignedCandidatePairId
status
createdAt
updatedAt
```

Roles:

```txt
ADMIN_PUSAT
PETUGAS_TPS
SAKSI_PARPOL
```

### 7.5 Voter / DPT Entry

Development data must be synthetic.

Suggested fields:

```txt
id
electionId
tpsId
nikHash
displayVoterCode
name
gender
birthDate
isDisability
verificationStatus
hasVoted
verifiedAt
votedAt
createdAt
updatedAt
```

For development, name and birthDate may be synthetic. Avoid real citizen data.

### 7.6 Voting Session

Temporary authorization for a voter to vote.

Suggested fields:

```txt
id
electionId
tpsId
voterId
boothId
status
expiresAt
usedAt
createdByUserId
createdAt
updatedAt
```

Status:

```txt
PENDING
ACTIVE
USED
EXPIRED
CANCELLED
```

### 7.7 Vote

Local vote record.

Suggested fields:

```txt
id
electionId
tpsId
candidatePairId
sessionId
createdAt
```

Do not store voter identity directly in the vote record. If session reference is needed, keep privacy considerations in mind and purge session linkage after election finalization if required.

### 7.8 TPS Recap

Generated result summary.

Suggested fields:

```txt
id
electionId
tpsId
totalRegisteredVoters
totalVerifiedVoters
totalValidVotes
totalInvalidVotes
totalVotes
validationStatus
generatedAt
generatedByUserId
createdAt
updatedAt
```

### 7.9 TPS Recap Candidate Total

Suggested fields:

```txt
id
recapId
candidatePairId
voteTotal
voteTotalInWords
createdAt
updatedAt
```

### 7.10 Document

Represents generated and uploaded result documents.

Suggested fields:

```txt
id
electionId
tpsId
recapId
documentType
generatedPdfPath
uploadedSignedFilePath
fileHash
qrPayload
status
generatedAt
uploadedAt
createdAt
updatedAt
```

Document types:

```txt
CHASIL_KWK_INSPIRED_RESULT_FORM
SIGNED_RESULT_FORM
```

### 7.11 Witness Verification

Suggested fields:

```txt
id
electionId
tpsId
witnessUserId
candidatePairId
status
note
evidenceFilePath
signedAt
createdAt
updatedAt
```

Status:

```txt
PENDING
APPROVED
OBJECTED
ABSENT
NO_RESPONSE
```

### 7.12 Audit Log

Suggested fields:

```txt
id
electionId
tpsId
actorUserId
actorRole
action
entityType
entityId
metadataJson
createdAt
```

### 7.13 Blockchain Finalization Record

Suggested fields:

```txt
id
electionId
tpsId
recapId
documentHash
auditLogHash
transactionHash
contractAddress
chainId
finalizedAt
finalizedByUserId
createdAt
```

---

## 8. Status State Machines

### 8.1 Election Status

```txt
DRAFT -> READY -> OPEN -> CLOSED -> FINALIZED
```

### 8.2 TPS Status

```txt
NOT_STARTED
  -> OPEN
  -> CLOSED
  -> RECAP_GENERATED
  -> FORM_DOWNLOADED
  -> SIGNED_FORM_UPLOADED
  -> WITNESS_REVIEW
  -> FINALIZED
  -> BLOCKCHAIN_ANCHORED
```

### 8.3 Voting Session Status

```txt
PENDING -> ACTIVE -> USED
PENDING -> EXPIRED
ACTIVE  -> EXPIRED
PENDING -> CANCELLED
ACTIVE  -> CANCELLED
```

### 8.4 Document Status

```txt
NOT_GENERATED
  -> GENERATED
  -> DOWNLOADED
  -> SIGNED_UPLOADED
  -> HASHED
  -> ANCHOR_READY
  -> ANCHORED
```

### 8.5 Witness Status

```txt
PENDING -> APPROVED
PENDING -> OBJECTED
PENDING -> ABSENT
PENDING -> NO_RESPONSE
```

---

## 9. API Design

Use current project conventions where possible. Suggested REST contract:

### 9.1 Auth

```txt
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

### 9.2 Elections

```txt
GET    /api/elections
POST   /api/elections
GET    /api/elections/:id
PATCH  /api/elections/:id
PATCH  /api/elections/:id/status
```

### 9.3 TPS

```txt
GET    /api/tps
POST   /api/tps
GET    /api/tps/:id
PATCH  /api/tps/:id
PATCH  /api/tps/:id/status
```

### 9.4 Candidates

```txt
GET    /api/candidates
POST   /api/candidates
GET    /api/candidates/:id
PATCH  /api/candidates/:id
DELETE /api/candidates/:id
```

### 9.5 Voters / DPT

```txt
GET  /api/voters
POST /api/voters/seed
POST /api/voters/verify
GET  /api/voters/:id
```

### 9.6 Voting Sessions

```txt
POST /api/voting-sessions
GET  /api/voting-sessions/booth/:boothId/active
POST /api/voting-sessions/:id/cancel
POST /api/voting-sessions/:id/expire
```

### 9.7 Votes

```txt
POST /api/votes/cast
GET  /api/votes/tps/:tpsId
```

### 9.8 Recap

```txt
GET  /api/recap/tps/:tpsId
POST /api/recap/tps/:tpsId/generate
POST /api/recap/tps/:tpsId/validate
```

### 9.9 Documents

```txt
GET  /api/documents/tps/:tpsId/form
POST /api/documents/tps/:tpsId/generate-form
POST /api/documents/tps/:tpsId/upload-signed
GET  /api/documents/tps/:tpsId/hash
GET  /api/documents/:id/download
```

### 9.10 Witnesses

```txt
GET  /api/witness/tps
GET  /api/witness/tps/:tpsId
POST /api/witness/tps/:tpsId/approve
POST /api/witness/tps/:tpsId/object
POST /api/witness/tps/:tpsId/evidence
```

### 9.11 Finalization

```txt
POST /api/finalization/tps/:tpsId
GET  /api/finalization/tps/:tpsId
```

### 9.12 Public Results

```txt
GET /api/public/results
GET /api/public/results/tps/:tpsId
GET /api/public/results/documents/:documentId/hash
```

---

## 10. Recap Validation Design

Before TPS finalization, the backend must calculate and validate results server-side.

Required validation rules:

```txt
sum(candidate_pair_vote_totals) == total_valid_votes
total_valid_votes <= total_verified_voters
total_verified_voters <= total_registered_voters
each voting session is used at most once
each used voting session has exactly one vote
signed result form exists
document hash exists
```

Do not trust client-calculated totals. The backend must recalculate from local vote records.

---

## 11. C.Hasil-KWK-Inspired Form Generation

### 11.1 Form Purpose

The generated PDF is the digital result document for TPS recap. It is inspired by Pilkada C.Hasil-KWK structure.

Use this user-facing name:

```txt
C.Hasil-KWK-inspired TPS Result Form
```

Do not use:

```txt
Official KPU C.Hasil-KWK Form
```

### 11.2 Required Form Sections

The PDF generator must support:

1. Header
   - Election name.
   - Election type.
   - TPS code.
   - TPS number.
   - Province.
   - City/regency.
   - District.
   - Village/subdistrict.

2. Officer and Time Metadata
   - KPPS officer name.
   - Voting start and end time.
   - Counting start and end time.
   - Generated timestamp.

3. Voter Participation Data
   - DPT male.
   - DPT female.
   - DPT total.
   - Verified voters male.
   - Verified voters female.
   - Verified voters total.
   - DPTb and DPK fields if supported.
   - Disability voter fields if supported.

4. Digital Voting Usage Data
   - Total voting rights available.
   - Total voting sessions created.
   - Total voting sessions used.
   - Total cancelled or invalid sessions.
   - Total unused voting rights.

5. Candidate Pair Results
   - Ballot number.
   - Candidate pair full names with titles.
   - Supporting party or coalition.
   - Vote total.
   - Vote total in words if available.

6. Valid and Invalid Vote Summary
   - Total valid votes.
   - Total invalid votes.
   - Total valid + invalid votes.

7. Signature Area
   - KPPS chair.
   - KPPS members.
   - Witnesses.
   - Optional supervisor placeholder.

8. Security Area
   - Document ID.
   - QR payload.
   - Document hash placeholder.
   - Audit hash placeholder.
   - Blockchain transaction hash placeholder if finalized.

### 11.3 Recommended PDF Library

Use whichever library is simplest and stable with the current stack, for example:

```txt
pdfkit
pdf-lib
puppeteer
```

Recommended for structured table output:

```txt
pdfkit
```

If the frontend already has a stable print layout, HTML-to-PDF may be considered, but avoid adding heavy dependencies unless necessary.

---

## 12. Document Upload and Hashing

### 12.1 Upload Flow

```txt
Generate recap
-> Generate PDF form
-> Download PDF
-> Print
-> Wet signature by KPPS/witnesses
-> Scan or photograph
-> Upload signed file
-> Generate SHA-256 hash
-> Store file metadata
-> Prepare finalization
```

### 12.2 Hashing Rule

Hash must be generated server-side.

Recommended:

```txt
SHA-256(file bytes)
```

Store:

```txt
fileName
mimeType
fileSize
sha256Hash
uploadedBy
uploadedAt
```

### 12.3 Upload Restrictions

Recommended restrictions:

```txt
Allowed MIME types:
- application/pdf
- image/jpeg
- image/png

Maximum file size:
- configure by environment, default 10MB
```

---

## 13. Blockchain Smart Contract Design

### 13.1 Contract Name

```txt
EVotingFinalization.sol
```

### 13.2 Main Responsibilities

The smart contract must:

- Store final TPS result.
- Store document hash.
- Store audit log hash.
- Prevent duplicate finalization.
- Emit event after finalization.
- Provide read function for finalized TPS.

### 13.3 Suggested Solidity Data Structure

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
```

Candidate totals may be stored in a mapping or emitted in an event depending on implementation complexity.

### 13.4 Suggested Event

```solidity
event TpsFinalized(
    uint256 indexed electionId,
    uint256 indexed tpsId,
    string documentHash,
    string auditLogHash,
    uint256 finalizedAt
);
```

### 13.5 Contract Guardrails

Do not overcomplicate the smart contract. Keep it focused on final result anchoring.

---

## 14. Security Architecture

### 14.1 Authentication

Use JWT for authenticated roles:

```txt
ADMIN_PUSAT
PETUGAS_TPS
SAKSI_PARPOL
```

### 14.2 Authorization

Every protected backend endpoint must enforce role-based authorization.

Examples:

```txt
Admin-only:
- manage elections
- manage TPS
- manage candidate pairs
- manage users

KPPS-only:
- verify voters
- grant voting access
- generate TPS recap
- upload signed form

Witness-only:
- approve result
- object result
- upload objection evidence

Public:
- read public results only
```

### 14.3 Public Data Protection

Public API must never return:

- Raw DPT.
- NIK.
- Birth date.
- Phone number.
- Address.
- Internal audit log details.
- Private file paths.

### 14.4 Blockchain Key Safety

- Do not expose private keys to frontend.
- Keep signing keys in backend environment.
- Use `.env`.
- Do not commit secrets.
- Use provider-only mode for read operations.

### 14.5 File Upload Security

- Sanitize file names.
- Validate MIME type.
- Enforce file size limit.
- Store uploaded files outside public frontend source.
- Generate server-side hash.
- Do not execute uploaded files.

---

## 15. Audit Architecture

Every critical action should create an audit log record.

Important actions:

```txt
LOGIN
CREATE_ELECTION
CREATE_TPS
CREATE_CANDIDATE
VERIFY_VOTER
GRANT_VOTING_ACCESS
CAST_VOTE
CLOSE_TPS
GENERATE_RECAP
GENERATE_RESULT_FORM
UPLOAD_SIGNED_FORM
GENERATE_DOCUMENT_HASH
WITNESS_APPROVE
WITNESS_OBJECT
FINALIZE_TPS
ANCHOR_TO_BLOCKCHAIN
```

Audit hash generation:

```txt
1. Fetch ordered audit logs for TPS.
2. Serialize important fields deterministically.
3. Generate SHA-256 hash.
4. Store hash in backend.
5. Anchor hash to blockchain during finalization.
```

---

## 16. Frontend UX Architecture

### 16.1 Admin UX

Admin pages must focus on setup and monitoring.

Main UX requirements:

- Clear dashboard.
- Simple CRUD pages.
- Status badges.
- TPS progress summary.
- Result monitoring.

### 16.2 KPPS UX

KPPS pages must be operational and fast.

Main UX requirements:

- Large, clear actions.
- Minimal form friction.
- Clear voter verification feedback.
- Clear TPS status.
- Clear recap validation checklist.
- Clear upload state.

### 16.3 Booth UX

Booth UI must be optimized for tablet.

Main UX requirements:

- Waiting state.
- Large candidate pair cards.
- Clear confirm button.
- Confirmation step before vote submission.
- Success screen.
- Auto-reset to waiting mode after vote.

### 16.4 Witness UX

Witness UI must be verification-focused.

Main UX requirements:

- Assigned TPS list.
- Recap comparison.
- Uploaded signed form preview.
- Approve button.
- Objection form.
- Evidence upload.

### 16.5 Public UX

Public UI must be read-only and transparent.

Main UX requirements:

- Vote totals.
- Result per TPS.
- Finalization status.
- Document hash.
- Transaction hash if available.

---

## 17. Refactor ADRs

### ADR-001: Lock Project Scope to Pilkada

**Decision:** The project context is Pilkada.  
**Reason:** The latest stakeholder direction requires the system to be designed at Pilkada level.  
**Consequence:** Avoid village head election terminology and flows.

### ADR-002: Remove Anomaly Detection and K-Means

**Decision:** Remove anomaly detection from the product scope.  
**Reason:** The new scope focuses on voting, recap, C.Hasil-KWK-inspired form, witness verification, and blockchain anchoring.  
**Consequence:** Delete anomaly endpoints, UI, services, and documentation.

### ADR-003: Use Hybrid Local-First Architecture

**Decision:** TPS voting runs locally first. Final recap and blockchain anchoring happen after TPS finalization.  
**Reason:** Safer, faster, more reliable, and more realistic for TPS operation.  
**Consequence:** Backend must support local TPS state and later finalization.

### ADR-004: Use SQLite for Demo and Thesis Implementation

**Decision:** Use SQLite as the initial persistent database.  
**Reason:** Lightweight and suitable for local-first demo.  
**Consequence:** Code should isolate database access to allow future migration.

### ADR-005: Use Temporary Voting Session Instead of Voter Account

**Decision:** Voter does not login permanently.  
**Reason:** More realistic and privacy-preserving for TPS-based voting.  
**Consequence:** KPPS verifies voter and creates temporary voting session.

### ADR-006: Use Polling for Booth Activation First

**Decision:** Booth device polls backend every 1-2 seconds for active voting session.  
**Reason:** Simpler and more stable than WebSocket for first implementation.  
**Consequence:** WebSocket can be added later but is not required for MVP.

### ADR-007: Store Votes Locally, Store Final Result on Blockchain

**Decision:** Individual votes are stored locally. Blockchain stores only final TPS result and hashes.  
**Reason:** More efficient, cheaper, and avoids exposing sensitive data.  
**Consequence:** Smart contract remains simple and finalization-focused.

### ADR-008: Generate C.Hasil-KWK-Inspired PDF

**Decision:** The system generates a downloadable result form inspired by C.Hasil-KWK.  
**Reason:** Needed to preserve TPS signed-document workflow.  
**Consequence:** Implement backend PDF generation and download.

### ADR-009: Use SHA-256 Hash for Uploaded Signed Form

**Decision:** Uploaded signed form is hashed server-side.  
**Reason:** Enables document integrity verification after upload.  
**Consequence:** Store document hash and anchor it to blockchain.

### ADR-010: Witness Approval Is Important but Not Always Blocking

**Decision:** Finalization should record witness statuses but should not require all witnesses to approve.  
**Reason:** Witnesses may be absent or may refuse to respond.  
**Consequence:** Store statuses like APPROVED, OBJECTED, ABSENT, NO_RESPONSE.

### ADR-011: Public Transparency Is Read-Only

**Decision:** Public users can view results and hashes but cannot modify anything.  
**Reason:** Transparency without compromising system integrity.  
**Consequence:** Public API must be strictly read-only and sanitized.

### ADR-012: Modular Monolith Backend

**Decision:** Keep a single Express backend organized by modules.  
**Reason:** Best fit for thesis/demo and current project size.  
**Consequence:** Avoid unnecessary microservices.

### ADR-013: npm Is the Package Manager

**Decision:** Use npm only.  
**Reason:** Existing project contains package-lock.json files.  
**Consequence:** Do not introduce pnpm-lock.yaml or yarn.lock.

---

## 18. Implementation Sequence for Coding Agent

The coding agent must execute changes in this order:

1. Inspect current project.
2. Create `CURRENT_STATE.md`.
3. Create `GAP_ANALYSIS.md` comparing current project with `PRD.md` and this architecture.
4. Remove anomaly detection scope.
5. Add SQLite database layer.
6. Implement roles and auth.
7. Implement TPS and DPT modules.
8. Implement temporary voting session flow.
9. Implement voting booth polling.
10. Implement vote casting and duplicate prevention.
11. Implement recap generation and validation.
12. Implement C.Hasil-KWK-inspired PDF generation.
13. Implement signed form upload and hashing.
14. Implement witness verification.
15. Implement blockchain finalization.
16. Implement public result pages.
17. Update README and demo scripts.

Do not skip directly to UI polish before core data flow works.

---

## 19. Testing Strategy

### 19.1 Backend Unit Tests

Recommended test targets:

- Voter verification.
- Voting session creation.
- Duplicate vote prevention.
- Recap validation.
- Document hash generation.
- Witness status transition.
- Finalization validation.

### 19.2 Smart Contract Tests

Recommended test targets:

- Finalize TPS once.
- Reject duplicate TPS finalization.
- Read finalized TPS.
- Emit finalization event.
- Store document hash and audit log hash.

### 19.3 Integration Tests

Recommended test flows:

```txt
Admin creates election
-> Admin creates TPS and candidates
-> KPPS verifies voter
-> KPPS grants voting session
-> Booth casts vote
-> KPPS closes TPS
-> System generates recap
-> KPPS generates PDF
-> KPPS uploads signed form
-> Witness approves or objects
-> TPS finalized to blockchain
-> Public result is visible
```

### 19.4 Manual Demo Checklist

Before demo:

- Hardhat node runs.
- Contract is deployed.
- Backend is running.
- Frontend is running.
- SQLite database is seeded.
- Admin login works.
- KPPS login works.
- Witness login works.
- Booth voting works.
- Result form download works.
- Signed upload works.
- Finalization works.
- Public result page works.

---

## 20. Environment Variables

Suggested backend environment variables:

```txt
PORT=4000
DATABASE_URL=file:./database.sqlite
JWT_SECRET=change_me
JWT_EXPIRES_IN=1d

UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=10

HARDHAT_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=
BLOCKCHAIN_PRIVATE_KEY=
CHAIN_ID=31337
```

Suggested frontend environment variables:

```txt
VITE_API_BASE_URL=http://localhost:4000/api
```

Never expose blockchain private keys in frontend environment variables.

---

## 21. Documentation Rules

When implementation changes are made, update:

```txt
README.md
PRD.md if product scope changes
ARCHITECTURE.md if technical decisions change
API documentation if endpoints change
```

AI coding agent must not silently change architecture decisions without updating documentation.

---

## 22. Hard Constraints

The following constraints are mandatory:

```txt
Do not implement anomaly detection.
Do not implement K-Means.
Do not change the project back to village election scope.
Do not implement remote online voting.
Do not create permanent voter login.
Do not store real personal voter data.
Do not store personal voter data on blockchain.
Do not store files on blockchain.
Do not allow witness to edit vote totals.
Do not allow public users to access raw DPT.
Do not claim the generated form is an official KPU legal form.
Do not introduce another package manager.
Do not rewrite the whole project without current-state analysis.
```

---

## 23. Final Architecture Summary

The system is a modular monolith web application consisting of:

```txt
React + Vite frontend
Express + TypeScript backend
SQLite local-first database
Hardhat + Solidity blockchain finalization layer
```

The most important flow is:

```txt
KPPS verifies voter
-> system creates temporary voting session
-> voter votes on booth device
-> backend stores local vote
-> TPS closes
-> backend generates recap
-> backend generates C.Hasil-KWK-inspired PDF
-> KPPS uploads signed result form
-> backend hashes uploaded file
-> witness verifies result
-> authorized user finalizes TPS
-> backend anchors final result and hashes to blockchain
-> public can view result and verification hashes
```

The architecture must remain realistic for Pilkada TPS operation, efficient for a thesis prototype, and strict about voter privacy.
