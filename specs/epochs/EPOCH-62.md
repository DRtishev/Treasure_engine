# EPOCH-62 — GOLD SEAL (Canonical Anchors + Reachability + Properties + Golden Vectors)

## REALITY SNAPSHOT
- E61 added docs/link checks and derived docs, but anchor canon, reachability, and semantic drift controls need stricter contracts.

## GOALS
- Establish canonical anchor contract and shared anchor parser.
- Add ACTIVE-file reachability verification from declared entrypoints.
- Add deterministic property suite (20+ checks).
- Add golden vectors for critical verifiers to detect semantic drift.
- Produce E62 evidence pack with machine outputs.

## NON-GOALS
- No new strategy/profit features.
- No dependency on network services for default gates.

## CONSTRAINTS
- Offline-first.
- Deterministic gate behavior.
- SSOT-led verification and evidence-first reporting.

## DESIGN / CONTRACTS
- `specs/truth/DOC_ANCHOR_CONTRACT.md` defines canonical anchor rules.
- `scripts/truth/doc_anchors.mjs` is the shared parser/slugger for rendering and verification.
- `scripts/verify/reachability.mjs` enforces ACTIVE reachability or allowlist.
- `scripts/verify/properties.mjs` runs deterministic invariants and writes fingerprinted report.
- `scripts/verify/golden_vectors_check.mjs` verifies deterministic hashes for selected critical gates.

## PATCH PLAN
- Add truth contracts (`DOC_ANCHOR_CONTRACT.md`, `ENTRYPOINTS.json`, `GOLDEN_VECTORS.md`).
- Harden `verify:docs` with shared canonical anchor logic + contract report.
- Add and wire `verify:reachability`, `verify:properties`, and `verify:golden`.
- Regenerate derived docs and run all required CI gates x2.
- Build E62 evidence pack with required machine outputs.

## VERIFY
- `npm run verify:specs`
- `npm ci`
- `CI=true npm run verify:repo`
- `CI=true npm run verify:specs`
- `CI=true npm run verify:docs`
- `CI=true npm run verify:reachability`
- `CI=true npm run verify:properties`
- `CI=true npm run verify:ledger`
- `CI=true npm run verify:edge`
- `CI=true npm run verify:treasure`
- `CI=true npm run verify:phoenix`
- `npm run release:build`
- `RELEASE_BUILD=1 RELEASE_STRICT=1 CI=true npm run verify:release`

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-62/` with standard files + `pack_index.json` + `SHA256SUMS.EVIDENCE`.
- Required machine outputs under `reports/evidence/EPOCH-62/gates/manual/`:
  - `reachability_report.json`
  - `properties_report.json`
  - `golden_vectors_manifest.json`
  - `docs_anchor_contract_check.json`
  - `verify_epoch62_result.json`

## STOP RULES
- BLOCK if any required gate fails twice.
- BLOCK if ACTIVE unreachable count > 0.
- BLOCK if docs anchor contract check reports invalid/duplicate required anchors.

## RISK REGISTER
- Reachability false positives from dynamic imports.
- Golden vector hash drift after benign output format changes.
- Properties overfit to current fixtures without contract coverage expansion.
- Manifest/ledger drift after adding E62 artifacts.
- Anchor contract regressions in future derived renderer edits.

## ACCEPTANCE CRITERIA
- [ ] `verify:docs` passes with broken links 0 and anchor contract check clean.
- [ ] `verify:reachability` passes with ACTIVE unreachable count 0.
- [ ] `verify:properties` passes with deterministic fingerprint output.
- [ ] Golden vectors pass deterministically for selected critical gates.
- [ ] E62 evidence pack contains all required machine outputs and checksums.

## NOTES
- E62 focuses exclusively on verification hardening and proof quality.
