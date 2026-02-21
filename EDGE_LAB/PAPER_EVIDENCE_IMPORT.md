# PAPER_EVIDENCE_IMPORT.md — Paper Epoch Import Specification

version: 1.0.0
epoch: PROFIT_CANDIDATES_EXECUTION_COURTS_V1
last_updated: 2026-02-20

## Purpose

Formal specification of the **raw trades input file** accepted by `paper_epoch_runner.mjs`.
The runner validates, normalizes, and aggregates raw trade records into `artifacts/incoming/paper_evidence.json`,
which is then ingested by `edge:paper:ingest` to unlock MEASURED execution reality.

---

## Accepted File Formats

| Format | Path | Detection |
|--------|------|-----------|
| CSV (primary) | `artifacts/incoming/raw_paper_trades.csv` | Checked first |
| JSON array (secondary) | `artifacts/incoming/raw_paper_trades.json` | Checked if CSV absent |

The runner checks CSV first. If `raw_paper_trades.csv` is absent, it tries `raw_paper_trades.json`.
If neither exists: `STATUS=NEEDS_DATA` (exit 0).

---

## CSV Format

### Required Columns (exact header names, lowercase, order-independent)

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| `trade_id` | string | unique, non-empty | Unique trade identifier. Dedup: first occurrence wins on ID collision. |
| `candidate` | string | in PROFIT_CANDIDATES_V1.md | Strategy name e.g. `H_ATR_SQUEEZE_BREAKOUT` |
| `instrument` | string | BTCUSDT \| ETHUSDT \| SOLUSDT | Instrument traded |
| `entry_time` | string | ISO 8601 UTC | Trade entry timestamp. Format: `2026-01-02T09:00:00Z` |
| `exit_time` | string | ISO 8601 UTC, > entry_time | Trade exit timestamp |
| `side` | string | LONG \| SHORT | Trade direction |
| `pnl_pct` | number | float, any sign | **Realized P&L as % of allocated capital.** Positive = profit. Negative = loss. e.g. `1.247` or `-0.823`. |

### Optional Columns

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `entry_price` | float | — | Entry price in USD (informational) |
| `exit_price` | float | — | Exit price in USD (informational) |
| `size_pct` | float | 1.0 | Position size as % of capital (informational, not used in stat calculation) |
| `notes` | string | "" | Free-text annotation |

### Example CSV

```csv
trade_id,candidate,instrument,entry_time,exit_time,side,pnl_pct,notes
T001,H_ATR_SQUEEZE_BREAKOUT,BTCUSDT,2026-01-02T09:00:00Z,2026-01-02T13:00:00Z,LONG,1.15,
T002,H_ATR_SQUEEZE_BREAKOUT,BTCUSDT,2026-01-03T09:00:00Z,2026-01-03T13:00:00Z,LONG,-0.68,false breakout
T003,H_BB_SQUEEZE,ETHUSDT,2026-01-02T10:00:00Z,2026-01-02T14:00:00Z,LONG,0.98,
T004,H_VWAP_REVERSAL,BTCUSDT,2026-01-02T09:30:00Z,2026-01-02T11:30:00Z,SHORT,0.72,
```

---

## JSON Format

An array of objects. Each object must have the same fields as CSV columns (same required/optional distinction).

```json
[
  {
    "trade_id": "T001",
    "candidate": "H_ATR_SQUEEZE_BREAKOUT",
    "instrument": "BTCUSDT",
    "entry_time": "2026-01-02T09:00:00Z",
    "exit_time": "2026-01-02T13:00:00Z",
    "side": "LONG",
    "pnl_pct": 1.15,
    "notes": ""
  }
]
```

---

## Normalization Rules

1. **Timezone**: All timestamps MUST be UTC. Format: `YYYY-MM-DDTHH:MM:SSZ` or `...+00:00`.
   Timestamps without UTC offset are REJECTED (BLOCKED).

2. **Deduplication**: If two rows share the same `trade_id`, the **first occurrence** is kept.
   Later duplicates are silently dropped. The runner emits a warning count in `PAPER_EPOCH_RUNNER.md`.

3. **Column headers**: Case-insensitive match (all lowercased before matching). Extra whitespace trimmed.

4. **Unknown candidates**: Any `candidate` value not in `PROFIT_CANDIDATES_V1.md` causes `STATUS=BLOCKED`.
   All known candidates: `H_ATR_SQUEEZE_BREAKOUT`, `H_BB_SQUEEZE`, `H_VOLUME_SPIKE`, `H_VWAP_REVERSAL`.

5. **Unknown instruments**: Any `instrument` not in `{BTCUSDT, ETHUSDT, SOLUSDT}` causes `STATUS=BLOCKED`.

6. **pnl_pct units**: Must be **percent of capital** (e.g. `1.5` = +1.5%, `-0.8` = -0.8%).
   NOT fractional (0.015), NOT basis points. If values look like fractions (all |pnl| < 0.05 with many non-zero),
   the runner emits a warning but does NOT auto-correct (operator must fix input).

7. **Empty rows and comments**: Lines starting with `#` are skipped. Blank lines are skipped.

8. **Numeric parsing**: Any non-parseable `pnl_pct` causes `STATUS=BLOCKED` for that row.

---

## Per-Candidate Statistics (computed by runner)

The runner computes these statistics from all valid, deduped trades for each candidate:

| Stat | Formula |
|------|---------|
| `trade_count` | Count of valid trades after dedup |
| `expectancy_pct` | `mean(pnl_pct)` — arithmetic mean of all per-trade returns |
| `win_rate` | `count(pnl_pct > 0) / trade_count` |
| `avg_winner_pct` | `mean(pnl_pct) where pnl_pct > 0` — zero if no winners |
| `avg_loser_pct` | `mean(pnl_pct) where pnl_pct <= 0` — zero if no losers |
| `max_drawdown_pct` | Peak-to-trough drawdown of equity curve from trade sequence sorted by `entry_time` |
| `sharpe_ratio` | `mean(pnl_pct) / std(pnl_pct)` — per-trade Sharpe. Zero if std=0 (constant returns). |

### Equity Curve for Max Drawdown

Trades are sorted by `entry_time` (ascending) per candidate. Equity starts at 100.0:
```
equity[i] = equity[i-1] * (1 + pnl_pct[i] / 100)
peak = max(equity[0..i])
drawdown[i] = (peak - equity[i]) / peak * 100
max_drawdown_pct = max(drawdown[*])
```

---

## Minimum Trade Count

Per-candidate `trade_count >= 30` is required for `STATUS=PASS`.

If any candidate has `trade_count < 30`:
- Status: `NEEDS_DATA` (exit 0 — not a hard failure)
- Reason code: `INSUFFICIENT_TRADE_COUNT`
- `NEXT_ACTION`: Continue paper trading to accumulate more trades.

---

## Epoch Identification

| Field | Source |
|-------|--------|
| `epoch_id` | `PAPER_EPOCH_{start_date}_{end_date}` derived from trade date range, OR env `PAPER_EPOCH_ID` |
| `start_date` | Min `entry_time` date across all trades |
| `end_date` | Max `exit_time` date across all trades |
| `instrument` | Mode of `instrument` column (most frequent) |
| `generated_at` | Current ISO 8601 timestamp (pipeline clock) |

---

## Output Files

| File | Path | Description |
|------|------|-------------|
| `paper_evidence.json` | `artifacts/incoming/paper_evidence.json` | Gate input for `edge:paper:ingest` |
| `PAPER_EPOCH_RUNNER.md` | `reports/evidence/EDGE_LAB/PAPER_EPOCH_RUNNER.md` | Runner court evidence |

---

## Full Operator Workflow

```
1. Export raw trades from paper trading platform
2. Save to: artifacts/incoming/raw_paper_trades.csv  (or .json)
3. Run: node scripts/edge/edge_lab/paper_epoch_runner.mjs
4. Check: reports/evidence/EDGE_LAB/PAPER_EPOCH_RUNNER.md → STATUS=PASS?
5. Run: npm run edge:paper:ingest
6. Run: npm run edge:all
7. Run: npm run edge:next-epoch
```

See RUNBOOK_EDGE.md MP-04 for step-by-step with examples.

---

## Status Semantics

| Condition | STATUS | Exit Code |
|-----------|--------|-----------|
| No raw input file | NEEDS_DATA | 0 |
| Parse error | BLOCKED | 1 |
| Unknown candidate or instrument | BLOCKED | 1 |
| Validation errors | BLOCKED | 1 |
| Any candidate trade_count < 30 | NEEDS_DATA | 0 |
| All candidates >= 30 trades | PASS | 0 |

---

## MCL Notes

FRAME: Formal import specification for paper trading evidence ingest.
RISKS: Operator submitting pnl_pct in wrong units (fractional vs percent). Mitigation: runner emits warning.
CONTRACT: paper_epoch_runner.mjs validates all fields before writing paper_evidence.json.
MIN-DIFF: Only fields required for EXECUTION_REALITY MEASURED transition. No extra metrics.
RED-TEAM: Fabricated high expectancy with <30 trades → NEEDS_DATA. Correct schema but wrong units → warning emitted.
PROOF: Run node scripts/edge/edge_lab/paper_epoch_runner.mjs with valid CSV → STATUS=PASS + paper_evidence.json.
