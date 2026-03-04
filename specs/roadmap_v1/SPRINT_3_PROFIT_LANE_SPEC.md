# SPRINT_3_PROFIT_LANE_SPEC.md — Profit Lane + Kill Switch + Reconciliation

**Finding:** Operational readiness (builds on Sprint 0 + Sprint 1)
**WOW Ref:** W10.3, W10.4, W10.6, W10.10
**Prerequisite:** Sprint 0 (courts wired), Sprint 1 (metric parity)

---

## 1. GOAL

Создать fail-closed profit lane: paper→canary→micro-live с kill switch matrix,
fill reconciliation, emergency flatten, и graduated position sizing.

**Текущее состояние:**
- `core/governance/mode_fsm.mjs` — OFF → PAPER → LIVE_SMALL → LIVE
- `core/paper/paper_trading_harness.mjs` — paper engine exists
- `core/canary/canary_runner.mjs` — canary runner exists
- `core/live/e112_micro_live_runner.mjs` — micro-live runner exists
- **НЕТ:** kill switch matrix, fill reconciliation, emergency flatten, graduated sizing

## 2. NON-GOALS

- НЕ запускаем реальную live торговлю в этом спринте (только инфраструктура)
- НЕ меняем exchange adapters
- НЕ модифицируем backtest engine или court logic
- НЕ добавляем новые стратегии
- НЕ реализуем полный portfolio management

## 3. SCOPE

| Файл | Действие | Описание |
|---|---|---|
| `specs/kill_switch_matrix.json` | CREATE | Kill switch conditions → actions mapping |
| `core/risk/kill_switch.mjs` | CREATE | Kill switch evaluator |
| `core/recon/reconcile_v1.mjs` | CREATE | Fill reconciliation engine |
| `scripts/ops/emergency_flatten.mjs` | CREATE | Emergency position closer |
| `core/risk/position_sizer.mjs` | CREATE | Graduated position sizing (micro→small→normal) |
| `scripts/verify/regression_kill_switch01_triggers.mjs` | CREATE | Gate: kill switch fires on conditions |
| `scripts/verify/regression_reconcile01_detects_drift.mjs` | CREATE | Gate: recon detects PnL drift |
| `scripts/verify/regression_flatten01_closes_all.mjs` | CREATE | Gate: flatten closes positions |
| `package.json` | MODIFY | Add ops:emergency:flatten + 3 regression scripts |

## 4. INVARIANTS

**INV-S3-1:** Kill switch matrix содержит минимум 3 условия: max_drawdown, reality_gap, error_rate.
Каждое условие → action (PAUSE / REDUCE / FLATTEN).
- Проверка: JSON schema validation of specs/kill_switch_matrix.json

**INV-S3-2:** `evaluateKillSwitch(metrics)` возвращает `{triggered: true, action: 'FLATTEN'}`
когда `max_drawdown > threshold`.
- Проверка: regression gate unit test

**INV-S3-3:** `reconcile(ledger_fills, exchange_fills)` обнаруживает drift > threshold.
- Проверка: regression gate с synthetic drift

**INV-S3-4:** `ops:emergency:flatten` возвращает EC=0 и закрывает все mock positions.
- Проверка: regression gate с mock exchange

**INV-S3-5:** Position sizer enforces tiers: micro (≤0.1%), small (≤1%), normal (≤5%).
- Проверка: unit test в regression gate

**INV-S3-6:** verify:fast x2 PASS.

## 5. FAILURE MODES

| Failure | Как обнаружим | Митигация |
|---|---|---|
| Kill switch false positive → unnecessary flatten | Logs + alert threshold calibration | Conservative initial thresholds + manual override |
| Reconciliation fails on exchange API change | EC≠0 on reconcile step | Graceful degradation: WARN, not BLOCK |
| Emergency flatten timeout (exchange latency) | Timeout > 5s | Configurable timeout + retry x3 |
| Position sizer bypass (direct order) | SAN scan for direct exchange calls | Wrapper enforcement + regression gate |
| Kill switch not triggered (false negative) | Chaos test: inject bad metrics | regression_kill_switch01 with synthetic data |

## 6. IMPLEMENTATION PLAN

### Шаг 1: Kill switch matrix spec

**Файл:** `specs/kill_switch_matrix.json`

```json
{
  "schema_version": "1.0.0",
  "conditions": [
    {
      "id": "KS01_MAX_DRAWDOWN",
      "metric": "max_drawdown",
      "operator": ">",
      "threshold": 0.05,
      "action": "FLATTEN",
      "cooldown_ms": 3600000,
      "description": "Drawdown exceeds 5% → emergency flatten all"
    },
    {
      "id": "KS02_REALITY_GAP",
      "metric": "reality_gap",
      "operator": ">",
      "threshold": 0.3,
      "action": "PAUSE",
      "cooldown_ms": 1800000,
      "description": "Reality gap > 30% → pause new orders"
    },
    {
      "id": "KS03_ERROR_RATE",
      "metric": "exchange_error_rate",
      "operator": ">",
      "threshold": 0.1,
      "action": "PAUSE",
      "cooldown_ms": 300000,
      "description": "Exchange error rate > 10% → pause all activity"
    },
    {
      "id": "KS04_CONSECUTIVE_LOSSES",
      "metric": "consecutive_losses",
      "operator": ">=",
      "threshold": 10,
      "action": "REDUCE",
      "cooldown_ms": 600000,
      "description": "10+ consecutive losses → reduce position size by 50%"
    }
  ],
  "actions": {
    "FLATTEN": { "priority": 0, "description": "Close all positions immediately" },
    "PAUSE": { "priority": 1, "description": "Stop new orders, keep existing" },
    "REDUCE": { "priority": 2, "description": "Reduce position size by configured %" }
  },
  "escalation": {
    "REDUCE_to_PAUSE_after_ms": 1800000,
    "PAUSE_to_FLATTEN_after_ms": 3600000
  }
}
```

### Шаг 2: Kill switch evaluator

**Файл:** `core/risk/kill_switch.mjs`

```javascript
export function evaluateKillSwitch(metrics, matrix) {
  const triggered = [];
  for (const cond of matrix.conditions) {
    const value = metrics[cond.metric];
    if (value === undefined || value === null) continue;
    const fire = cond.operator === '>' ? value > cond.threshold
               : cond.operator === '>=' ? value >= cond.threshold
               : cond.operator === '<' ? value < cond.threshold
               : false;
    if (fire) triggered.push({ ...cond, actual_value: value });
  }
  if (triggered.length === 0) return { triggered: false, action: null, conditions: [] };
  // Highest priority action wins (lowest priority number)
  triggered.sort((a, b) => matrix.actions[a.action].priority - matrix.actions[b.action].priority);
  return { triggered: true, action: triggered[0].action, conditions: triggered };
}
```

### Шаг 3: Fill reconciliation

**Файл:** `core/recon/reconcile_v1.mjs`

```javascript
export function reconcile(ledgerFills, exchangeFills, tolerancePct = 0.01) {
  const drifts = [];
  for (const lf of ledgerFills) {
    const ef = exchangeFills.find(e => e.order_id === lf.order_id);
    if (!ef) { drifts.push({ type: 'MISSING_ON_EXCHANGE', order_id: lf.order_id }); continue; }
    const priceDrift = Math.abs(lf.price - ef.price) / Math.max(lf.price, 1e-12);
    const sizeDrift = Math.abs(lf.size - ef.size) / Math.max(lf.size, 1e-12);
    if (priceDrift > tolerancePct) drifts.push({ type: 'PRICE_DRIFT', order_id: lf.order_id, expected: lf.price, actual: ef.price, drift: priceDrift });
    if (sizeDrift > tolerancePct) drifts.push({ type: 'SIZE_DRIFT', order_id: lf.order_id, expected: lf.size, actual: ef.size, drift: sizeDrift });
  }
  for (const ef of exchangeFills) {
    if (!ledgerFills.find(l => l.order_id === ef.order_id)) {
      drifts.push({ type: 'MISSING_IN_LEDGER', order_id: ef.order_id });
    }
  }
  return { ok: drifts.length === 0, drifts, total_checked: ledgerFills.length + exchangeFills.length };
}
```

### Шаг 4: Emergency flatten

**Файл:** `scripts/ops/emergency_flatten.mjs`

Логика:
1. Загрузить active positions из ledger
2. Для каждой позиции → создать market close order
3. Wait for confirmation (mock в CERT mode)
4. Log all actions → evidence
5. Transition mode_fsm → OFF
6. EC=0 если все positions closed

### Шаг 5: Graduated position sizer

**Файл:** `core/risk/position_sizer.mjs`

```javascript
const TIERS = [
  { name: 'micro', max_risk_pct: 0.001, description: '0.1% of equity' },
  { name: 'small', max_risk_pct: 0.01, description: '1% of equity' },
  { name: 'normal', max_risk_pct: 0.05, description: '5% of equity' },
];

export function computePositionSize(equity, tier, signal_risk) {
  const tierConfig = TIERS.find(t => t.name === tier);
  if (!tierConfig) return { size: 0, reason: `unknown tier: ${tier}` };
  const maxRisk = equity * tierConfig.max_risk_pct;
  const size = Math.min(maxRisk, signal_risk > 0 ? maxRisk / signal_risk : 0);
  return { size, tier: tierConfig.name, max_risk_usd: maxRisk, equity };
}
```

### Шаг 6: Создать 3 regression gates + зарегистрировать

## 7. GATES & REGRESSIONS

| Gate ID | Что проверяет | Evidence |
|---|---|---|
| `regression_kill_switch01` | Kill switch fires on synthetic max_drawdown > threshold | `regression_kill_switch01.json` |
| `regression_reconcile01` | Reconciliation detects synthetic price drift | `regression_reconcile01.json` |
| `regression_flatten01` | Emergency flatten returns EC=0 on mock positions | `regression_flatten01.json` |

## 8. EVIDENCE ARTIFACTS

| Артефакт | Путь |
|---|---|
| Kill switch matrix | `specs/kill_switch_matrix.json` |
| 3 regression gate results | `reports/evidence/EXECUTOR/gates/manual/regression_{name}.json` |

## 9. TEST PLAN

```bash
# 1. Pre-change baseline
npm run -s verify:fast

# 2. Apply changes

# 3. Unit tests
node -e "import('./core/risk/kill_switch.mjs').then(m => { const r = m.evaluateKillSwitch({max_drawdown: 0.1}, JSON.parse(require('fs').readFileSync('specs/kill_switch_matrix.json','utf8'))); console.log(r); process.exit(r.triggered ? 0 : 1) })"

# 4. Post-change verification (x2)
npm run -s verify:fast  # Run 1
npm run -s verify:fast  # Run 2

# 5. Emergency flatten (mock)
npm run -s ops:emergency:flatten

# 6. Regen + final x2
npm run -s regen:manifests
npm run -s verify:fast
npm run -s verify:fast
```

## 10. DEFINITION OF DONE

- [ ] `specs/kill_switch_matrix.json` создан с 4 условиями и 3 actions
- [ ] `evaluateKillSwitch()` корректно fires на каждом условии (unit tested)
- [ ] `reconcile()` обнаруживает price/size drift и missing fills
- [ ] `ops:emergency:flatten` EC=0 на mock positions
- [ ] `computePositionSize()` enforces tier limits
- [ ] 3 regression gates PASS standalone
- [ ] verify:fast x2 PASS
- [ ] git status clean

## 11. ROLLBACK PLAN

Удалить все созданные файлы (8 files). Откатить package.json.
`npm run -s verify:fast` для baseline.

## 12. ONE NEXT ACTION

```bash
# Создать specs/kill_switch_matrix.json
```
