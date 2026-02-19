# HACK_SCHEMA.md — Edge Hypothesis Passport Schema
version: 1.0.0 | schema_type: EDGE_PASSPORT

## Required Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| hack_id | string | YES | Unique ID e.g. H_ATR_SQUEEZE_BREAKOUT |
| name | string | YES | Human-readable name |
| status | enum | YES | DRAFT / TESTING / ELIGIBLE / NOT_ELIGIBLE / NEEDS_DATA / ARCHIVED |
| dependency_class | enum | YES | OHLCV / MTF / EXTERNAL |
| truth_tag | enum | YES | TRUE_DATA / PROXY_DATA / UNAVAILABLE |
| hypothesis | string | YES | Falsifiable edge claim |
| entry_logic | string | YES | Entry condition |
| exit_logic | string | YES | Exit condition |
| timeframes | array | YES | e.g. [1h, 4h] |
| instruments | array | YES | e.g. [BTCUSDT] |
| params | object | YES | Tunable parameters with defaults |
| proxy_definition | string | IF PROXY | How PROXY_DATA is constructed |
| proxy_failure_modes | string | IF PROXY | Known failure modes of proxy |
| created_at | date | YES | ISO date |
| updated_at | date | YES | ISO date |
| trials_count | int | YES | Number of optimization trials run |
| oos_periods | array | YES | Out-of-sample periods tested |
| reason_code | string | IF BLOCKED | REASON_CODE from REASON_CODES.md |
| next_action | string | IF BLOCKED | Explicit operator next action |

## Status Transitions
DRAFT → TESTING → ELIGIBLE
DRAFT/TESTING → NOT_ELIGIBLE (fails any court)
DRAFT/TESTING → NEEDS_DATA (missing required external data)
ANY → ARCHIVED

## Enum Values

### status
- DRAFT: Initial hypothesis, not yet tested
- TESTING: Active optimization and walk-forward in progress
- ELIGIBLE: Passed all courts, ready for live deployment consideration
- NOT_ELIGIBLE: Failed one or more courts; do not deploy
- NEEDS_DATA: Blocked pending data source acquisition
- ARCHIVED: No longer active; historical record

### dependency_class
- OHLCV: Requires only Open/High/Low/Close/Volume data
- MTF: Requires multi-timeframe OHLCV alignment
- EXTERNAL: Requires external data feeds (funding rates, OI, sentiment, etc.)

### truth_tag
- TRUE_DATA: Real historical data is available and has been verified
- PROXY_DATA: A proxy/synthetic approximation is used; real data unavailable
- UNAVAILABLE: Data source does not yet exist or has not been acquired

## Validation Rules
1. If truth_tag == PROXY_DATA → proxy_definition and proxy_failure_modes are REQUIRED
2. If truth_tag == UNAVAILABLE → status must be NEEDS_DATA
3. If status == NOT_ELIGIBLE → reason_code is REQUIRED
4. If status == NEEDS_DATA → next_action is REQUIRED
5. trials_count must be >= 0
6. oos_periods must be a non-empty array for status == TESTING or ELIGIBLE
7. hack_id must match pattern: H_[A-Z0-9_]+
8. timeframes must be subset of: [1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w]
