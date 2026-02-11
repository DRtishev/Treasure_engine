# TREASURE ENGINE — CONSTRAINTS

## Purpose
This document defines non-negotiable engineering and QA constraints for TREASURE ENGINE specs, gates, and release evidence.

## 1) Offline-first verification
- Default verification MUST run without external network access.
- Any network-dependent check MUST be disabled by default and enabled only with `ENABLE_NETWORK_TESTS=1`.
- CI and local baseline verification assume network is unavailable.

## 2) Determinism and reproducibility
- Canonical seed default is `SEED=12345` unless a gate explicitly defines otherwise.
- Deterministic gates MUST produce structurally stable outputs for the same seed and repeat profile.
- Non-deterministic fields (timestamps, host metadata) MUST be isolated and documented.

## 3) Run-directory discipline
- Variable gate outputs MUST be written under:
  `reports/runs/<gate>/<seed>/<repeat>/<run_id>/`.
- Repeats MUST NOT overwrite prior outputs.

## 4) Evidence protocol
- Every work epoch MUST publish an evidence pack under `reports/evidence/<EPOCH-ID>/`.
- Required artifacts:
  - `PREFLIGHT.log`
  - `SNAPSHOT.md`
  - `ASSUMPTIONS.md`
  - `GATE_PLAN.md`
  - `RISK_REGISTER.md`
  - `SUMMARY.md`
  - `VERDICT.md`
  - gate logs (`gates/*.log`)
  - checksum manifests (`SHA256SUMS.*`)
- No PASS/SAFE claim is valid without logs + manifests + verdict.

## 5) Security and safety policy
- No secrets/API keys in repository, logs, manifests, or evidence artifacts.
- No live trading by default.
- Live-like execution requires explicit unlock controls and release governor verification.

## 6) Spec quality policy
- Specs MUST be implementable without clarifying questions.
- Placeholder-only content (e.g., `TBD`, `TODO`, `TBA`) is forbidden unless section contains marker `ALLOW_TBD: YES` and a concrete remediation note.
- Risk section MUST include technical + operational + meta-risk entries.
- Acceptance criteria MUST be checklist-based and testable.

## 7) Anti-regression policy
- Critical gates run with anti-flake repeats where defined by epoch docs.
- Spec changes MUST keep `verify:spec` green before merging implementation work.
