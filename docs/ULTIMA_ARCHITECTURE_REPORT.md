# TREASURE ENGINE — ULTIMA FIRMWARE REPORT (LEAD MODE)

STATUS: ACTIVE | VERSION: 1.0.0 | ROLE: PROJECT LEAD

---

## SNAPSHOT

- **Система**: Treasure Engine — offline-first exchange-grade data engine + profit factory
- **Node SSOT**: 22.22.0 (capsule-verified)
- **Epochs**: 142+ | **npm scripts**: 500+ | **Regression gates**: 154+
- **Data lanes**: 5 (1 TRUTH_READY, 1 PREFLIGHT, 3 EXPERIMENTAL)
- **Providers**: Bybit (CORE), OKX (R2), Binance (EXPERIMENTAL)
- **WOW Items**: 12 SHIPPED/STAGED | **Modes**: CERT, CLOSE, AUDIT, RESEARCH, ACCEL

---

## ARCHITECTURE MAP

```
┌──────────────────────────────────────────────────────────┐
│              OPERATOR (npm run -s ops:life)               │
│                      ┌────────┐                          │
│                      │  LIFE  │ S01..S06 deterministic   │
│                      └───┬────┘                          │
│         ┌────┬────┬──┼──┬─────┬─────┐                   │
│         ▼    ▼    ▼  ▼  ▼     ▼     │                   │
│      verify event time auto cockpit cand                 │
│      :fast  bus   mach pilot HUD    reg                  │
│       (S01) (S02) (S03)(S04)(S05)  (S06)                │
│         └────┴────┴──┴──┴─────┘                         │
│                   │                                      │
│              ┌────▼────┐                                 │
│              │EVENTBUS │ tick-only, append-only           │
│              │   V1    │                                  │
│              └────┬────┘                                 │
│    ┌──────────────┼──────────────┐                       │
│    ▼              ▼              ▼                        │
│ TRUTH          DATA ORGAN     PROFIT                     │
│ ENGINE         (5 lanes)      FACTORY                    │
│ ALLOW/DEGRAD   bybit/okx/    paper/canary               │
│ /HALT          binance       /micro-live                 │
│    │              │              │                        │
│    ▼              ▼              ▼                        │
│ GOVERNANCE    PROVIDERS      EXECUTION                   │
│ FSM           WS feeds       paper/live/demo             │
│ DRY→PAPER→    lock+sha256    kill matrix                 │
│ LIVE_S→LIVE                                              │
│                                                          │
│ GATES: 154+ | COURTS: v1/v2 | EVIDENCE: EPOCH-*         │
└──────────────────────────────────────────────────────────┘
```

**Ключевые потоки**:
1. **DAILY**: ops:life → verify:fast → eventbus → timemachine → autopilot → cockpit → candidates
2. **DATA**: acquire (double-key) → raw.jsonl+lock.json → offline replay → dedup → reorder → digest
3. **R2**: OKX orderbook → buffer → snapshot → discard → align → STRICT → digest proof
4. **PROFIT**: edge:paper:sim → canary → micro-live → kill matrix → profit ledger

---

## SYSTEM LEVEL SET (L1–L12)

| L | Описание | Балл | Upgrade |
|---|----------|------|---------|
| L1 | single-command life | **5** | — |
| L2 | deterministic cockpit | **4** | freshness gate на EPOCH_FALLBACK |
| L3 | no time truth (tick-only) | **5** | — |
| L4 | no hidden net in CERT | **4** | net-kill probe в каждом spawnSync child |
| L5 | write-scope discipline | **5** | — |
| L6 | delivery semantics SSOT | **3** | specs/DELIVERY_SEMANTICS.md per lane |
| L7 | lane registry + lifecycle | **4** | lane_state court |
| L8 | capabilities scope-aware | **4** | bybit.scopes + heartbeat_interval_ms |
| L9 | digest canon (no float) | **5** | — |
| L10 | R2 isolation from daily | **4** | R2_DAILY_ISOLATION court |
| L11 | profit safety covenant | **4** | specs/KILL_MATRIX.json |
| L12 | courts cover failures | **3** | 8 formal courts |

**Итого: 50/60 (83%) — NEAR-EXCHANGE-GRADE**


---

## OFFICIAL RESEARCH: PROVIDER DELTAS

### OKX Checksum Deprecation (источник: OKX API changelog)
- Demo env: **early May 2026**, Production: **early August 2026**
- Новая процедура: seqId/prevSeqId validation вместо checksum
- **Наша реализация совпадает** (6-step align, checksum_deprecated: true)
- **DELTA-01**: Live acquire нужен update (шаг 2: игнорировать первый snapshot)
- **DELTA-02**: REST endpoint параметр `source` — 5 марта 2026

### Bybit WS Heartbeat (источник: Bybit V5 docs)
- Ping interval = **20 секунд**, disconnect после 10 минут
- **DELTA-03**: heartbeat_interval_ms отсутствует в capabilities.bybit.policy

### Binance Depth Sync (источник: Binance Spot/Futures docs)
- Spot: `U <= lastUpdateId <= u`; Futures: + `pu === prev.u`
- **DELTA-04**: sync_field_mapping не специфицирован в capabilities

---

## RISK REGISTER (Top 10)

| # | Risk | Sev | Recommended |
|---|------|-----|-------------|
| R01 | Stale-run в Cockpit EPOCH_FALLBACK | MED | Freshness gate |
| R02 | net-kill не покрывает spawnSync children | HIGH | RG env inheritance |
| R03 | OKX live acquire не готов к May 2026 | MED | Spec + script update |
| R04 | Kill matrix thresholds hardcoded | HIGH | specs/KILL_MATRIX.json |
| R05 | Lane state transitions не enforced | MED | Court + gate |
| R06 | Delivery semantics не документированы | MED | SSOT spec |
| R07 | Bybit heartbeat_interval_ms missing | LOW | capabilities update |
| R08 | Binance U/u/lastUpdateId не spec'd | LOW | capabilities + spec |
| R09 | Нет формальных Courts для ND*/LEAK* | HIGH | 8 formal courts |
| R10 | R2 может попасть в daily chain | MED | Isolation court |

---

## SABOTAGE RADAR (Top 15)

| # | Vector | Killing Gate |
|---|--------|-------------|
| S01 | NODE_OPTIONS injection | regression_node_options_netkill_dedupe |
| S02 | Stale EXECUTOR receipts | Cockpit run_id filter |
| S03 | Net leak через spawnSync | regression_net_kill_preload_hard |
| S04 | Float в orderbook sort | RG_DEC01_DECIMAL_SORT_TOTAL_ORDER |
| S05 | Duplicate messages corrupt book | RG_OB_OKX09_DUPLICATE_IDEMPOTENT |
| S06 | Out-of-order messages | RG_OB_OKX10_REORDER_WINDOW_POLICY |
| S07 | APPLY_AUTOPILOT left in artifacts | regression_unlock01 |
| S08 | Evidence bloat в PR | regression_pr01_evidence_bloat_guard |
| S09 | Wall-clock в EventBus | RG_EVT02_NO_TIME_FIELDS |
| S10 | CERT writes to EXECUTOR | RG_CERT_EXECUTOR_WRITE01 |
| S11 | nvm overrides pinned node | regression_node_nvm_ban |
| S12 | Live enabled by default | regression_microlive01_must_fail |
| S13 | AGENTS.md deleted | RG_AGENT01_AGENTS_PRESENT |
| S14 | seqId gap undetected | RG_OB_OKX06_GAP_DETECTION |
| S15 | Lock sha256 mismatch | RG_LIQ_LOCK01 |


---

## COURT MATRIX (8 Courts)

### Court 1: Determinism Court (ND*)
- **Triggers**: diff output при повторном запуске
- **Verdicts**: ND01 (byte mismatch), ND02 (ordering), ND03 (volatile leak)
- **Gates**: RG_TIME01, RG_BUS01_DETERMINISM_X2, RG_OB_OKX14
- **Status**: PARTIALLY_IMPLEMENTED — x2 gates есть, нет Court orchestrator

### Court 2: Network Court (NETV01)
- **Triggers**: сетевая активность в CERT/CLOSE/daily
- **Verdicts**: NETV01 (net in offline), NET_REQUIRED (no double-key)
- **Gates**: RG_NET_TOOLCHAIN01, regression_net_kill_preload_hard
- **Status**: IMPLEMENTED

### Court 3: Write-Scope Court (CHURN01)
- **Triggers**: запись вне artifacts/** или reports/evidence/EPOCH-*/**
- **Verdicts**: CHURN01 (unauthorized write), TMP01 (temp outside roots)
- **Gates**: RG_LIFE03, regression_churn_contract01, regression_tmp01
- **Status**: IMPLEMENTED

### Court 4: Truth Court (Lineage/Locks/Digest)
- **Triggers**: sha256 mismatch, schema drift, lock field missing
- **Verdicts**: RDY01 (missing data), RDY02 (mismatch), TRUTH01 (digest drift)
- **Gates**: RG_LIQ_LOCK01, RG_LIQ_SSOT01, RG_OB_OKX04/15/16
- **Status**: PARTIALLY_IMPLEMENTED

### Court 5: Leakage Court (Future Reads)
- **Triggers**: lookahead в backtest/paper/edge
- **Verdicts**: LEAK01 (timestamp), LEAK02 (future price), LEAK03 (cross-fold)
- **Gates**: epoch29 (leakage sentinel), e108_no_lookahead_contract
- **Status**: PARTIALLY_IMPLEMENTED

### Court 6: Provider Physics Court
- **Triggers**: rate limit exceeded, heartbeat timeout, align failure
- **Verdicts**: PHYS01 (rate), PHYS02 (heartbeat), PHYS03 (align gap)
- **Gates**: RG_CAP01-05, RG_OB_OKX12
- **Status**: SPEC_ONLY

### Court 7: Profit Court (Must-Fail Live)
- **Triggers**: live без unlock, drawdown/loss breach
- **Verdicts**: PROFIT01, HALT_MAX_DRAWDOWN, HALT_DAILY_LOSS, HALT_KILL_SWITCH
- **Gates**: regression_microlive01, regression_microlive02
- **Status**: PARTIALLY_IMPLEMENTED — thresholds hardcoded

### Court 8: UX/Product Court
- **Triggers**: cockpit stale data, broken links, ordering drift
- **Verdicts**: UX01 (stale), UX02 (broken link), UX03 (ordering drift)
- **Gates**: RG_COCKPIT03-06
- **Status**: PARTIALLY_IMPLEMENTED


---

## WOW PORTFOLIO (G1-G4)

### Top-15 by Score

| # | Idea | Score |
|---|------|-------|
| 1 | Kill Matrix SSOT + Court | 22 |
| 2 | Delivery Semantics Spec per Lane | 21 |
| 3 | Lane State Promotion Court | 20 |
| 4 | Provider Physics Spec + Heartbeat | 18 |
| 5 | Cockpit Freshness Gate | 18 |
| 6 | Reason Code Taxonomy SSOT | 18 |
| 7 | ND Byte Diff Court | 17 |
| 8 | Formal 8-Court System | 17 |
| 9 | Binance Depth Sync Spec | 13 |
| 10 | Trust Score OS (monotonic) | 13 |
| 11 | OKX Live Acquire (seqId flow) | 13 |
| 12 | Parallel Gate Runner | 12 |
| 13 | Spec Drift Sentinel | 12 |
| 14 | Tick DAG Explorer | 11 |
| 15 | Evidence Graph Visualizer | 11 |

### WOW3 MUST SHIP

**WOW3-A: Kill Matrix SSOT + Profit Court**
- specs/KILL_MATRIX.json + Court 7 orchestrator + RG gate
- Migration: PREVIEW (spec) → SHADOW (compare) → CANARY → FULL

**WOW3-B: Delivery Semantics Spec per Lane**
- specs/DELIVERY_SEMANTICS.md + per-lane contract + RG gate
- Migration: PREVIEW (doc) → SHADOW (validate) → FULL

**WOW3-C: Lane State Promotion Court**
- Court + gate verifying promotion preconditions
- Migration: PREVIEW (spec) → CANARY (auto-refuse) → FULL

---

## DATA CONTRACT PACK

### liq_bybit_ws_v5 (TRUTH_READY)
- truth_level: TRUTH | schema: liquidations.bybit_ws_v5.v2
- lock: provider_id, schema_version, time_unit_sentinel=ms, sha256
- delivery: at-most-once offline replay

### liq_okx_ws_v5 (EXPERIMENTAL)
- truth_level: HINT | schema: liquidations.okx_ws_v5.v1
- dedup_key: seqId | reorder: window=5
- delivery: at-most-once offline replay

### price_okx_orderbook_ws (PREFLIGHT)
- R2 exceptions: no_update(SKIP), seq_reset(RESET), empty_updates(IGNORE)
- align: 6-step DISCARD→ALIGN_FIRST_EVENT→STRICT
- digest: canonical sha256 (compareDecimalStr, no parseFloat)


---

## LEADERSHIP DECISION LEDGER (15 Decisions)

| ID | Statement | Guard Gate |
|----|-----------|-----------|
| D-100 | Bybit = TRUTH, OKX/Binance = HINT. Promotion requires 10+ replays + 30d stable | RG_LANE04 |
| D-101 | Digest canon = string-only, no parseFloat | RG_DEC01 |
| D-102 | OKX dedup key = seqId, idempotent | RG_OB_OKX09 |
| D-103 | OKX reorder window = 5 items | RG_OB_OKX10 |
| D-104 | R2 packs never enter daily chain | regression_r2_01 |
| D-105 | Daily = verify:fast + ops:life | RG_LIFE01 |
| D-106 | Capabilities = per-provider sections + confidence_map | RG_CAP01-05 |
| D-107 | Confidence: HIGH/MEDIUM/LOW; no LOW in TRUTH lanes | RG_CAP02 |
| D-108 | Micro-live = must-fail default; explicit file contract | regression_microlive01 |
| D-109 | Kill matrix → migrate to specs/KILL_MATRIX.json (WOW3-A) | TBD |
| D-110 | PR = clean-room; 0 tracked EPOCH files | regression_pr01 |
| D-111 | EventBus = tick-only, no timestamps | RG_BUS01, RG_EVT02 |
| D-112 | Node = 22.22.0, capsule-verified | regression_node_truth |
| D-113 | OKX checksum deprecated — acknowledged, no action for offline | RG_OB_OKX15 |
| D-114 | Double-key = standard for destructive actions | regression_auto04 |

---

## ROADMAP P0–P3

### P0: FOUNDATION LOCK (сейчас)
- verify:fast x2 PASS + ops:life PASS + ULTIMA report committed
- **ONE_NEXT_ACTION**: `npm run -s verify:fast`

### P1: SAFETY SSOT
- specs/KILL_MATRIX.json + specs/DELIVERY_SEMANTICS.md + Provider Physics update
- L6→4, L11→5
- **ONE_NEXT_ACTION**: Create specs/KILL_MATRIX.json

### P2: COURTS SYSTEM
- 8 formal courts + Cockpit court section + Lane Promotion Court
- L12→5
- **ONE_NEXT_ACTION**: Implement Court orchestrator

### P3: EXCHANGE-GRADE
- OKX live acquire update + Binance sync spec + all MEDIUM→HIGH
- All L1–L12 = 5
- **ONE_NEXT_ACTION**: Update OKX live acquire

---

## VERDICT

**VERDICT**: READY (conditional)
**Score**: 50/60 (83%) NEAR-EXCHANGE-GRADE
**Gaps**: Kill matrix not SSOT (R04), delivery semantics undocumented (R06), courts not formalized (R09)
**Condition**: P1 closes safety; P2 closes governance; P3 = exchange-grade
**Confidence**: HIGH offline, MEDIUM live acquire

## ONE_NEXT_ACTION

```bash
npm run -s verify:fast
```

## SOURCES

- [OKX API Changelog](https://www.okx.com/docs-v5/log_en/)
- [Bybit V5 WS Connect](https://bybit-exchange.github.io/docs/v5/ws/connect)
- [Binance Spot WS Streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)
- [Binance Futures Order Book](https://developers.binance.com/docs/derivatives/usds-margined-futures/websocket-market-streams/How-to-manage-a-local-order-book-correctly)
