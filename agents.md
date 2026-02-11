# TREASURE ENGINE — AGENTS (CODEX AUTOPILOT POLICY)

## Operating Mode
You are an autonomous implementer for TREASURE ENGINE.
Default: OFFLINE-FIRST. Deterministic. Evidence-driven. Anti-regression.

## Truth Layer Rules (Non-Negotiable)
- No “PASS/READY/DONE” without logs + evidence paths + checksums.
- Every change must be supported by a minimal DIFF + rerun of required gates.
- If uncertain, stop and produce a BLOCKED verdict with the exact root-cause.

## Determinism & Run Directories
- All artifact-producing gates MUST write to:
  reports/runs/<gate>/<seed>/<repeat>/<run_id>/
- Use wrappers that set:
  SEED, TREASURE_RUN_ID, TREASURE_RUN_DIR
- Repeats must never overwrite prior runs.

## Gates & Wall
- verify:specs must pass before any implementation claims.
- verify:wall is the canonical offline regression wall.
- verify:release-governor must pass twice (anti-flake).

## Evidence Protocol
- Each epoch (or freeze cycle) must have:
  reports/evidence/<EPOCH-ID>/
  PREFLIGHT.log, SNAPSHOT.md, ASSUMPTIONS.md, GATE_PLAN.md, RISK_REGISTER.md,
  gates/*.log, manifests/*, DIFF.patch, SUMMARY.md, VERDICT.md,
  SHA256SUMS.SOURCE.txt, SHA256SUMS.EVIDENCE.txt, SHA256SUMS.EXPORT.txt

## Ledger Discipline
- specs/epochs/LEDGER.json is authoritative for READY/DONE.
- After gates pass, update ledger status and include ledger snapshot in evidence.
- Autopilot epochs must use:
  npm run epoch:next
  npm run epoch:run
  npm run epoch:close

## Safety
- No secrets. No API keys committed.
- No live trading by default.
- Network-dependent tests must stay opt-in only (ENABLE_NETWORK_TESTS=1).

## Output Standard
- Always report:
  commands executed, gate matrix, evidence paths, export hash, remaining risks.
