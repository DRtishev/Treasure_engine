# ZERO_WAR_PROBE.md — ZW01 Zero-War Kill Switch Must-Fail Proof

STATUS: PASS
REASON_CODE: NONE
RUN_ID: cef301f25c52
NEXT_ACTION: ZW01 enforcement verified. Proceed with infra:p0 pipeline.

## Purpose

This gate INTENTIONALLY enables trading flags and proves that the zero-war kill switch
(T000 guard in edge_calm_mode_p0.mjs) blocks execution in EVERY case.

A PASS here means: the kill switch is proven to work.
A FAIL here means: the kill switch is broken — CRITICAL safety regression.

## Probe Results

| Flag | Value | Exit Code | T000 Detected | Status |
|------|-------|-----------|---------------|--------|
| TRADING_ENABLED | 1 | 1 | YES | KILL_SWITCH_ACTIVE |
| LIVE_TRADING | 1 | 1 | YES | KILL_SWITCH_ACTIVE |
| ORDER_SUBMISSION_ENABLED | 1 | 1 | YES | KILL_SWITCH_ACTIVE |
| SUBMIT_ORDERS | 1 | 1 | YES | KILL_SWITCH_ACTIVE |

## Kill Switch Verification

| Check | Result |
|-------|--------|
| Total probes | 4 |
| Probes blocked (exit != 0) | 4 |
| Kill switch broken | 0 |
| Overall gate | PASS |

## ZW01 Policy

Any attempt to place orders / connect to live endpoints / hit production exchange APIs => FAIL ZW01.
This gate probes TRADING_ENABLED, LIVE_TRADING, ORDER_SUBMISSION_ENABLED, SUBMIT_ORDERS flags.
All must be blocked by the T000 guard in P0 mode.

## Evidence Paths

- reports/evidence/SAFETY/ZERO_WAR_PROBE.md
- reports/evidence/SAFETY/gates/manual/zero_war_probe.json
