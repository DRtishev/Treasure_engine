# ZERO_WAR_PROBE.md — ZW00/ZW01 Zero-War Kill Switch Must-Fail Proof

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 71bc743467cc
NEXT_ACTION: ZW00 enforcement verified. Proceed with gov:integrity.

## Purpose

This gate INTENTIONALLY enables trading flags and proves that the zero-war kill switch
(T000 guard in edge_calm_mode_p0.mjs) blocks execution in EVERY case.

A PASS here means: the kill switch is proven to work.
A FAIL here means: the kill switch is broken — CRITICAL safety regression.

## Probe Results

ZW00 = kill switch fired (OBSERVED — expected must-fail behavior).
ZW01 = kill switch BREACH — live attempt succeeded (FAIL).

| Flag | Value | Exit Code | T000 Detected | Reason Code |
|------|-------|-----------|---------------|-------------|
| TRADING_ENABLED | 1 | 1 | YES | ZW00 |
| LIVE_TRADING | 1 | 1 | YES | ZW00 |
| ORDER_SUBMISSION_ENABLED | 1 | 1 | YES | ZW00 |
| SUBMIT_ORDERS | 1 | 1 | YES | ZW00 |

## Kill Switch Verification

| Check | Result |
|-------|--------|
| Total probes | 4 |
| ZW00 OBSERVED (blocked, exit!=0) | 4 |
| ZW01 BREACH (kill switch broken) | 0 |
| Overall gate | PASS |

## ZW00/ZW01 Policy

ZW00 (OBSERVED): Kill switch fired as expected — non-zero exit when trading flag set. GOOD.
ZW01 (FAIL): Any probe returns EC=0 => kill switch BREACH => FAIL ZW01.
This gate probes TRADING_ENABLED, LIVE_TRADING, ORDER_SUBMISSION_ENABLED, SUBMIT_ORDERS flags.
All must be blocked by the T000 guard in P0 mode.

## Evidence Paths

- reports/evidence/SAFETY/ZERO_WAR_PROBE.md
- reports/evidence/SAFETY/gates/manual/zero_war_probe.json
