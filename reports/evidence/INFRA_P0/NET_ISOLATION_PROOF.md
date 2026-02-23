# NET_ISOLATION_PROOF.md — NET01 Network Usage Policy Proof

STATUS: PASS
REASON_CODE: NONE
RUN_ID: b68b470a2f03
NEXT_ACTION: Network isolation proven. Continue with infra:p0 pipeline.

## NET01 Policy and Scope Clarity

WHAT THIS GATE PROVES: Policy checks that network is NOT required for PASS (offline-authoritative).
WHAT THIS GATE DOES NOT PROVE: Hardware-level network isolation (no network namespace enforcement).

This gate verifies via 6 policy checks:
1. No network opt-in flags active (ENABLE_NET unset or 0)
2. No live trading risk acknowledgement
3. No live exchange API keys present
4. node_modules already installed (no network needed for npm ci)
5. package-lock.json exists (deterministic reinstall spec)
6. VERIFY_MODE is GIT or BUNDLE (offline-authoritative, not network-dependent)

Fail code NET01: Network usage policy violated or offline state not verifiable.
For hardware-level isolation: use docker --network=none or unshare -n in CI.

Offline-truth-is-authority: if all checks pass, network is never required for PASS.

## Isolation Checks

| Check ID | Env Var | Value | Result | Reason |
|----------|---------|-------|--------|--------|
| C01_ENABLE_NET_OFF | ENABLE_NET | (unset) | PASS | ENABLE_NET not active — offline mode enforced |
| C02_LIVE_RISK_FLAG_OFF | I_UNDERSTAND_LIVE_RISK | (unset) | PASS | Live risk flag not active — not in live trading mode |
| C03_NO_LIVE_API_KEYS | API_KEY, API_SECRET, BINANCE_KEY, BINANCE_SECRET, EXCHANGE_API_KEY | (all unset) | PASS | No live exchange API credentials found — cannot connect to live endpoints |
| C04_NODE_MODULES_PRESENT | N/A | N/A | PASS | node_modules present — npm ci completed from cache/local state, no network required |
| C05_LOCK_FILE_PRESENT | N/A | N/A | PASS | package-lock.json found — deterministic install spec locked |
| C06_VERIFY_MODE_OFFLINE | VERIFY_MODE | (unset, defaults to GIT) | PASS | VERIFY_MODE=GIT — offline authority mode active |

## Summary

| Metric | Value |
|--------|-------|
| Total checks | 6 |
| Checks PASS | 6 |
| Checks FAIL | 0 |
| Gate status | PASS |

## Isolation Proof

The following conditions together prove offline operation is possible:
1. ENABLE_NET unset — no network opt-in flag active
2. No live trading acknowledgement flag
3. No live exchange API credentials
4. node_modules present from prior offline install (npm ci from cache)
5. package-lock.json present for deterministic reinstall
6. VERIFY_MODE=GIT derives authority from git commit sha (no network needed)

## Evidence Paths

- reports/evidence/INFRA_P0/NET_ISOLATION_PROOF.md
- reports/evidence/INFRA_P0/gates/manual/net_isolation.json
