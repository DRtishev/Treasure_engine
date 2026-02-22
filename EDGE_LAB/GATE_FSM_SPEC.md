# GATE_FSM_SPEC.md — Gate Finite State Machine Specification

STATUS: ACTIVE
VERSION: 1.0.0
SSOT: true

## Purpose

Formal specification of the Gate FSM for all evidence-producing gates in the
RELIABILITY PACK P0→P1 pipeline. This document defines:
- Valid gate states
- Whitelisted state transitions
- Forbidden transitions
- Terminal conditions

Implements P1_GATE_FSM from SHAMAN_OS_FIRMWARE v2.0.1.

---

## Gate States (SSOT)

| State | Symbol | Semantics |
|-------|--------|-----------|
| `PENDING` | ⬜ | Gate not yet started |
| `RUNNING` | 🔄 | Gate script executing |
| `PASS` | ✅ | All required evidence exists, all checks pass, no eligibility leaks |
| `FAIL` | ❌ | Determinism breach or forbidden behavior (D002/D005/DEP02/DEP03/ZW01/ND01) |
| `BLOCKED` | 🛑 | Required input missing or fail-closed condition hit (DEP01/NET01/VM04/FG01/GOV01/RD01/OP01) |
| `NEEDS_DATA` | ⏳ | Strictly whitelisted: node_modules missing (NDA01/NDA02) only |

---

## Whitelisted Transitions

```
PENDING → RUNNING       (gate script starts)
RUNNING → PASS          (all checks pass, evidence written)
RUNNING → FAIL          (determinism or security breach detected)
RUNNING → BLOCKED       (fail-closed condition or missing input)
RUNNING → NEEDS_DATA    (ONLY if stderr matches NDA01/NDA02 signatures)
```

---

## Forbidden Transitions

| Transition | Reason |
|-----------|--------|
| `PASS → FAIL` | Terminal states cannot transition (re-run required) |
| `FAIL → PASS` | Terminal state; must re-run gate from PENDING |
| `BLOCKED → PASS` | Blocked state is terminal; resolve condition and re-run |
| `NEEDS_DATA → PASS` | NEEDS_DATA gates must be resolved before proceeding |
| `RUNNING → NEEDS_DATA` | Only allowed if stderr matches NDA01/NDA02 whitelist |
| Any `→ PENDING` | No backward transitions |

---

## Terminal States

`PASS`, `FAIL`, `BLOCKED`, `NEEDS_DATA` are terminal for a given run.
A new run (re-execution of the gate script) resets to `RUNNING`.

---

## Eligibility Propagation Rules

When gate status maps to eligibility:

| Gate Status | eligible_for_micro_live | eligible_for_execution |
|-------------|------------------------|----------------------|
| PASS | true (unless overridden by other gates) | true |
| FAIL (DEP02/DEP03) | false | false |
| BLOCKED (DEP01) | false | false |
| BLOCKED (FG01) | false | false |
| FAIL (ZW01) | false | false |
| BLOCKED (NET01) | false | false |
| BLOCKED (GOV01) | false | false |
| NEEDS_DATA (NDA01/NDA02) | false | false |

Eligibility is fail-closed: any blocker forces false.
INFRA_P0_CLOSEOUT must emit explicit eligibility flags per R13.

---

## Gate Pipeline (RELIABILITY PACK P0→P1)

```
P0 GATES (infra:p0):
  NODE_TRUTH       PENDING → RUNNING → {PASS, FAIL, BLOCKED}
  VERIFY_MODE      PENDING → RUNNING → {PASS, FAIL, BLOCKED}
  DEPS_OFFLINE     PENDING → RUNNING → {PASS, FAIL, BLOCKED, NEEDS_DATA*}
  GOLDENS_APPLY    PENDING → RUNNING → {PASS, FAIL, BLOCKED}
  FORMAT_POLICY    PENDING → RUNNING → {PASS, FAIL, BLOCKED}
  FIXTURE_GUARD    PENDING → RUNNING → {PASS, BLOCKED(FG01)}
  ZERO_WAR_PROBE   PENDING → RUNNING → {PASS, FAIL(ZW01)}
  NET_ISOLATION    PENDING → RUNNING → {PASS, BLOCKED(NET01)}

P0 GATES (edge:calm:p0):
  CANON_SELFTEST   PENDING → RUNNING → {PASS, FAIL, BLOCKED}
  DATA_COURT       PENDING → RUNNING → {PASS, NEEDS_DATA*, FAIL}
  EVIDENCE_HASHES  PENDING → RUNNING → {PASS, FAIL, BLOCKED}
  RECEIPTS_CHAIN   PENDING → RUNNING → {PASS, FAIL, BLOCKED}

P0 GATE (edge:calm:p0:x2):
  ANTI_FLAKE_X2    PENDING → RUNNING → {PASS, FAIL(ND01)}

P1 GATES (gov:integrity):
  MERKLE_ROOT      PENDING → RUNNING → {PASS, PARTIAL}
  GOV01_INTEGRITY  PENDING → RUNNING → {PASS, BLOCKED(GOV01)}
  EDGE_UNLOCK      PENDING → RUNNING → {PASS, BLOCKED}
```

*NDA01/NDA02 whitelist only

---

## Calm Diagnostics Contract (P1_CALM_DIAGNOSTICS)

Every gate failure MUST emit a structured message with:
```
[FAIL <CODE>] <gate>: <WHY>
SIGNATURES: <error signatures or hash that identifies the failure>
NEXT_ACTION: npm run <existing-script>
```

Example:
```
[BLOCKED GOV01] gov01_evidence_integrity: SCOPE_MANIFEST_SHA mismatch detected.
SIGNATURES: anchored=b9b2c3f00e4f… computed=a1b2c3d4e5f6…
NEXT_ACTION: npm run edge:calm:p0
```

All NEXT_ACTION values MUST reference scripts that exist in package.json (OP01 rule).

---

## Reason Code Mapping (SSOT)

| Code | Kind | Trigger |
|------|------|---------|
| NET01 | BLOCKED | Network isolation unavailable |
| DEP01 | BLOCKED | Network attempt during install OR capsule missing |
| DEP02 | FAIL_INFRA/BLOCKED_READINESS | Native build outside capsule |
| DEP03 | FAIL_INFRA/BLOCKED_READINESS | x2 nondeterminism under same capsule |
| D001 | BLOCKED | RUN_ID source unavailable |
| D002 | FAIL | TREASURE_RUN_ID differs across x2 |
| D005 | FAIL | Canon touched forbidden semantic line |
| RD01 | BLOCKED | Readiness input missing/unreadable |
| VM04 | FAIL | Bundle fingerprint malformed |
| OP01 | BLOCKED | NEXT_ACTION references non-existent npm script |
| FG01 | BLOCKED | Fixture guard violation (evidence source is fixture) |
| ZW00 | OBSERVED | Zero-War kill switch fired (expected must-fail) |
| ZW01 | FAIL | Zero-War breach: live attempt did not fail |
| GOV01 | BLOCKED | Evidence integrity mismatch (manual edit or drift) |
| ND01 | FAIL | x2 fingerprint mismatch (nondeterminism) |
| NDA01 | NEEDS_DATA | node_modules missing / module not found |
| NDA02 | NEEDS_DATA | deps not installed (strict stderr signatures only) |

---

## Anti-Patterns (Forbidden)

1. **SEEMS_FINE → PASS**: Never emit PASS without artifacts. Default: BLOCKED.
2. **NEEDS_DATA as trash bin**: Only NDA01/NDA02 stderr signatures qualify.
3. **Silent PASS on missing evidence**: Missing required JSON → BLOCKED RD01.
4. **Manual evidence edits**: All `reports/evidence/**` files must be script-generated only.
5. **Network for PASS**: Any gate requiring live network → BLOCKED NET01.
6. **NEXT_ACTION with non-existent script**: → BLOCKED OP01.

---

## Evidence Paths

- EDGE_LAB/GATE_FSM_SPEC.md (this file)
