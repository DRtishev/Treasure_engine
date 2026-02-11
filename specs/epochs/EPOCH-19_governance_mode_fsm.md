# EPOCH-19 — Governance + Mode FSM

## 1) Reality Snapshot (current repo)
- Mode FSM foundation exists: `core/governance/mode_fsm.mjs`.
- Dry-run/live adapter split exists: `core/exec/adapters/live_adapter_dryrun.mjs`, `core/exec/adapters/live_adapter.mjs`.
- Safety and risk controls exist but need governance coupling: `core/risk/risk_governor.mjs`, `core/exec/adapters/safety_gates.mjs`.

## 2) Goal / Non-goals
### Goal
Create explicit governance approval and mode-transition enforcement for DRY_RUN → LIVE_TESTNET → LIVE_PRODUCTION.

### Non-goals
- No direct exchange credential handling.
- No production auto-rollout.

## 3) Constraints
- Default mode must stay DRY_RUN.
- LIVE paths require explicit approvals and kill-switch checks.
- No network requirements in default verification path.

## 4) Design (interfaces, contracts, events)
### Proposed modules
- `governance_engine`: policy orchestration
- `rules_engine`: declarative checks for transition prerequisites
- `approval_workflow`: explicit approval artifact contract
- `mode_aware_executor`: execution wrapper enforcing mode checks

### Contracts
- transition request: `{from_mode,to_mode,reason,requested_by,ts_ms}`
- approval artifact: `{approved:boolean, approver_id, scope, expiry}`
- governance decision: `{allowed:boolean, blocking_reasons:[]}`

### Event contracts
- mandatory `SYS/live_intent_logged` event with mode + risk snapshot + reason.

## 5) Patch Plan
### New files
- `core/governance/governance_engine.mjs`
- `core/governance/rules_engine.mjs`
- `core/governance/approval_workflow.mjs`
- `core/exec/mode_aware_executor.mjs`
- `scripts/verify/governance_check.mjs`

### Modified files
- `core/governance/mode_fsm.mjs` (if required for transition hooks)
- `package.json` (`verify:governance`, `verify:epoch19`)

## 6) New/updated verify gates
- `npm run verify:governance`
- assertions: default mode DRY_RUN, blocked transitions without approval, blocked execution under kill switch.

## 7) Evidence requirements
`reports/evidence/EPOCH-19/` with governance gate logs, baseline anti-flake reruns, checksums, and summary.

## 8) Stop rules
PASS only if all unsafe transition paths are blocked and default mode remains DRY_RUN.
FAIL if any live route executes without full preconditions.

## 9) Risk register
1. FSM bypass via direct executor call → enforce mode-aware wrapper entrypoint.
2. Stale/invalid approvals accepted → include expiry and scope checks.
3. Missing audit events for live intent → gate requires mandatory event record.
4. Ambiguous transition reasons → require non-empty reason field.
5. Regression in paper/core paths → run verify wall before merge.

## 10) Rollback plan
Revert governance wiring and restore DRY_RUN-only executor route; validate baseline gates.
