#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { canonicalize, areEquivalent } from '../../core/truth/canonicalize.mjs';
import { deterministicFingerprint, withFingerprint, validateContract, truncateTowardZero, canonicalStringify } from '../../core/edge/contracts.mjs';
import { evaluateDataQuality } from '../../core/edge/data_quality.mjs';
import { applyRiskFortress, hardStopPolicy, sizingPolicy } from '../../core/edge/risk_fortress.mjs';
import { GovernanceFSM } from '../../core/governance/mode_fsm.mjs';
import { MODES, VERDICTS } from '../../core/truth/truth_engine.mjs';
import { buildFeatureFrame, buildStrategySpec, buildSignal, buildIntent, buildAllocationPlan, buildRiskDecision, buildSimReport, buildRealityGapReport } from '../../core/edge/runtime.mjs';

const checks = [];
const add = (name, ok, meta = {}) => checks.push({ name, ok: Boolean(ok), ...meta });

// canonicalization / fingerprint properties
add('canonicalize removes volatile fields', !('timestamp' in canonicalize({ a: 1, timestamp: 2 })));
add('areEquivalent ignores volatile fields', areEquivalent({ a: 1, created_at: 1 }, { a: 1, created_at: 2 }));
add('truncateTowardZero keeps sign', truncateTowardZero(-1.239, 2) === -1.23);
add('canonicalStringify stable object key ordering', canonicalStringify({ b: 1, a: 2 }) === canonicalStringify({ a: 2, b: 1 }));

for (const contractName of ['FeatureFrame', 'StrategySpec', 'Signal', 'Intent', 'AllocationPlan', 'RiskDecision', 'SimReport', 'RealityGapReport']) {
  const payload = {
    FeatureFrame: buildFeatureFrame(123),
    StrategySpec: buildStrategySpec(),
    Signal: buildSignal(123),
    Intent: buildIntent(buildSignal(123)),
    AllocationPlan: buildAllocationPlan(123),
    RiskDecision: buildRiskDecision(0.01),
    SimReport: buildSimReport(123),
    RealityGapReport: buildRealityGapReport('s1', 's2', 0.02)
  }[contractName];

  const fp1 = deterministicFingerprint(contractName, payload);
  const fp2 = deterministicFingerprint(contractName, JSON.parse(JSON.stringify(payload)));
  add(`${contractName} fingerprint deterministic`, fp1 === fp2);
  const wrapped = withFingerprint(contractName, payload);
  let valid = false;
  try { validateContract(contractName, wrapped); valid = true; } catch { valid = false; }
  add(`${contractName} validates with fingerprint`, valid);
}

// data quality invariants
const baseEvents = [
  { trade_id: '1', ts_ms: 1000, price: 1, qty: 1, side: 'B', output_fingerprint: 'a' },
  { trade_id: '1', ts_ms: 1200, price: 1, qty: 1, side: 'B', output_fingerprint: 'b' }, // dedup
  { trade_id: '2', ts_ms: 5000, price: 1, qty: 1, side: 'B', output_fingerprint: 'c' }, // gap
  { trade_id: '3', ts_ms: 4500, price: 1, qty: 1, side: 'B', output_fingerprint: 'd' } // out-of-order
];
const dq = evaluateDataQuality(baseEvents, { maxTimeGapMs: 1500, allowOutOfOrder: 0 });
add('data quality dedup count positive with duplicates', dq.report.dedup_count >= 1);
add('data quality gap count positive with large gap', dq.report.gap_count >= 1);
add('data quality out-of-order counted', dq.report.out_of_order_count >= 1);
add('data quality normalized output sorted by ts', dq.normalizedEvents.every((e, i, a) => i === 0 || a[i - 1].ts_ms <= e.ts_ms));

// risk fortress invariants
add('hard stop trade threshold halts', hardStopPolicy({ tradeLossPct: 0.03 }).halt === true);
add('hard stop day threshold halts', hardStopPolicy({ dayLossPct: 0.07 }).halt === true);
add('hard stop week threshold halts', hardStopPolicy({ weekLossPct: 0.2 }).halt === true);
add('applyRiskFortress non-bypassable on halt', applyRiskFortress({ tradeLossPct: 0.03 }).invariant_non_bypassable === true && applyRiskFortress({ tradeLossPct: 0.03 }).size_factor === 0);
add('sizingPolicy bounded [0,1]', (() => { const v = sizingPolicy({ dd: 0.5, dd_speed: 0.2, vol_regime: 'CRISIS', pbo_flag: true, dsr_flag: true }); return v >= 0 && v <= 1; })());

// vault policy + pause/recover invariants via verifier artifacts
const vaultFixture = JSON.parse(fs.readFileSync('reports/evidence/EPOCH-56/gates/manual/vault_policy_test.json', 'utf8'));
add('vault policy strict expected-fail reason', vaultFixture.expected_fail?.ok === true && vaultFixture.expected_fail?.reason === 'FAIL_VAULT_DATASET_FOR_TUNING');
const pauseLines = fs.readFileSync('reports/evidence/EPOCH-56/gates/manual/pause_recover_trace.jsonl', 'utf8').trim().split(/\n+/).filter(Boolean).map((l) => JSON.parse(l));
add('pause/recover transition trace has >=5 entries', pauseLines.length >= 5);
add('pause/recover keeps exposure blocked', pauseLines.every((x) => x.exposure_blocked === true));

// governance FSM pause/recover behavior invariants
const fsm = new GovernanceFSM(MODES.PAPER);
const haltVerdict = { verdict: VERDICTS.HALT, mode: MODES.OFF, reason_codes: ['hard_stop'] };
const allowVerdict = { verdict: VERDICTS.ALLOW, mode: MODES.PAPER, reason_codes: [] };
const r1 = fsm.transition(MODES.LIVE_SMALL, haltVerdict);
add('fsm halt forces OFF', r1.success === true && r1.to === MODES.OFF);
const r2 = fsm.transition(MODES.PAPER, allowVerdict);
add('fsm blocks transition without manual reset after halt', r2.success === false && r2.manualResetRequired === true);
fsm.requestManualReset();
const r3 = fsm.transition(MODES.PAPER, allowVerdict);
add('fsm allows transition after manual reset', r3.success === true);

const failed = checks.filter((c) => !c.ok);
const fingerprint = crypto.createHash('sha256').update(JSON.stringify(checks.map((c) => ({ name: c.name, ok: c.ok })))).digest('hex');
const report = {
  total_properties: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  fingerprint,
  checks
};

fs.mkdirSync('reports/truth', { recursive: true });
fs.writeFileSync('reports/truth/properties_report.json', `${JSON.stringify(report, null, 2)}\n`);

if (failed.length) {
  console.error('verify:properties FAILED');
  for (const f of failed) console.error(`- ${f.name}`);
  process.exit(1);
}
console.log('verify:properties PASSED');
console.log(JSON.stringify({ total_properties: checks.length, fingerprint }, null, 2));
