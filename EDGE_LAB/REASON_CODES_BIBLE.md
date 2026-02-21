# REASON_CODES_BIBLE.md — Master Reason Code Glossary

epoch: CALM_INFRA_P0_HARDENING_V1
version: 2.0.0
last_updated: 2026-02-21

This is the authoritative reference for all reason codes across all EDGE_LAB courts.
Each code has exactly one definition. Used by all court scripts and operators.

---

## Taxonomy

| Prefix | Namespace | Epoch | Owner Script |
|--------|-----------|-------|-------------|
| E*** | Paper Evidence Invariants | P0 | edge_paper_evidence.mjs |
| X*** | Expectancy / CI / Execution Reality | P1, P2 | edge_expectancy_ci.mjs, edge_execution_reality.mjs |
| M*** | Micro-Live SRE | P3 | edge_micro_live_sre.mjs |
| H*** | Multi-Hypothesis | P4 | edge_multi_hypothesis_mvp.mjs |
| V*** | Portfolio | P5 | edge_portfolio_court.mjs |
| NONE | Clean PASS (all namespaces) | — | any court |

---

## E*** — Paper Evidence Invariants (P0)

| Code | Short Name | Severity | Description |
|------|-----------|---------|-------------|
| E900 | FILE_NOT_FOUND | NEEDS_DATA | Input evidence file does not exist |
| E020 | JSON_PARSE_ERROR | FAIL | File is not valid JSON |
| E021 | SCHEMA_VERSION_MISMATCH | FAIL | schema_version != "1.0.0" |
| E001 | SCHEMA_VALIDATION_FAILED | FAIL | AJV schema check failed (missing/invalid field) |
| E006 | RECEIPT_HASH_MISMATCH | FAIL | evidence_hash != SHA256(canonical_trades) — ANTI-TAMPER |
| E019 | DATE_ORDER_VIOLATION | FAIL | start_date > end_date |
| E018 | TRADE_COUNT_MISMATCH | FAIL | total_trades != trades.length |
| E014 | DUPLICATE_TRADE_IDS | FAIL | Two or more trades share the same trade_id |
| E002 | TIMESTAMP_NOT_MONOTONIC | FAIL | signal_ts >= order_submit_ts OR order_submit_ts >= ack_ts |
| E011 | ZERO_LATENCY | FAIL | order_submit_ts - signal_ts < 1ms (synthetic data flag) |
| E016 | ACK_BEFORE_FIRST_FILL | FAIL | ack_ts > fill_ts[0] |
| E017 | FILLS_NOT_MONOTONIC | FAIL | Fill timestamps not in ascending order |
| E023 | FILL_BEFORE_SIGNAL | FAIL | Any fill_ts <= signal_ts |
| E003 | PARTIAL_FILL_SUM_ERROR | FAIL | sum(fill.qty) != requested_qty (beyond rounding policy) |
| E024 | FILL_QTY_NOT_POSITIVE | FAIL | Any fill.qty <= 0 |
| E025 | NEGATIVE_FEE | FAIL | Any fill.fee_amount < 0 |
| E005 | FEE_BELOW_VENUE_MIN | FAIL | fee_amount < venue_fee_policy.min_fee_rate × qty × price |
| E022 | FEE_CURRENCY_INVALID | FAIL | fee_currency not in [USDT, BTC, BNB] |
| E007 | BID_ASK_NOT_POSITIVE | FAIL | bid_at_signal <= 0 OR ask_at_signal <= 0 |
| E008 | BID_EXCEEDS_ASK | FAIL | bid_at_signal >= ask_at_signal |
| E010 | SPREAD_TOO_TINY | FAIL | (ask-bid)/mid < 0.001% (synthetic zero-spread flag) |
| E013 | FILL_PRICE_OUT_OF_RANGE | FAIL | fill.price not in [bid*0.995, ask*1.005] |
| E009 | PERFECT_FILL_VOLATILE | FAIL | VOLATILE + single fill + <5ms + mid price = suspicious |
| E012 | NO_PARTIALS_VOLATILE | FAIL | VOLATILE + qty > 0.01 + single fill = suspicious |

---

## X*** — Expectancy CI / Execution Reality (P1, P2)

| Code | Short Name | Severity | Description |
|------|-----------|---------|-------------|
| X001 | PAPER_EVIDENCE_COURT_NOT_PASS | NEEDS_DATA | paper_evidence_court.json missing or status != PASS |
| X002 | CI_GATE_NOT_PASS | NEEDS_DATA (P2) | expectancy_ci.json missing or status != PASS |
| X003 | INSUFFICIENT_SAMPLES | NEEDS_DATA | Any candidate n < 30 (P1: min_samples=30) |
| X004 | CI_LOWER_NOT_POSITIVE | BLOCKED | Any candidate CI95_lower <= 0 (P1) |
| X005 | RETURN_DATA_MISSING | NEEDS_DATA | Candidate missing avg_winner_pct or avg_loser_pct |
| X002_CI_GATE_NOT_PASS | CI_GATE_NOT_PASS | NEEDS_DATA | MEASURED mode requires expectancy_ci PASS (P2) |

---

## M*** — Micro-Live SRE (P3)

| Code | Short Name | Severity | Description |
|------|-----------|---------|-------------|
| M001 | POLICY_FILES_MISSING | NEEDS_DATA | MICRO_LIVE_SRE_POLICY.md or INCIDENT_PLAYBOOK.md missing |
| M002 | SRE_FILES_MISSING | NEEDS_DATA | SLO_SLI.md or ERROR_BUDGET_POLICY.md missing |
| M003 | PROXY_VALIDATION_INCOMPLETE | BLOCKED | Proxy language in HACK_REGISTRY.md without valid PROXY_VALIDATION.md |
| M004 | PAPER_COURT_DRIFT | BLOCKED | Execution drift simulation exceeded thresholds |
| M005 | SLI_BASELINE_FAILED | BLOCKED | SLI baseline metrics out of SLO-defined ranges |

---

## H*** — Multi-Hypothesis (P4)

| Code | Short Name | Severity | Description |
|------|-----------|---------|-------------|
| H001 | CI_GATE_NOT_PASS | NEEDS_DATA | expectancy_ci.json missing or status != PASS |
| H002 | EVIDENCE_MISSING | NEEDS_DATA | paper_evidence.json not found or invalid |
| H003 | LEDGER_MISSING | NEEDS_DATA | TRIALS_LEDGER.md not found |
| H004 | CORRECTED_CI_LOWER_NOT_POSITIVE | BLOCKED | After Bonferroni correction, any candidate corrected_CI_lower <= 0 |

---

## V*** — Portfolio (P5)

| Code | Short Name | Severity | Description |
|------|-----------|---------|-------------|
| V001 | EVIDENCE_GATE_NOT_PASS | NEEDS_DATA | expectancy_ci.json missing/not PASS or paper_evidence.json missing |
| V002 | CORRELATION_TOO_HIGH | BLOCKED | Any pair max_pairwise_correlation >= 0.70 |
| V003 | KELLY_FRACTION_NOT_POSITIVE | BLOCKED | Any candidate full Kelly fraction <= 0 |
| V004 | PORTFOLIO_SHARPE_BELOW_MIN | BLOCKED | Equal-weight portfolio Sharpe < 1.0 |

---

## Special Values

| Value | Meaning |
|-------|---------|
| NONE | No reason code — court PASS or informational |
| FILE_NOT_FOUND | Gate file does not exist (not yet generated) |
| JSON_PARSE_FAILED | Gate file is not valid JSON |
| UNKNOWN | Status could not be read from gate file |
| MICRO_LIVE_PREREQUISITES_NOT_MET | MICRO_LIVE_READINESS: one or more gates not PASS |

---

## Severity Actions

| Severity | exit() | Pipeline behavior | Operator action |
|----------|--------|-----------------|----------------|
| NEEDS_DATA | 0 | Continue (non-blocking) | Provide missing data |
| BLOCKED | 1 | Abort + report BLOCKED | Fix invariant violation |
| FAIL | 1 | Abort + report FAIL | Fix invariant violation |
| WARN | 0 | Continue (advisory) | Review; no immediate action required |

---

---

## VERIFY_MODE Codes (Infra P0)

| Code | Action | Description |
|------|--------|-------------|
| VM01 | BLOCKED | BUNDLE mode but manifest missing required fingerprint field |
| VM02 | FAIL | BUNDLE checksums mismatch |
| VM03 | BLOCKED | GIT mode but .git missing |
| VM04 | FAIL | Bundle fingerprint malformed (bad BUNDLE_COMMIT_SHA_SHORT / SOURCE_FINGERPRINT) |

---

## DETERMINISM Codes (Infra P0)

| Code | Action | Description |
|------|--------|-------------|
| D001 | BLOCKED | RUN_ID cannot be resolved deterministically |
| D002 | FAIL | sha256_norm mismatch across x2 (nondeterminism) |
| D003 | BLOCKED | Canon rules changed without apply receipt (RESERVED — do NOT reuse for readiness input missing) |
| D005 | FAIL | Canon touched forbidden semantic line (NON-volatile) |

---

## READINESS Codes (Infra P0 → Edge Readiness)

| Code | Action | Description |
|------|--------|-------------|
| RD01 | BLOCKED | READINESS_INPUT_MISSING — required infra closeout JSON missing or unreadable. NEXT_ACTION: npm run infra:p0 |

---

## EVIDENCE_AND_SCOPE Codes (Infra P0)

| Code | Action | Description |
|------|--------|-------------|
| E001 | FAIL | Receipt chain break / tamper detected |
| E003 | FAIL | Ledger recursion OR scope mutation OR order drift without apply receipt |
| E004 | BLOCKED | UPDATE_SCOPE_POLICY missing or not hashed |

---

## INFRA_DEPS_OFFLINE Codes (Infra P0)

| Code | Action | Description |
|------|--------|-------------|
| DEP01 | BLOCKED | Offline install attempted registry/network access; capsule required |
| DEP02 | FAIL | Native build attempted outside allowed capsule/toolchain policy |
| DEP03 | FAIL | Install nondeterminism under same capsule (x2 drift) |

---

## NODE_TRUTH Codes (Infra P0)

| Code | Action | Description |
|------|--------|-------------|
| NT01 | BLOCKED | NODE_TRUTH.md missing |
| NT02 | FAIL | Node mismatch vs SSOT (family/minor/engines/.nvmrc/.node-version/pinned) |

---

## GOLDENS_GOV Codes (Infra P0)

| Code | Action | Description |
|------|--------|-------------|
| G001 | BLOCKED | Golden update attempted without APPLY protocol + UPDATE_GOLDENS=1 |
| G002 | FAIL | Golden mismatch under authoritative Node truth (regression) |

---

## FORMAT_POLICY Codes (Infra P0)

| Code | Action | Description |
|------|--------|-------------|
| FP01 | FAIL | Forbidden evidence format OR nondeterministic machine JSON (no schema_version / timestamps / unstable order) |

---

## TRADING_OFF Codes (P0)

| Code | Action | Description |
|------|--------|-------------|
| T000 | FAIL | Any trading/order submission attempted in P0 |

---

## DATA_COURT Codes (Calm P0)

| Code | Action | Description |
|------|--------|-------------|
| DC90 | NEEDS_DATA | Data outlier detected — multiple sources conflict. Manual confirmation required. |
| DC91 | BLOCKED | No authoritative data source confirmed. Cannot proceed. |
| DC92 | FAIL | Data source mismatch vs confirmed SSOT. |

---

## Epoch Dependency Graph

```
P0: PAPER_EVIDENCE_COURT (E***)
  └→ P1: EXPECTANCY_CI_COURT (X***)
       ├→ P2: EXECUTION_REALITY_COURT (X002_CI_GATE_NOT_PASS when CI missing)
       ├→ P4: MULTI_HYPOTHESIS_COURT (H***)
       └→ P5: PORTFOLIO_COURT (V***)

P3: MICRO_LIVE_SRE_COURT (M***)
  └→ MICRO_LIVE_READINESS (MICRO_LIVE_PREREQUISITES_NOT_MET)
```
