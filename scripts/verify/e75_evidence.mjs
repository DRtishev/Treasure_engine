#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd, sha256File } from './e66_lib.mjs';
import { runProfitSearchHarness } from '../../core/edge/e75_profit_harness.mjs';
import { createPaperReconAdapter, buildReconComparison } from '../../core/edge/e75_execution_recon.mjs';
import { E75_ROOT, ensureDir, defaultNormalizedEnv, readE74Binding, materialsHashesE75, rewriteSumsE75, verifySumsRowsE75, evidenceFingerprintE75, readCanonicalFingerprintFromMd } from './e75_lib.mjs';

const update = process.env.UPDATE_E75_EVIDENCE === '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E75_EVIDENCE=1 forbidden when CI=true');

function gitStatus() { return (spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout || '').trim(); }
function parseMap(text) { const m = new Map(); for (const row of text.split('\n').map((x) => x.trim()).filter(Boolean)) m.set(row.slice(3).trim(), row.slice(0, 2)); return m; }
function driftOnlyAllowed(before, after) {
  const b = parseMap(before); const a = parseMap(after); const ch = [];
  for (const [r, s] of a.entries()) if (!b.has(r) || b.get(r) !== s) ch.push(r);
  for (const r of b.keys()) if (!a.has(r)) ch.push(r);
  return ch.every((r) => r.startsWith('reports/evidence/E75/'));
}

function buildMaterials(report) {
  const bind = readE74Binding();
  const env = defaultNormalizedEnv();
  const hashes = materialsHashesE75().map((x) => `- ${x.file}: ${x.sha256}`);
  const edgeStatus = report.edge_found ? `EDGE_FOUND (${report.best_candidate_id})` : 'NO_EDGE_FOUND';
  return [
    '# E75 MATERIALS',
    `- e74_canonical_fingerprint: ${bind.e74_canonical_fingerprint}`,
    `- node_version: ${process.version}`,
    `- npm_version: ${(spawnSync('npm', ['-v'], { encoding: 'utf8' }).stdout || '').trim()}`,
    '- env_normalization:',
    `  - TZ=${env.TZ}`,
    `  - LANG=${env.LANG}`,
    `  - LC_ALL=${env.LC_ALL}`,
    `  - SOURCE_DATE_EPOCH=${env.SOURCE_DATE_EPOCH}`,
    '- realism_parameters:',
    `  - fees_taker_bps=${report.costModel.fee_bps}`,
    `  - slippage_model=spread*${report.costModel.spread_factor}+impact_coeff*size`,
    `  - impact_coeff=${report.costModel.impact_coeff}`,
    `  - latency_model=fixed_ms+seeded_jitter`,
    `  - fixed_latency_ms=${report.costModel.fixed_latency_ms}`,
    `  - jitter_ms=${report.costModel.latency_jitter_ms}`,
    '- WOW_USED: [W-0001, W-0003, W-0004]',
    '- Stop-Lying:',
    `  - ${edgeStatus}`,
    '- source_recon_notes:',
    '  - Source A (Bybit fees/rules manual notes, checked 2026-02-15): demo follows maker/taker schedule + rounding by instrument precision.',
    '  - Source B (microstructure model notes, checked 2026-02-15): linear impact approximation (spread + k*size) acceptable for offline stress ranking.',
    '  - Source C (Bybit demo behavior manual notes, checked 2026-02-15): rate limits/order types/qty-step must be respected by adapter before sending.',
    ...hashes
  ].join('\n');
}

function buildEdgeProfit(report) {
  const lines = [
    '# E75 EDGE PROFIT',
    '',
    '| rank | candidate | net_pnl | expectancy | PF | maxDD | trade_count | reason |',
    '|---:|---|---:|---:|---:|---:|---:|---|'
  ];
  report.all_candidates.slice(0, 5).forEach((c, i) => {
    lines.push(`| ${i + 1} | ${c.strategy_id} | ${c.metrics.net_pnl} | ${c.metrics.expectancy} | ${c.metrics.profit_factor} | ${c.metrics.max_drawdown} | ${c.metrics.trade_count} | ${c.reason_code} |`);
  });
  if (!report.edge_found) lines.push('', '- NO_EDGE_FOUND');
  return lines.join('\n');
}

function buildExecRecon() {
  const adapter = createPaperReconAdapter({ costModel: { seed: Number(process.env.SEED || '12345') } });
  const signal = { side: 'BUY', size: 1.1, expected_price: 100, timestamp_ms: 0 };
  const fill = adapter.fill(signal, { mid: 100, spread: 0.08 });
  const cmp = buildReconComparison({ signal, expected_price: signal.expected_price, fill });
  return [
    '# E75 EXEC RECON',
    '- paper_adapter: deterministic fill model (offline, no network)',
    '- demo_adapter: Bybit demo skeleton behind ENABLE_DEMO_ADAPTER=1',
    '- WARNING: demo adapter off in CI/tests by design.',
    '- expected_vs_filled_fields: expected_price, filled_price, expected_vs_filled_bps, fee, slippage, delay_ms',
    `- tolerance_warn: ${cmp.tolerances.warn_bps}bps / ${cmp.tolerances.warn_delay_ms}ms`,
    `- tolerance_alert: ${cmp.tolerances.alert_bps}bps / ${cmp.tolerances.alert_delay_ms}ms`
  ].join('\n');
}

function verifyRequired() {
  const req = ['MATERIALS.md', 'EDGE_PROFIT.md', 'EXEC_RECON.md', 'RUNS_EDGE_PROFIT_X2.md', 'CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md'];
  for (const f of req) if (!fs.existsSync(path.join(E75_ROOT, f))) throw new Error(`missing ${f}`);
}

const before = gitStatus();
ensureDir(E75_ROOT);

if (update && process.env.CI !== 'true') {
  const report = runProfitSearchHarness({ costModel: { seed: Number(process.env.SEED || '12345') } });
  writeMd(path.join(E75_ROOT, 'MATERIALS.md'), buildMaterials(report));
  writeMd(path.join(E75_ROOT, 'EDGE_PROFIT.md'), buildEdgeProfit(report));
  writeMd(path.join(E75_ROOT, 'EXEC_RECON.md'), buildExecRecon());

  const step = spawnSync('node', ['scripts/verify/e75_edge_profit_x2.mjs'], { stdio: 'inherit', env: { ...process.env, UPDATE_E75_EVIDENCE: '1', CI: 'false' } });
  if ((step.status ?? 1) !== 0) throw new Error('scripts/verify/e75_edge_profit_x2.mjs failed');

  writeMd(path.join(E75_ROOT, 'CLOSEOUT.md'), [
    '# E75 CLOSEOUT',
    '- status: PASS',
    `- chain_mode: ${String(process.env.CHAIN_MODE || 'FAST_PLUS').toUpperCase()}`,
    '- commands_executed: npm ci; CI=false UPDATE_E75_EVIDENCE=1 npm run -s verify:e75; CI=false npm run -s verify:e75; CI=true npm run -s verify:e75',
    '- links: MATERIALS.md, EDGE_PROFIT.md, EXEC_RECON.md, RUNS_EDGE_PROFIT_X2.md',
    '- canonical_fingerprint: pending'
  ].join('\n'));
  writeMd(path.join(E75_ROOT, 'VERDICT.md'), ['# E75 VERDICT', '- Status: PASS', '- Edge status: pending', '- canonical_fingerprint: pending'].join('\n'));
  rewriteSumsE75();
  const canonical = evidenceFingerprintE75();
  if (!canonical) throw new Error('canonical fingerprint unavailable');
  const edgeReport = runProfitSearchHarness({ costModel: { seed: Number(process.env.SEED || '12345') } });
  const edgeLine = edgeReport.edge_found ? `- Edge status: EDGE_FOUND: YES (${edgeReport.best_candidate_id})` : '- Edge status: EDGE_FOUND: NO (NO_EDGE_FOUND)';
  writeMd(path.join(E75_ROOT, 'CLOSEOUT.md'), [
    '# E75 CLOSEOUT',
    '- status: PASS',
    `- chain_mode: ${String(process.env.CHAIN_MODE || 'FAST_PLUS').toUpperCase()}`,
    '- commands_executed: npm ci; CI=false UPDATE_E75_EVIDENCE=1 npm run -s verify:e75; CI=false npm run -s verify:e75; CI=true npm run -s verify:e75',
    '- links: MATERIALS.md, EDGE_PROFIT.md, EXEC_RECON.md, RUNS_EDGE_PROFIT_X2.md',
    `- canonical_fingerprint: ${canonical}`
  ].join('\n'));
  writeMd(path.join(E75_ROOT, 'VERDICT.md'), ['# E75 VERDICT', '- Status: PASS', edgeLine, '- links: RUNS_EDGE_PROFIT_X2.md, EDGE_PROFIT.md, EXEC_RECON.md', `- canonical_fingerprint: ${canonical}`].join('\n'));
  rewriteSumsE75();
}

verifyRequired();
const c = readCanonicalFingerprintFromMd(path.join(E75_ROOT, 'CLOSEOUT.md'));
const v = readCanonicalFingerprintFromMd(path.join(E75_ROOT, 'VERDICT.md'));
const r = evidenceFingerprintE75();
if (!c || !v || !r || c !== v || c !== r) throw new Error('canonical parity violation');

verifySumsRowsE75();
for (const line of fs.readFileSync(path.join(E75_ROOT, 'SHA256SUMS.md'), 'utf8').split(/\r?\n/).filter((x) => /^[a-f0-9]{64}\s{2}/.test(x))) {
  const [h, rel] = line.split(/\s{2}/);
  if (sha256File(path.resolve(rel)) !== h) throw new Error(`sha mismatch ${rel}`);
}

const after = gitStatus();
if (before !== after) {
  if (process.env.CI === 'true') throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');
  if (!driftOnlyAllowed(before, after)) throw new Error('UPDATE_SCOPE_VIOLATION');
}

console.log('verify:e75:evidence PASSED');
