# DATA_DELIVERY_SEMANTICS.md

> SSOT for data delivery guarantees and semantics across all public data lanes.
> Gate: RG_DELIV01 (doc present + required sections), RG_DELIV02 (coherence with data_lanes.json).

---

## STATUS

```
schema_version: 1.0.0
doc_status: AUTHORITATIVE
last_updated_epoch: productization-r1.2
```

---

## 1. DELIVERY MODEL

All public data lanes in `specs/data_lanes.json` operate under the following delivery semantics:

| Property | Value |
|----------|-------|
| Transport | WebSocket (wss://) |
| Mode | Push (server-initiated updates) |
| Bootstrap | Snapshot-on-connect per provider spec |
| Update ordering | Sequence-number ordered where supported |
| Deduplication | Provider-specific (seqId for OKX, seq_no for Binance/Bybit) |
| Gap detection | Offline replay validates sequence integrity |
| Offline-only | All CERT processing is network-free (TREASURE_NET_KILL=1) |

---

## 2. TRUTH LEVELS

Each lane carries a `truth_level` tag:

| Level | Meaning |
|-------|---------|
| `TRUTH` | Authoritative: gate PASS required for system readiness |
| `HINT` | Advisory: FAIL produces WARN, never blocks |
| `RISK_ONLY` | Informational: never gating |

Current TRUTH lanes (see `specs/data_lanes.json` for up-to-date registry):
- `liq_bybit_ws_v5` — ByBit v5 liquidation feed

---

## 3. STATIC vs DYNAMIC LANES

| Lane Mode | Artifact Path | Resolution |
|-----------|--------------|------------|
| `DYNAMIC` | Contains `<RUN_ID>` placeholder | Latest run dir selected; SELECT_RUN_ID overrides |
| `STATIC` | No `<RUN_ID>` placeholder | Direct file existence check; no run enumeration |

STATIC lanes: PASS when all required files exist. Never produces perpetual RDY01.

---

## 4. READINESS STATES

| State | EC | Meaning |
|-------|----|---------|
| `PASS` | 0 | All TRUTH lanes pass |
| `NEEDS_DATA` | 2 | Required artifacts missing (not a code error) |
| `FAIL` | 1 | Hash mismatch, schema error, or replay failure |

reason_code tokens:
- `NONE` — no issue
- `RDY01` — missing artifacts
- `RDY02` — schema/hash/lock field error
- `RDY_SELECT01_INVALID` — SELECT_RUN_ID specifies non-existent run

---

## 5. OPERATOR SELECTOR

`artifacts/incoming/SELECT_RUN_ID` (single line: run_id) forces run selection for all DYNAMIC lanes.

**Fail-closed**: if the specified run does not exist in the artifact store → `RDY_SELECT01_INVALID`.

**Daily hygiene**: `SELECT_RUN_ID` must NOT be present during normal ops:life loop (enforced by `RG_RDY_SELECT02`). To override: also place `artifacts/incoming/ALLOW_SELECT_RUN_ID`.

---

## 6. OFFLINE GUARANTEE

All readiness evaluation runs under `TREASURE_NET_KILL=1`. Any network access → gate blocks with `NETV01`. This is enforced by `RG_RDY_SELECT02` and the CERT mode rules.

---

## EVIDENCE PATHS

- `reports/evidence/EXECUTOR/PUBLIC_DATA_READINESS_SEAL.md`
- `reports/evidence/EXECUTOR/gates/manual/public_data_readiness_seal.json`
- `specs/data_lanes.json` — Lane Registry SSOT
