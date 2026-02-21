# PAPER_EVIDENCE_SPEC.md — Paper Trading Evidence Schema v1.0

epoch: PROFIT_CANDIDATES_EXECUTION_COURTS_V1
version: 1.0.0
last_updated: 2026-02-20

## Purpose

Formal specification of the paper trading evidence file (`artifacts/incoming/paper_evidence.json`).
When this file is present and valid, EXECUTION_REALITY transitions from PROXY to MEASURED status.
When absent: PAPER_EVIDENCE court returns STATUS=NEEDS_DATA (not a hard failure).
When present but invalid: PAPER_EVIDENCE court returns STATUS=BLOCKED (fail-closed).

## File Path

`artifacts/incoming/paper_evidence.json`

## JSON Schema (AJV-compatible, Draft-07)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PaperEvidence",
  "description": "Paper trading epoch evidence for EDGE_LAB candidates",
  "type": "object",
  "required": [
    "schema_version",
    "epoch_id",
    "start_date",
    "end_date",
    "instrument",
    "candidates",
    "total_trades",
    "generated_at"
  ],
  "additionalProperties": false,
  "properties": {
    "schema_version": {
      "type": "string",
      "const": "1.0.0",
      "description": "Must be '1.0.0'. Increment when schema changes."
    },
    "epoch_id": {
      "type": "string",
      "minLength": 1,
      "description": "Unique paper trading epoch identifier, e.g. 'PAPER_EPOCH_001'"
    },
    "start_date": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
      "description": "Epoch start date in YYYY-MM-DD format"
    },
    "end_date": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
      "description": "Epoch end date in YYYY-MM-DD format"
    },
    "instrument": {
      "type": "string",
      "enum": ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
      "description": "Primary instrument traded in this epoch"
    },
    "candidates": {
      "type": "array",
      "minItems": 1,
      "description": "Per-candidate performance metrics",
      "items": {
        "type": "object",
        "required": [
          "name",
          "trade_count",
          "expectancy_pct",
          "win_rate",
          "avg_winner_pct",
          "avg_loser_pct",
          "max_drawdown_pct",
          "sharpe_ratio"
        ],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "pattern": "^H_[A-Z_]+$",
            "description": "Candidate name from PROFIT_CANDIDATES_V1.md"
          },
          "trade_count": {
            "type": "integer",
            "minimum": 1,
            "description": "Number of completed trades in epoch. Minimum 1 required."
          },
          "expectancy_pct": {
            "type": "number",
            "description": "Per-trade expectancy as percentage of capital (e.g. 0.45 = 0.45%). May be negative."
          },
          "win_rate": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "Fraction of winning trades [0.0, 1.0]"
          },
          "avg_winner_pct": {
            "type": "number",
            "minimum": 0,
            "description": "Average winner size as percentage of capital (must be >= 0)"
          },
          "avg_loser_pct": {
            "type": "number",
            "maximum": 0,
            "description": "Average loser size as percentage of capital (must be <= 0)"
          },
          "max_drawdown_pct": {
            "type": "number",
            "minimum": 0,
            "description": "Maximum intra-epoch drawdown as percentage (absolute value)"
          },
          "sharpe_ratio": {
            "type": "number",
            "description": "Sharpe ratio over epoch (may be negative)"
          }
        }
      }
    },
    "total_trades": {
      "type": "integer",
      "minimum": 1,
      "description": "Total trades across all candidates in epoch"
    },
    "generated_at": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}",
      "description": "ISO 8601 timestamp when this file was generated"
    },
    "notes": {
      "type": "string",
      "description": "Optional free-text notes about the paper epoch"
    }
  }
}
```

## Required Fields Summary

| Field | Type | Constraint | Notes |
|-------|------|-----------|-------|
| schema_version | string | const "1.0.0" | Bump when schema changes |
| epoch_id | string | minLength 1 | Unique per paper run |
| start_date | string | YYYY-MM-DD | Epoch start |
| end_date | string | YYYY-MM-DD | Epoch end |
| instrument | string | enum | BTCUSDT, ETHUSDT, or SOLUSDT |
| candidates | array | minItems 1 | Per-candidate metrics |
| total_trades | integer | >= 1 | Aggregate |
| generated_at | string | ISO 8601 | Generator timestamp |

## Per-Candidate Required Fields

| Field | Type | Constraint |
|-------|------|-----------|
| name | string | pattern H_[A-Z_]+ |
| trade_count | integer | >= 1 |
| expectancy_pct | number | any (may be negative) |
| win_rate | number | [0, 1] |
| avg_winner_pct | number | >= 0 |
| avg_loser_pct | number | <= 0 |
| max_drawdown_pct | number | >= 0 (absolute value) |
| sharpe_ratio | number | any |

## Validation Rules (court-level, beyond schema)

1. `end_date >= start_date`
2. Each candidate `name` must appear in PROFIT_CANDIDATES_V1.md (validated by edge:paper:ingest)
3. `total_trades >= sum(candidates[*].trade_count) * 0.5` (sanity check — can be less if multi-instrument)
4. If `trade_count < 30` for any candidate: STATUS transitions to NEEDS_DATA (insufficient sample)

## Status Semantics

| Condition | STATUS | Meaning |
|-----------|--------|---------|
| File absent | NEEDS_DATA | No paper epoch yet — not a hard failure |
| File present, schema invalid | BLOCKED | Must fix schema violations before proceeding |
| File present, schema valid, trade_count < 30 | NEEDS_DATA | Insufficient sample — more trades required |
| File present, schema valid, trade_count >= 30 | PASS | Valid paper evidence, MEASURED transition triggered |

## Contract

This spec is machine-enforced by `edge:paper:ingest` (scripts/edge/edge_lab/edge_paper_ingest.mjs).
Validation uses AJV (dev dependency) with `allErrors: true, strict: true`.

## MCL Notes

FRAME: Formal schema for paper trading evidence ingest.
RISKS: Optimistic expectancy values without sufficient trade count. Mitigation: trade_count >= 30 minimum.
CONTRACT: edge_paper_ingest.mjs validates all fields. Schema violation = BLOCKED.
MIN-DIFF: Minimal schema — only fields needed for EXECUTION_REALITY upgrade decision.
RED-TEAM: Attempt to submit fabricated expectancy without sufficient trades → blocked by trade_count check.
