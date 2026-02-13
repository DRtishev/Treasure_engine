import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseJsonl } from '../edge/data_contracts.mjs';
import { calibrateExecutionRealismFromPrivateFills } from '../edge/execution_realism.mjs';
import { applyRiskFortress, generateDeterministicCrisisSuite } from '../edge/risk_fortress.mjs';
import { runPaperTradingSession } from '../paper/paper_trading_harness.mjs';
import { validateCanaryConfig } from './canary_config_contract.mjs';
import { CANARY_REASON_CODES } from './reason_codes.mjs';

const SCENARIO_MUL = {
  baseline: { gap: 1.0, vol: 0.2, dd_speed: 0.02, data_gap: 0, pnl: 1.0 },
  whipsaw: { gap: 1.4, vol: 0.6, dd_speed: 0.04, data_gap: 0, pnl: 0.8 },
  vol_expansion: { gap: 1.8, vol: 0.9, dd_speed: 0.05, data_gap: 0, pnl: 0.7 },
  liquidity_vacuum: { gap: 2.0, vol: 0.95, dd_speed: 0.06, data_gap: 1, pnl: 0.6 },
  gap_down: { gap: 2.2, vol: 1.0, dd_speed: 0.08, data_gap: 1, pnl: 0.45 }
};

function loadMarketRows(datasetId, provider) {
  const dir = path.resolve(`data/normalized/${provider}/${datasetId}/chunks`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort();
  let rows = [];
  for (const file of files) rows = rows.concat(parseJsonl(fs.readFileSync(path.join(dir, file), 'utf8')));
  rows.sort((a, b) => a.ts_ms - b.ts_ms || a.output_fingerprint.localeCompare(b.output_fingerprint));
  return rows;
}

function fp(v) { return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex'); }

function computeRealityGap(market, calibration, s) {
  const returns = [];
  for (let i = 1; i < market.length; i += 1) returns.push(Math.abs((market[i].price - market[i - 1].price) / market[i - 1].price));
  const avgRet = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const slip = (calibration.params?.slip_mean_bps ?? 0) / 10000;
  return Math.max(0, Math.min(1, Number((Math.abs(avgRet - slip) * 10 * s.gap).toFixed(6))));
}

function loadOverfit(pathName) {
  if (!fs.existsSync(pathName)) return { status: 'unknown', metrics: null };
  const parsed = JSON.parse(fs.readFileSync(pathName, 'utf8'));
  return { status: 'present', metrics: parsed };
}

export function runCanaryController(input = {}, deps = {}) {
  const { config, config_fingerprint } = validateCanaryConfig(input);
  if (config.network_requested && process.env.ENABLE_NETWORK !== '1') throw new Error('Network disabled unless ENABLE_NETWORK=1');

  const s = SCENARIO_MUL[config.scenario] || SCENARIO_MUL.baseline;
  const clock = deps.clock || { i: 0, nowMs() { const v = 1700000000000 + (this.i * 1000); this.i += 1; return v; } };
  const market = loadMarketRows(config.market_dataset_id, config.market_provider);
  const calibration = calibrateExecutionRealismFromPrivateFills({ fills_dataset_id: config.fills_dataset_id, provider: config.fills_provider, strict: config.strict, seed: config.seed });
  const overfit = loadOverfit(config.overfit_metrics_path);
  if (config.strict && overfit.status === 'unknown') throw new Error('FAIL_OVERFIT_UNKNOWN_STRICT');

  const thresholds_used = { ...config.thresholds, strict_overfit_required: config.strict };
  const stateLog = [];
  const risk_events = [];
  const pause_events = [];

  const pushPause = (code, metric, value, threshold, context) => {
    const event = { code, metric, value, threshold, ts_ms: clock.nowMs(), context_fingerprint: fp(context) };
    pause_events.push(event);
    stateLog.push({ ts_ms: event.ts_ms, event: 'PAUSE', code, metric, value, threshold });
  };

  const realityGap = computeRealityGap(market, calibration, s);
  if (realityGap > thresholds_used.max_reality_gap) pushPause('PAUSE_REALITY_GAP', CANARY_REASON_CODES.PAUSE_REALITY_GAP.metric, realityGap, thresholds_used.max_reality_gap, { mode: config.mode, scenario: config.scenario, calibration_mode: calibration.mode });

  const volSpike = s.vol;
  if (volSpike > thresholds_used.max_vol_spike) pushPause('PAUSE_VOL_SPIKE', CANARY_REASON_CODES.PAUSE_VOL_SPIKE.metric, volSpike, thresholds_used.max_vol_spike, { mode: config.mode, scenario: config.scenario });

  const ddSpeed = s.dd_speed;
  if (ddSpeed > thresholds_used.max_dd_speed) pushPause('PAUSE_DD_SPEED', CANARY_REASON_CODES.PAUSE_DD_SPEED.metric, ddSpeed, thresholds_used.max_dd_speed, { mode: config.mode, scenario: config.scenario });

  if (s.data_gap > thresholds_used.max_data_gap_count) pushPause('PAUSE_DATA_GAP', CANARY_REASON_CODES.PAUSE_DATA_GAP.metric, s.data_gap, thresholds_used.max_data_gap_count, { mode: config.mode, scenario: config.scenario });

  if (config.crisis_mode && config.kill_switch.auto_pause_on_crisis) {
    const crisis = generateDeterministicCrisisSuite(config.seed);
    pushPause('PAUSE_VOL_SPIKE', CANARY_REASON_CODES.PAUSE_VOL_SPIKE.metric, 1, thresholds_used.max_vol_spike, { mode: config.mode, scenario: 'crisis', crisis_fingerprint: crisis.fingerprint });
  }

  for (let i = 0; i < market.length; i += 1) {
    const risk = applyRiskFortress({ tradeLossPct: i > 1 ? 0.03 : 0, dayLossPct: i > 2 ? 0.07 : 0, weekLossPct: i > 3 ? 0.13 : 0, dd: i > 2 ? 0.15 : 0.01, dd_speed: ddSpeed, vol_regime: i > 2 ? 'CRISIS' : 'MID' });
    const ts = clock.nowMs();
    stateLog.push({ ts_ms: ts, event: 'RISK_EVAL', index: i, state: risk.state, hard_stop: risk.hard_stop });
    if (risk.hard_stop.halt) {
      const prev = i === 0 ? 'ACTIVE' : (i > 2 ? 'DEGRADED' : 'ACTIVE');
      risk_events.push({ code: 'PAUSE_RISK_HARDSTOP', reason: risk.hard_stop.reason, state_transition: `${prev}->${risk.state}`, ts_ms: ts });
      if (risk_events.length > thresholds_used.max_risk_events && config.kill_switch.enabled) {
        pushPause('PAUSE_RISK_HARDSTOP', CANARY_REASON_CODES.PAUSE_RISK_HARDSTOP.metric, risk_events.length, thresholds_used.max_risk_events, { mode: config.mode, risk_state: risk.state });
        break;
      }
    }
  }

  let paperMetrics = null;
  if (config.mode === 'PAPER') {
    const session = runPaperTradingSession({ market_dataset_id: config.market_dataset_id, market_provider: config.market_provider, fills_dataset_id: config.fills_dataset_id, fills_provider: config.fills_provider, strict: config.strict, seed: config.seed, shadow_only: true });
    paperMetrics = { ...session.report.metrics, net_pnl: Number((session.report.metrics.net_pnl * s.pnl).toFixed(8)) };
    stateLog.push({ ts_ms: clock.nowMs(), event: 'PAPER_SESSION', paper_fills: paperMetrics.paper_fills });
  }

  let submissionPlan = null;
  if (config.mode === 'GUARDED_LIVE') {
    const intents = market.slice(0, 3).map((row, i) => ({ ts_ms: row.ts_ms, symbol: row.symbol, side: i % 2 === 0 ? 'BUY' : 'SELL', notional_usd: Math.min(100, config.thresholds.max_exposure_usd) }));
    submissionPlan = { mode: 'GUARDED_LIVE', submitted: false, submitted_actions: 0, intents };
    stateLog.push({ ts_ms: clock.nowMs(), event: 'SUBMISSION_PLAN_READY', intents: intents.length, submitted: false });
  }

  pause_events.sort((a, b) => a.ts_ms - b.ts_ms || a.code.localeCompare(b.code));
  risk_events.sort((a, b) => a.ts_ms - b.ts_ms || a.code.localeCompare(b.code));

  const decision_trace = {
    pause_event_count: pause_events.length,
    risk_event_count: risk_events.length,
    code_counts: [...pause_events, ...risk_events].reduce((acc, e) => { acc[e.code] = (acc[e.code] || 0) + 1; return acc; }, {})
  };

  const report = {
    schema_version: '1.1.0',
    mode: config.mode,
    scenario: config.scenario,
    config_fingerprint,
    calibration_mode: calibration.mode,
    thresholds_used,
    pause_events,
    risk_events,
    decision_trace,
    monitors: { reality_gap: realityGap, risk_events: risk_events.length, overfit_status: overfit.status, vol_spike: volSpike, dd_speed: ddSpeed, data_gap_count: s.data_gap },
    metrics: { pause_triggers: pause_events.length, risk_events_count: risk_events.length, paper_pnl: paperMetrics?.net_pnl ?? null, trade_count: paperMetrics?.paper_fills ?? 0 },
    invariants: { network_guard: !config.network_requested, submitted: false, live_submit_fuse: true }
  };

  const fingerprint = fp({ config, report, stateLog, submissionPlan });
  return { report, stateLog, submissionPlan, fingerprint };
}
