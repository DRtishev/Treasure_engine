# EPOCH-26 — Micro-Live Governor Rehearsal

## REALITY SNAPSHOT
- Governance stack exists (`GovernanceEngine`, `ModeAwareExecutor`) and already enforces mode transitions.
- EPOCH-26 introduces a deterministic rehearsal gate to validate approval/FSM safety before any real live path.
- Canonical evidence target for this epoch: `reports/evidence/EPOCH-26/`.

## GOALS / NON-GOALS
### Goals
- Prove DRY_RUN -> LIVE_TESTNET transition control via explicit governance prerequisites.
- Prove kill-switch and rollback behavior in rehearsal mode.
- Keep gate offline-first and deterministic.

### Non-goals
- No default network dependency.
- No real order placement/live production activation.
- No unrelated refactors.

## CONSTRAINTS
- Offline-first by default; network checks must be explicit opt-in.
- Deterministic execution (fixed timestamps/inputs where possible).
- Baseline invariants remain mandatory: `verify:e2`, `verify:paper` (inside `verify:core`).
- Live production transition from DRY_RUN must stay blocked by FSM.

## DESIGN (contracts + interfaces + invariants)
- Contracts used: `GovernanceEngine`, `GOV_MODES`, `ModeAwareExecutor`, `EventLog`.
- Rehearsal invariants:
  1) default mode is `DRY_RUN`;
  2) no-approval LIVE_TESTNET transition is blocked;
  3) scoped approval artifact validates;
  4) approved transition to LIVE_TESTNET is allowed;
  5) kill-switch blocks execution;
  6) emergency rollback to DRY_RUN is allowed;
  7) DRY_RUN -> LIVE_PRODUCTION is blocked;
  8) allowed + blocked governance events are emitted.

## PATCH PLAN
- Add/maintain gate script: `scripts/verify/epoch26_micro_live_governor_check.mjs`.
- Expose npm entrypoint: `verify:epoch26`.
- Keep change-set minimal and evidence-backed.

## VERIFY (gates + anti-flake)
- `npm run verify:epoch26` (run #1)
- `npm run verify:epoch26` (run #2)
- Mandatory baseline:
  - `npm ci`
  - `npm run verify:core`
  - `npm run verify:phase2`
  - `npm run verify:integration`

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-26/PREFLIGHT.md`
- `reports/evidence/EPOCH-26/INVENTORY.txt`
- `reports/evidence/EPOCH-26/GATE_PLAN.md`
- `reports/evidence/EPOCH-26/ASSUMPTIONS.md`
- `reports/evidence/EPOCH-26/gates/*.log`
- `reports/evidence/EPOCH-26/DIFF.patch`
- `reports/evidence/EPOCH-26/SHA256SUMS.SOURCE.txt`
- `reports/evidence/EPOCH-26/SHA256SUMS.EVIDENCE.txt`
- `reports/evidence/EPOCH-26/SUMMARY.md`

## STOP RULES
- PASS only if all epoch + mandatory baseline gates pass and both checksum manifests validate.
- FAIL/BLOCKED if any gate/checksum fails or evidence bundle is incomplete.

## RISK REGISTER
- Hidden coupling in governance transition guards.
- Flake risk in event emission assertions.
- Clean-clone drift if manifests are not regenerated after patch.

## ROLLBACK PLAN
- Revert epoch-specific commit(s).
- Re-run `npm run verify:core`, `npm run verify:phase2`, `npm run verify:integration`.

## ACCEPTANCE CRITERIA
- [x] EPOCH-26 rehearsal gate implemented and script-wired.
- [x] Anti-flake rerun passes.
- [x] Mandatory baseline gates pass.
- [x] Evidence + manifests generated and checksum-validated.

## NOTES
- This epoch is rehearsal-only and does not authorize production trading.
