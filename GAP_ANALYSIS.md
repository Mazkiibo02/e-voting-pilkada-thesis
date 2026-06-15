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
| C.Hasil generation | Missing | Backend print-ready HTML generation done; frontend prototype exists | Signed upload and hash pending. |
| Signed form upload/hash | Missing | Not implemented | Next branch. |
| Witness verification | Missing | Not implemented | After upload/hash. |
| Blockchain finalization | Wrong model / not implemented | Not implemented | Contract/backend adapter refactor required. |
| Public transparency | Partial/legacy | Not implemented against new data | After finalization. |
| Legacy frontend cleanup | Old localStorage flow exists | Partially bypassed by booth route | Cleanup required later. |
| Audit logs/hash | Missing | Schema exists but service not implemented | Needed before blockchain finalization. |

---

## 3. Remaining Major Gaps

### 3.1 Signed Form Upload and SHA-256 Hashing

Current status:

```txt
Frontend prototype can preview file before simulated upload.
Backend document generation can create/preview/download generated HTML.
Actual signed file upload and server-side hash are not implemented yet.
```

Target:

```txt
POST /documents/tps/:tpsId/upload-signed
```

Required behavior:

1. Accept PDF/JPG/JPEG/PNG.
2. Validate MIME type and size.
3. Store outside public frontend folder.
4. Compute SHA-256 over exact uploaded file bytes.
5. Store file path, MIME type, size, hash, uploaded timestamp, uploader user ID.
6. Update document status to `SIGNED_UPLOADED` or `HASHED` depending final status decision.
7. Return safe metadata and hash.
8. Do not claim pre-upload image manipulation detection.

Risk: High. This is required before witness verification and blockchain finalization.

Recommended branch:

```txt
feat/signed-form-upload-hashing
```

---

### 3.2 Witness Verification

Current status:

```txt
WITNESS auth role exists.
witness_verifications table exists.
No witness workflow routes/UI yet.
```

Target:

1. Witness can view assigned TPS recap and signed document metadata/hash.
2. Witness can approve.
3. Witness can object with note.
4. Witness can upload objection evidence if supported.
5. Witness cannot modify vote totals.
6. Finalization records witness statuses but does not require all witnesses to approve.

Recommended branch:

```txt
feat/witness-verification
```

Risk: High. Needed for thesis workflow realism.

---

### 3.3 Blockchain Finalization

Current status:

```txt
Old blockchain code still exists.
New local vote flow does not call blockchain.
Final TPS result anchoring is not implemented.
```

Target:

1. Smart contract stores final TPS-level result only.
2. Contract prevents duplicate finalization per election/TPS.
3. Backend submits recap totals, document hash, and audit hash.
4. Backend stores transaction hash in `blockchain_records`.
5. TPS status becomes `BLOCKCHAIN_ANCHORED`.
6. No personal voter data or uploaded files are stored on-chain.

Recommended branch:

```txt
feat/blockchain-finalization
```

Risk: High. Needed to satisfy blockchain thesis claim.

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

### 3.6 Audit Logs and Audit Hash

Current status:

```txt
audit_logs table exists.
No audit service or deterministic audit hash generation yet.
```

Target:

1. Important actions write audit log.
2. Audit logs contain no sensitive voter data.
3. Audit hash is generated deterministically for TPS finalization.
4. Audit hash is anchored to blockchain with document hash.

Recommended branch:

```txt
feat/audit-log-and-hash
```

This may be combined carefully with blockchain finalization if scope remains controlled, but a separate branch is cleaner.

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

### Recommended Next

```txt
feat/signed-form-upload-hashing
```

### Then

```txt
feat/witness-verification
feat/audit-log-and-hash
feat/blockchain-finalization
feat/public-result-dashboard
feat/kpps-officer-workflow-ui
feat/admin-management-ui
feat/witness-dashboard-ui
refactor/remove-legacy-voter-localstorage-flow
test/core-election-flow
chore/update-readme-demo-script
```

---

## 5. Risk Ranking

### High Risk / High Priority

| Gap | Why High Priority |
|---|---|
| Signed upload + hash | Required before witness verification and blockchain finalization. |
| Witness verification | Required for realistic Pilkada TPS workflow. |
| Blockchain finalization | Required for thesis title and final integrity claim. |
| Public result dashboard | Required for transparency goal. |
| Legacy voter flow cleanup | Prevents demo/architecture confusion. |
| Audit hash | Required for trustworthy blockchain finalization. |

### Medium Risk

| Gap | Notes |
|---|---|
| Full frontend admin/KPPS/witness UIs | Backend exists, but UX incomplete. |
| Node `node:sqlite` experimental warning | Acceptable for prototype, document migration path. |
| HTML instead of PDF binary | Current print-ready HTML is acceptable for prototype; PDF generator can be added later if required. |
| Route prefix inconsistency | Current backend uses no `/api`; future docs/prompts must follow actual convention. |

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
| Signed form upload | Pending |
| SHA-256 hash generation | Pending |
| Witness verification | Pending |
| Blockchain finalization | Pending |
| Public dashboard with hashes | Pending |

---

## 7. Documentation Corrections from Original Audit

The initial audit correctly identified critical gaps such as missing SQLite, missing RBAC, missing voting sessions, missing recap, missing document generation, and active anomaly/K-Means runtime scope. Those specific gaps have now been resolved in runtime implementation except for features explicitly listed as pending.

Historical audit references may remain in `CURRENT_STATE.md`/`GAP_ANALYSIS.md` only if they are clearly marked as historical. Active target documentation must not describe anomaly detection or K-Means as current or future scope.

---

## 8. Recommended Next Branch Details

Branch:

```txt
feat/signed-form-upload-hashing
```

Commit message:

```txt
feat: add signed form upload and hashing
```

Main files likely affected:

```txt
backend/src/routes/documents.ts
backend/src/services/documents.ts
backend/src/middleware/upload.ts
backend/src/services/hashing.ts
backend/src/database/schema.sql (only if minimal metadata fields are missing)
backend/.env.example
.gitignore
```

Hard constraints:

1. Do not implement witness verification in this branch.
2. Do not implement blockchain finalization in this branch.
3. Do not claim Photoshop/pre-upload tampering detection.
4. Do not expose uploaded files publicly without authorization.
5. Do not store file bytes on blockchain.
6. Do not run `git push` from agent.
