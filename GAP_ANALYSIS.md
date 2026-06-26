# Gap Analysis: Current vs Target Architecture

**Document Date:** 2026-06-15  
**Project:** Website E-Voting Pilkada Berbasis Blockchain  
**Scope:** Updated gap analysis after implemented refactor branches through C.Hasil backend document generation.

---

## 1. Target Architecture Summary

Target architecture remains:

```txt
Frontend React/Vite
    -> Express Backend TypeScript
        -> SQLite local-first database
            -> Hardhat blockchain finalization only
```

Target system principles:

1. Pilkada-level system, not village head election.
2. Physical TPS voting process preserved.
3. Voters do not have permanent login accounts.
4. KPPS verifies voters and grants temporary voting session.
5. Booth/tablet polls active session and casts local vote.
6. Votes are stored locally in SQLite.
7. TPS recap is generated and validated from local votes.
8. C.Hasil-KWK-inspired TPS result form is generated from valid recap.
9. Signed result form is uploaded and hashed.
10. Witnesses review/approve/object without editing vote totals.
11. Blockchain stores final TPS result and hashes only.
12. Public dashboard shows sanitized result and integrity data.

---

## 2. Current Progress vs Target

| Feature Area | Previous Gap | Current Status | Remaining Work |
|---|---|---|---|
| Anomaly/K-Means removal | Runtime anomaly detection active | Done | Keep guardrails; do not reintroduce. |
| SQLite persistence | Missing | Done with `node:sqlite` | Consider production migration later; formal migrations/tests. |
| Role-based auth | Missing | Done for `ADMIN`, `KPPS`, `WITNESS` | Full frontend auth integration still pending. |
| Election/TPS/candidate/DPT management | Missing | Backend APIs done | Frontend management UI incomplete. |
| Temporary voting session | Missing | Backend APIs done | KPPS verification UI pending. |
| Booth polling | Missing | Backend and frontend booth page done | Hardening device auth can be future work. |
| Local vote casting | Blockchain/legacy/localStorage wrong model | Backend local vote casting done | Formal test coverage pending. |
| TPS recap validation | Missing | Backend recap generation/validation done | Frontend recap review UI pending. |
| C.Hasil generation | Missing | Backend print-ready HTML generation done; frontend prototype exists | Done. |
| Signed form upload/hash | Missing | Done | Fully implemented with multer file validation, randomized storage, and SHA-256 hash tracking. |
| Witness verification | Missing | Done | Fully implemented with database schema migration, backend endpoints, and WitnessDashboard frontend UI. |
| Blockchain finalization | Wrong model / not implemented | Done | Solidity contract refactor, wallet signer connection, finalization route, and frontend anchor button implemented. |
| Public transparency | Partial/legacy | Not implemented against new data | After finalization. |
| Legacy frontend cleanup | Old localStorage flow exists | Partially bypassed by booth route | Cleanup required later. |
| Audit logs/hash | Missing | Done | Backend logging service, admin route, and generateTpsAuditHash deterministic chain calculation implemented. |

---

## 3. Remaining Major Gaps

### 3.1 [COMPLETED] Signed Form Upload and SHA-256 Hashing

Current status:

```txt
Successfully implemented in chore/demo-local-flow-helper.
```

Implemented Behavior:

1. Accept PDF/JPEG/PNG formats.
2. Validate MIME type and file size (limit default 10MB).
3. Store securely in local folder (e.g. `uploads/signed-forms`) outside the public frontend structure.
4. Generate SHA-256 hash dynamically from exact uploaded bytes.
5. Save file path, original name, stored name, MIME type, size, hash, and timestamp in SQLite documents table.
6. Return safe JSON metadata to authorized clients.
7. Strict RBAC protection (ADMIN & KPPS only, KPPS restricted to assigned TPS).
8. Ensure hash verification only guarantees post-upload integrity (tamper detection), not pre-upload authenticity.

---

### 3.2 Witness Verification

Current status:

```txt
Completed in feat/witness-verification.
```

Implemented Features:

1. Witness can view assigned TPS recap and signed document metadata/hash.
2. Witness can approve.
3. Witness can object with note and optional physical evidence file upload (PDF/PNG/JPEG under 5MB).
4. Witness cannot modify vote totals (all fields read-only).
5. Finalization records witness statuses but does not require all witnesses to approve.
6. Automatic TPS status updates to 'WITNESS_VERIFICATION' and audit logs tracking.

---

### 3.3 Blockchain Finalization

Current status:

```txt
Implemented in feat/blockchain-finalization.
Contract refactored, backend finalization endpoint, and frontend anchor button integrated.
```

Target & Completed:

1. Smart contract stores final TPS-level result only. [Completed]
2. Contract prevents duplicate finalization per election/TPS. [Completed]
3. Backend submits recap totals, document hash, and audit hash. [Completed]
4. Backend stores transaction hash in `blockchain_records`. [Completed]
5. TPS status becomes `BLOCKCHAIN_ANCHORED`. [Completed]
6. No personal voter data or uploaded files are stored on-chain. [Completed]

---

### 3.4 Public Result Dashboard

Current status:

```txt
Legacy public result page exists.
Not yet integrated with recap/document/blockchain records.
```

Target:

1. Public can view election totals.
2. Public can view result per TPS.
3. Public can view TPS finalization status.
4. Public can view document hash and blockchain transaction hash when available.
5. Public cannot view DPT, NIK, voter identity, or internal audit logs.

Recommended branch:

```txt
feat/public-result-dashboard
```

Risk: Medium-high. Important for transparency.

---

### 3.5 Frontend Role-Based Dashboards

Current status:

```txt
Backend APIs exist for many core modules.
Frontend is still partially legacy.
Admin dashboard is not yet a full backend-driven management interface.
KPPS officer workflow UI is missing.
Witness dashboard UI is missing.
```

Target:

1. Admin: manage elections, TPS, candidate pairs, voters, users, monitoring.
2. KPPS: verify voter, create voting session, close TPS, generate recap, generate/download form, upload signed form.
3. Witness: view assigned recap/document/hash, approve/object.

Risk: Medium. The backend is ahead of frontend.

Recommended approach: implement after upload/hash and witness backend, or incrementally per workflow.

---

### 3.6 [COMPLETED] Audit Logs and Audit Hash

Current status:

```txt
Completed in feat/blockchain-finalization.
Logging, admin routes, and deterministic audit hash chain calculation are fully functional.
```

Target & Completed:

1. Important actions write audit log (e.g., `AUTH_LOGIN`, `VOTE_CAST`, `SIGNED_FORM_UPLOADED`, etc.). [Completed]
2. Audit logs contain no sensitive voter data (raw NIK, passwords, server paths avoided). [Completed]
3. Deterministic audit hash is generated for TPS finalization. [Completed]
4. Audit hash is anchored to blockchain with document hash. [Completed]

---

## 4. Updated Implementation Roadmap

### Completed

1. `docs/project-audit-prd-architecture`
2. `refactor/remove-anomaly-detection`
3. `feat/chasil-preview-workflow`
4. `feat/sqlite-persistence-layer`
5. `feat/role-based-auth`
6. `feat/elections-tps-dpt-management`
7. `feat/temporary-voting-session`
8. `feat/local-vote-casting`
9. `feat/booth-voting-ui`
10. `feat/tps-recap-validation`
11. `feat/chasil-backend-document-generation`
12. `chore/demo-local-flow-helper` (Signed C.Hasil upload, SHA-256 hashing, activity logs/audit trail, and demo automation)

### Completed (continued)

- `feat/witness-verification`
- `feat/blockchain-finalization`

### Recommended Next

```txt
chore/production-vps-infrastructure-planning
test/system-load-testing-e2e
chore/final-security-audit
```

### Then

```txt
feat/public-result-dashboard
feat/kpps-officer-workflow-ui
feat/admin-management-ui
refactor/remove-legacy-voter-localstorage-flow
test/core-election-flow
chore/update-readme-demo-script
```

---

## 5. Risk Ranking

### High Risk / High Priority

| Gap | Why High Priority |
|---|---|
| Public result dashboard | Required for transparency goal. |
| Legacy voter flow cleanup | Prevents demo/architecture confusion. |

### Medium Risk

| Gap | Notes |
|---|---|
| Full frontend admin/KPPS/witness UIs | Backend exists, but UX incomplete. |
| Node `node:sqlite` experimental warning | Acceptable for prototype, document migration path. |
| HTML instead of PDF binary | Current print-ready HTML is acceptable for prototype; PDF generator can be added later if required. |

### Low Risk

| Gap | Notes |
|---|---|
| UI polish | Can be done after core flow. |
| Bundle size | Not blocking for thesis prototype. |
| README/demo script | Important before final demo, not core logic. |

---

## 6. Current Acceptance Status

| Acceptance Area | Status |
|---|---|
| Admin can manage election/TPS/candidate/DPT via backend APIs | Done |
| Role-based auth and safe JWT claims | Done |
| KPPS can create temporary session for assigned TPS | Done |
| Booth can detect active session | Done |
| Voter can select/confirm candidate in booth UI | Done |
| Vote is stored locally | Done |
| Same session cannot vote twice | Done |
| TPS recap can be generated and validated | Done |
| C.Hasil-KWK-inspired form can be generated/downloaded | Done as print-ready HTML |
| Signed form upload | Done |
| SHA-256 hash generation | Done |
| Activity logging and admin audit routes | Done |
| Witness verification | Done |
| Deterministic audit hash generation | Done |
| Blockchain finalization | Done |
| Public dashboard with hashes | Pending |

---

## 7. Documentation Corrections from Original Audit

The initial audit correctly identified critical gaps such as missing SQLite, missing RBAC, missing voting sessions, missing recap, missing document generation, and active anomaly/K-Means runtime scope. Those specific gaps have now been resolved in runtime implementation except for features explicitly listed as pending.

Historical audit references may remain in `CURRENT_STATE.md`/`GAP_ANALYSIS.md` only if they are clearly marked as historical. Active target documentation must not describe anomaly detection or K-Means as current or future scope.

---

## 8. Recommended Next Branch Details

Branch:

```txt
feat/blockchain-finalization
```

Commit message:

```txt
feat: add blockchain finalization
```

Main files likely affected:

```txt
backend/src/services/blockchain.ts
blockchain/contracts/EVoting.sol
backend/src/routes/finalization.ts
```

Hard constraints:

1. Smart contract stores final TPS-level result only.
2. Prevent duplicate finalization.
3. No voter personal details on-chain.
4. Do not run `git push` from agent.
