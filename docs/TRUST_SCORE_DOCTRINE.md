# TRUST_SCORE_DOCTRINE.md

> SSOT for TruthLevel vs Trust Score doctrine.
> Gate: RG_TRUST01 (doc present + required sections), RG_TRUST02 (cockpit column name coherence).

---

## STATUS

```
schema_version: 1.0.0
doc_status: AUTHORITATIVE
trust_score_data_implemented: false
last_updated_epoch: productization-r1.2
```

---

## 1. TRUTHLEVEL vs TRUST SCORE

These are DISTINCT concepts. Do NOT conflate them.

| Field | Source | Meaning |
|-------|--------|---------|
| `truth_level` | `specs/data_lanes.json` | Lane authority class: TRUTH / HINT / RISK_ONLY |
| `trust_score` | NOT YET IMPLEMENTED | Computed score based on data quality/freshness (R2 feature) |

---

## 2. COCKPIT COLUMN NAME POLICY

The Cockpit HUD (ops:cockpit) displays a per-lane column.

**Current epoch (R1.x):** Column is named **`TruthLevel`** because:
- `trust_score_data` is NOT implemented
- Displaying "Trust" implies a computed score that does not yet exist
- Showing `truth_level` from the registry is honest and accurate

**Future (R2.x):** When `trust_score_data` lands:
1. Gate `RG_TRUST02` will verify the column rename to `Trust` is safe
2. `trust_score_data_implemented: true` must be set in this doc
3. Cockpit column may be renamed from `TruthLevel` → `Trust`

**FORBIDDEN until R2**: displaying "Trust" in cockpit when trust_score_data is absent.

---

## 3. TRUTHLEVEL SEMANTICS

TruthLevel is a static registry tag on each lane:

| Value | Gate Behavior | Operator Meaning |
|-------|--------------|-----------------|
| `TRUTH` | Failure blocks system readiness | Primary authoritative source |
| `HINT` | Failure produces WARN only | Secondary/advisory source |
| `RISK_ONLY` | Never gates | Risk/monitoring only |

TruthLevel does NOT change between runs. It is set by the operator in `specs/data_lanes.json`.

---

## 4. TRUST SCORE (FUTURE R2)

When implemented, trust_score will be:
- A floating-point [0.0, 1.0] computed per lane per run
- Based on: data freshness, provider uptime, schema compliance rate, replay success rate
- Written to `reports/evidence/EPOCH-*/trust_score_data.json`
- Only surfaced in cockpit when the above file exists

Until `trust_score_data.json` exists → cockpit shows TruthLevel, not Trust.

---

## 5. ANTI-FABRICATION RULE

**Zero-hallucination doctrine applies**: if trust_score_data is missing, cockpit MUST show
`TruthLevel` (the registry value), not a fabricated trust score.

Any cockpit output showing a "Trust" score without `trust_score_data.json` evidence is a
gate violation (RG_TRUST02).

---

## EVIDENCE PATHS

- `reports/evidence/EPOCH-COCKPIT-*/HUD.md` — cockpit output
- `reports/evidence/EPOCH-COCKPIT-*/HUD.json` — machine-readable HUD
- `specs/data_lanes.json` — truth_level SSOT
