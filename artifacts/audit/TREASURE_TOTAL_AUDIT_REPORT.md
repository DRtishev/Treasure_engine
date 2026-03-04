# TREASURE_TOTAL_AUDIT_REPORT.md

**Дата:** 2026-03-04
**Timezone:** Europe/Amsterdam
**Режим:** CERT (OFFLINE)
**Аудитор:** Claude (Principal Engineer / QA Officer / Release Gatekeeper / SRE / Security Auditor)

---

## EXECUTIVE SUMMARY

Treasure Engine — зрелая система с 1002 npm scripts, 340+ verify gates, 7 Edge Lab courts,
формальным FSM (Nervous System), EventBus, Doctor OS и Cockpit HUD.

**Здоровье инфраструктуры: ХОРОШЕЕ.** verify:fast x2 PASS, e108 determinism x2 PASS,
ops:life/doctor/cockpit PASS. Детерминизм gate chain подтверждён.

**Критические находки:**
1. **FINDING-B (ПОДТВЕРЖДЕНО, P1):** 7 Edge Lab courts реализованы качественно, но ORPHANED — не wired в операционный pipeline. Кандидат проходит DRAFT → BACKTESTED → GRADUATED без court validation.
2. **FINDING-C (ПОДТВЕРЖДЕНО, P1):** 5+ различных формул Sharpe, 5 реализаций drawdown, несовместимые единицы PnL между стадиями pipeline. Нет cross-stage metric parity contract.
3. **FINDING-A (ОПРОВЕРГНУТО):** ajv и e108 работают корректно на текущей ветке.

**Дополнительные находки:**
4. **FINDING-D (P2):** 9 файлов с Math.random() в core/, 40+ с bare Date.now() — потенциальный ND.
5. **FINDING-E (P2):** engine_paper.mjs передаёт array вместо object в computePenalizedMetrics.

---

## PHASE 0: SNAPSHOT

| Параметр | Значение |
|---|---|
| Branch | `claude/audit-harden-treasure-engine-68ZkR` |
| HEAD | `bdbf61f4aabe31a5d8d5ee1e8489f5e92896f578` |
| Node | v22.22.0 |
| npm | 10.9.4 |
| Режим | CERT (offline, no ALLOW_NETWORK) |
| Deps | 45 packages (2 runtime: undici, ws), 1 moderate vuln |

---

## PHASE 2: EXECUTE — Доказательства

### verify:fast x2 (DETERMINISM CONFIRMED)

| Run | EC | Gates | Status |
|---|---|---|---|
| Run 1 | 0 | 38/38 | ALL PASS |
| Run 2 | 0 | 38/38 | ALL PASS |

**Вердикт:** Идентичные результаты. ND НЕ обнаружен.

### e108_backtest_determinism_x2 x2

| Run | EC | Sub-tests | Status |
|---|---|---|---|
| Run 1 | 0 | 10/10 | PASS |
| Run 2 | 0 | 10/10 | PASS |

**Вердикт:** Backtest determinism подтверждён.

### ops:life / ops:doctor / ops:cockpit

| Command | EC | Key Output |
|---|---|---|
| ops:life | 0 | T1-T5 PASS, 0 candidates |
| ops:doctor | 0 | BOOT_OK, liveness probe running |
| ops:cockpit | 0 | FSM=BOOT, readiness=NEEDS_DATA, 0 lanes |

---

## FINDINGS VERIFICATION

### FINDING-A (P0): ajv/e108 determinism — ОПРОВЕРГНУТО

**Контр-доказательство:** e108 x2 PASS (10/10 sub-tests), ajv resolves через dependency tree.
Проблема не воспроизводится на текущей ветке (HEAD bdbf61f4).

### FINDING-B (P1): Courts не wired — ПОДТВЕРЖДЕНО

**Ключевые доказательства:**
- `scripts/edge/strategy_sweep.mjs:50-130` — backtest x2 → CT01 → BACKTESTED, **без Edge Lab courts**
- `scripts/ops/candidate_fsm.mjs:37-60` — court_verdicts optional (defaults to [])
- `core/edge/candidate_pipeline.mjs:41` — runCandidatePipeline() EXISTS but has **ZERO operational callers**
- `artifacts/BACKTEST_ORGAN_DEEP_AUDIT_v3.0.md:24-37` — внутренний аудит подтверждает: "Edge Lab Pipeline → orphaned"

**Импакт:** Система claims "fail-closed, evidence-driven" но operates "permit-by-default".

### FINDING-C (P1): Metrics bifurcation — ПОДТВЕРЖДЕНО

**5+ формул Sharpe ratio:**

| Контекст | Формула | Файл |
|---|---|---|
| backtest | `(mean/popStd)*sqrt(N)` | core/backtest/engine.mjs:92 |
| overfit_court | `mean/sampleStd` (no scale) | core/edge_lab/courts/overfit_court.mjs:28 |
| edge_magic | `mean/sqrt(variance)` | core/edge/alpha/edge_magic_v1.mjs:81 |
| sim | *(отсутствует)* | core/sim/metrics.mjs |
| paper/canary | *(отсутствует)* | core/paper/, core/canary/ |

**5 реализаций drawdown:**

| Контекст | Метод | Ключ |
|---|---|---|
| backtest | bar-by-bar equity HWM | max_drawdown |
| sim | trade-PnL multiplicative | max_drawdown_pct |
| ledger | per-fill HWM | max_drawdown |
| paper | *(отсутствует)* | — |
| canary | `-pnl/10` proxy | drawdown_proxy |

**Нет cross-stage parity contract.** SimReport.output_metrics: `additionalProperties: {type: 'number'}` — zero required fields.

---

## ORGAN MAP (Summary)

| # | Орган | Health | Key Risk |
|---|---|---|---|
| O1 | Policy Kernel | GREEN | Mode transition без proof receipt |
| O2 | SAN Scanners | YELLOW | 9 files Math.random, 40+ Date.now |
| O3 | Verify Chain | GREEN | 38 gates x2 PASS |
| O4 | Evidence/Canon | GREEN | FORMAT_POLICY enforced |
| O5 | Doctor OS | GREEN | BOOT_OK |
| O6 | Cockpit HUD | GREEN | FSM=BOOT, readiness=NEEDS_DATA |
| O7 | Nervous System/FSM | GREEN | No deadlock detection |
| O8 | Backtest Organ | GREEN | determinism x2 PASS |
| O9 | Edge Lab Courts | **RED** | Orphaned — not wired (FINDING-B) |
| O10 | Profit Lane | **RED** | Metrics bifurcation (FINDING-C) |
| O11 | Supply Chain | GREEN | 1 moderate vuln |
| O12 | Hygiene | GREEN | Bloat guard active |

---

## WOW UPGRADES

120 решений (10 на орган) — см. `WOW_UPGRADES_PER_ORGAN.md`

**Top-5 по Impact × Cost-efficiency:**

| # | Решение | Impact | Cost | Organ |
|---|---|---|---|---|
| 1 | W3.1 Court Wiring Fix (FINDING-B) | 10 | 3 | O3/O9 |
| 2 | W10.1 Metric Parity Contract (FINDING-C) | 10 | 5 | O10 |
| 3 | W8.1 Unified Sharpe Enforcement | 10 | 3 | O8 |
| 4 | W10.5 Canary Real Drawdown | 8 | 2 | O10 |
| 5 | W10.3 Kill Switch Matrix | 10 | 4 | O10 |

---

## ROADMAP

| Sprint | Focus | Duration | Status |
|---|---|---|---|
| Sprint 0 | Court wiring (FINDING-B) | 1-2 дня | TODO |
| Sprint 1 | Metrics unification (FINDING-C) | 3-5 дней | TODO |
| Sprint 2 | FSM goal-seeker + healing + operator calm | 3-5 дней | TODO |
| Sprint 3 | Profit lane (paper→micro-live) + kill switch | 5-7 дней | TODO |

---

## CLOSING BLOCK

### SNAPSHOT
- Branch: `claude/audit-harden-treasure-engine-68ZkR`
- HEAD: `bdbf61f4aabe31a5d8d5ee1e8489f5e92896f578`
- Mode: CERT (OFFLINE)

### WHAT_CHANGED (paths)
- `artifacts/audit/SNAPSHOT.md` — created
- `artifacts/audit/COMMANDS_EXECUTED.md` — created
- `artifacts/audit/REPO_ORGAN_MAP.md` — created
- `artifacts/audit/PAIN_POINTS_AND_FIX_PLANS.md` — created
- `artifacts/audit/WOW_UPGRADES_PER_ORGAN.md` — created
- `artifacts/audit/ROADMAP.md` — created
- `artifacts/audit/GATE_MATRIX.md` — created
- `artifacts/audit/ONE_NEXT_ACTION.md` — created
- `artifacts/audit/TREASURE_TOTAL_AUDIT_REPORT.md` — created
- `artifacts/toolchains/node/v22.22.0/` — vendored toolchain symlink + lock

### COMMANDS_EXECUTED (exact + EC)
See `COMMANDS_EXECUTED.md` — 16 commands, all EC=0

### GATE_MATRIX
See `GATE_MATRIX.md` — verify:fast x2 PASS, e108 x2 PASS, ops x3 PASS

### EVIDENCE_PATHS
- `artifacts/audit/` — all audit artifacts
- `reports/evidence/EXECUTOR/` — gate results
- `reports/evidence/EPOCH-COCKPIT-*/HUD.md` — cockpit output
- `reports/evidence/EPOCH-EVENTBUS-*/EVENTS.jsonl` — event bus

### VERDICT
**SYSTEM HEALTH: OPERATIONAL (GREEN с 2 RED organs)**
- Infrastructure: STABLE (verify:fast x2 PASS, determinism confirmed)
- FINDING-A: ОПРОВЕРГНУТО
- FINDING-B: ПОДТВЕРЖДЕНО (P1, courts orphaned) — FIX REQUIRED
- FINDING-C: ПОДТВЕРЖДЕНО (P1, metrics bifurcation) — FIX REQUIRED
- FINDING-D: ВЫЯВЛЕНО (P2, ND surface) — MONITOR
- FINDING-E: ВЫЯВЛЕНО (P2, calling convention) — FIX RECOMMENDED

### ONE_NEXT_ACTION
```bash
# Wire Edge Lab courts в strategy_sweep.mjs (Sprint 0, FINDING-B fix)
```
