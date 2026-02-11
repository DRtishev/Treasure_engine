# EPOCH-19

## 1) Reality Snapshot
- Baseline has deterministic run-scoped gates for E2 and Paper.
- Core invariants available: `verify:e2`, `verify:paper`, `verify:e2:multi`, `verify:phase2`, `verify:integration`.
- Missing integration layer for this epoch is tracked in `TASK_TRACKER.md` and `SDD_EPOCH_17_21.md`.

## 2) Objective
Deliver EPOCH-19 scope as a deterministic, offline-testable increment with evidence-backed gate pass.

## 3) Non-goals
- No live trading activation by default.
- No network-required verification in default flow.
- No broad refactors outside required epoch files.

## 4) Constraints
- Compatibility with existing gate scripts.
- Run-scoped outputs under `reports/runs/...`.
- Deterministic seed and reproducible evidence.

## 5) Architecture / Design
### Interfaces
- Reuse existing execution and logging interfaces in `core/exec`, `core/obs`, and `core/risk`.

### Data flow
1. Input intent/signal/config.
2. Epoch-specific orchestration or policy module.
3. Existing executor/adapter path.
4. Event emission (SYS/EXEC/RISK).
5. Run-scoped artifacts + evidence.

### Event taxonomy
- SYS: orchestration lifecycle / start-stop / decisions.
- EXEC: order intent, placement, fill, cancel.
- RISK: precheck blocks, caps, state updates, kill-switch/circuit-breaker.

## 6) Patch Plan
- Add/modify only files explicitly listed in `EPOCH-19_TODO.md`.
- Keep minimal diff and backward compatibility.
- Record any new gate in `package.json` only when implementation exists.

## 7) Verification Plan (Gates)
- Mandatory baseline gates:
  - `npm run verify:e2` (x2)
  - `npm run verify:paper` (x2)
  - `npm run verify:e2:multi`
  - `npm run verify:core`
- Optional epoch-specific gates are defined in `EPOCH-19_GATES.md`.

## 8) Evidence Plan
- Use `reports/evidence/EPOCH-19.x/` with:
  - preflight + install logs
  - all gate logs
  - diff patch
  - source/export checksum manifests
  - summary and remaining risks

## 9) Acceptance Criteria
- [ ] Target epoch modules implemented.
- [ ] Baseline invariants pass.
- [ ] Epoch-specific gate(s) pass.
- [ ] Evidence folder complete and checksummed.

## Implementation Reality Check
- Can this be implemented with current modules? **YES (incremental)**.
- New infrastructure required? **NO for baseline scope**, except epoch-specific gate scripts marked TO IMPLEMENT.
- Estimated implementation size: **small-to-medium (200-600 LOC per epoch core path)**.
- Refactor debt risk: **moderate** if interfaces diverge; minimize by adapter/wrapper reuse.
- Incremental shipping feasible: **YES** (module + gate + evidence in sequence).

## 10) Risks & Mitigations
- Risk: hidden nondeterministic fields in new outputs.  
  Mitigation: seed/clock discipline + schema and fingerprint checks.
- Risk: gate regression in shared wrappers.  
  Mitigation: rerun `verify:e2`, `verify:paper`, `verify:e2:multi`.

## 11) Rollback Plan
- Revert epoch commit(s).
- Re-run baseline gates to confirm restoration.

## 12) Implementation Notes
- Sequence: implement core module → add tests/gates → run anti-flake → collect evidence.
- Stop immediately on invariant failure and patch root cause before continuing.
