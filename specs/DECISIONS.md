# Decisions (Append-Only)

## D-001 — Run-Scoped Verification Paths
- Context: global output paths caused overwrite risk and weak auditability.
- Options:
  1) keep legacy global paths,
  2) scoped wrappers with env context,
  3) fully rewrite all engines.
- Decision: option (2) wrapper-based scoped execution with `TREASURE_RUN_DIR`.
- Rationale: minimal-diff, backward-compatible, deterministic.
- Risks: wrapper bypass in raw scripts.
- Follow-ups: enforce wrapper usage in quality bar and epoch gates.

## D-002 — Multi-Seed Structural Stability for E2
- Context: single-seed runs can hide drift and flaky assumptions.
- Decision: require `verify:e2:multi` (3 seeds + same-seed repeat fingerprint check).
- Rationale: catches structural drift without forcing cross-seed numeric equality.
- Follow-ups: extend similar pattern to strategy/governance epochs where needed.

## D-003 — Verify-Only Paper Probe Events
- Context: paper verification could produce zero RISK/EXEC events in deterministic no-trade paths.
- Decision: allow verify-only deterministic probes under `FORCE_TRADES=1` in wrapped paper gate.
- Rationale: removes flaky absence checks while preserving default safety behavior.
- Risks: synthetic events must stay clearly scoped to verification context.
- Follow-ups: replace probes with deterministic guaranteed trade fixture when available.
