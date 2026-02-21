# DEP_POLICY.md — Dependency Governance SSOT

VERSION: 1.0.0
SCOPE: INFRA_P0 + EDGE_LAB
AUTHORITY: Principal Engineer + Release Gatekeeper

---

## Purpose

This document is the authoritative source of truth for how DEP01/DEP02/DEP03
reason codes propagate across the INFRA P0 → EDGE readiness pipeline.

---

## DEP Reason Code Definitions

| Code  | Trigger | Classification |
|-------|---------|---------------|
| DEP01 | npm install required network/registry access (offline capsule missing) | BLOCKED |
| DEP02 | Native build (node-gyp / binding.gyp / prebuild-install) detected | FAIL |
| DEP03 | x2 install runs produced different output (non-determinism) | FAIL |

---

## R12 — Fail-Closed Propagation Rule

INFRA P0 closeout outcome → EDGE readiness outcome mapping:

| INFRA closeout gate status | Readiness verdict |
|---------------------------|------------------|
| FAIL DEP02                | BLOCKED DEP02    |
| FAIL DEP03                | BLOCKED DEP03    |
| BLOCKED DEP01             | BLOCKED DEP01    |
| PASS                      | (readiness decides independently) |
| JSON file missing          | BLOCKED D003     |

**R12 is unconditional.** INFRA closeout may itself PASS (overall), but if
`eligible_for_micro_live=false` is present in the closeout JSON, readiness
MUST be BLOCKED with the corresponding reason code.

---

## R13 — Eligibility Flags in Closeout JSON

`infra_p0_closeout.json` MUST emit:

```json
{
  "eligible_for_micro_live": false,
  "eligible_for_execution": false,
  "eligibility_reason": "DEP02: native build detected (better-sqlite3 requires node-gyp)"
}
```

- `eligible_for_micro_live=false` when ANY of DEP01/DEP02/DEP03 is present in gate_matrix
- `eligible_for_execution=false` same condition
- `eligibility_reason`: human-readable string citing the reason code(s)

The overall closeout `status` may still be `PASS` (INFRA gates themselves passed),
but eligibility flags provide the downstream signal.

---

## Context: DEP02 Current State

As of INFRA P0 Hardening (v1.4.1 firmware), `better-sqlite3` triggers DEP02:

- `better-sqlite3` requires node-gyp native compilation
- The `deps_offline_install_contract` gate correctly records `FAIL DEP02`
- **Mitigation paths:**
  1. Use prebuilt binary: `npm install --ignore-scripts` + provide `.node` binary
  2. Provision capsule with pre-compiled `better-sqlite3.node` for target platform
  3. Replace `better-sqlite3` with a pure-JS alternative (e.g., `sql.js`)
- Until mitigation is applied and proven, readiness MUST be `BLOCKED DEP02`

---

## Governance

- This policy applies to ALL execution contexts (INFRA P0 gate suite, EDGE readiness, CI)
- DEP codes may NOT be silently demoted to "non-blocking" without a signed mitigation record
- Any change to this policy requires a Principal Engineer review and version bump
- Policy changes are traced via git history; no out-of-band overrides permitted

---

## Evidence Naming SSOT

| Artifact | Path |
|----------|------|
| INFRA deps gate evidence | `reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL_CONTRACT.md` |
| INFRA deps gate JSON | `reports/evidence/INFRA_P0/gates/manual/deps_offline_install.json` |
| INFRA closeout JSON | `reports/evidence/INFRA_P0/gates/manual/infra_p0_closeout.json` |
| EDGE readiness report | `reports/evidence/EDGE_LAB/P1/MICRO_LIVE_READINESS.md` |
| DEP02 regression proof | `reports/evidence/INFRA_P0/DEP02_FAILCLOSED_READINESS.md` |
