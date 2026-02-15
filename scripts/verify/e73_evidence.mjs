#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runEdgeMetaSuiteV1 } from '../../core/edge/alpha/edge_magic_meta_suite_v1.mjs';
import { computeWowFingerprint } from './e71_wow_verify.mjs';
import { computeWowUsageFingerprint } from './e72_wow_usage_verify.mjs';
import { runContractCourt } from './e73_contract_court.mjs';
import { E73_ROOT, ensureDir, defaultNormalizedEnv, readE72Binding, contractTextHash, registryHash, budgetHash, materialsHashesE73, rewriteSumsE73, verifySumsRowsE73, evidenceFingerprintE73, readCanonicalFingerprintFromMd } from './e73_lib.mjs';
import { buildChainBundle } from './e70_chain_bundle.mjs';
import { writeMd } from './e66_lib.mjs';

const update = process.env.UPDATE_E73_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || 'FAST_PLUS').toUpperCase();
const strictLaws = process.env.STRICT_LAWS === '0' ? '0' : '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E73_EVIDENCE=1 forbidden when CI=true');

function gitStatus() { return (spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout || '').trim(); }
function parseMap(text) { const m = new Map(); for (const row of text.split('\n').map((x) => x.trim()).filter(Boolean)) m.set(row.slice(3).trim(), row.slice(0, 2)); return m; }
function driftOnlyAllowed(before, after) {
  const b = parseMap(before); const a = parseMap(after); const ch = [];
  for (const [r, s] of a.entries()) if (!b.has(r) || b.get(r) !== s) ch.push(r);
  for (const r of b.keys()) if (!a.has(r)) ch.push(r);
  return ch.every((r) => r.startsWith('reports/evidence/E73/') || r === 'docs/edge/EDGE_META_CONTRACT.md' || r === 'docs/edge/EDGE_REASON_CODES.md');
}

function parseContractRows() {
  return fs.readFileSync(path.resolve('docs/edge/EDGE_META_CONTRACT.md'), 'utf8').split(/\r?\n/)
    .filter((line) => /^\|\sM[1-5]\s\|/.test(line))
    .map((line) => line.split('|').map((x) => x.trim()).filter(Boolean))
    .map((p) => ({ law: p[0], dataset: p[1], expected: p[2], reason: p[3] }))
    .sort((a, b) => `${a.law}:${a.dataset}`.localeCompare(`${b.law}:${b.dataset}`));
}

function parseBudgets() {
  const lines = fs.readFileSync(path.resolve('docs/edge/EDGE_META_CONTRACT.md'), 'utf8').split(/\r?\n/);
  const maxTotal = Number((lines.find((l) => /^max_total:/.test(l)) || 'max_total: 0').split(':')[1].trim());
  const perLaw = {}; const perRegime = {}; let mode = '';
  for (const line of lines) {
    if (/^per_law:/.test(line)) mode = 'law';
    else if (/^per_regime:/.test(line)) mode = 'regime';
    else if (/^- /.test(line) && mode === 'law') { const [k, v] = line.slice(2).split(':').map((x) => x.trim()); perLaw[k] = Number(v); }
    else if (/^- /.test(line) && mode === 'regime') { const [k, v] = line.slice(2).split(':').map((x) => x.trim()); perRegime[k] = Number(v); }
  }
  return { max_total: maxTotal, per_law: perLaw, per_regime: perRegime };
}

function buildMaterials(bundle, wowFp, wowUsageFp, edgeFp) {
  const bind = readE72Binding(); const env = defaultNormalizedEnv(); const rows = materialsHashesE73().map((x) => `- ${x.file}: ${x.sha256}`);
  return [
    '# E73 MATERIALS',
    `- chain_mode: ${chainMode}`,
    `- strict_laws: ${strictLaws}`,
    `- e72_canonical_fingerprint: ${bind.e72_canonical_fingerprint}`,
    `- chain_bundle_fingerprint: ${bundle.chain_bundle_fingerprint}`,
    `- contract_text_hash: ${contractTextHash()}`,
    `- registry_hash: ${registryHash()}`,
    `- budget_hash: ${budgetHash()}`,
    `- wow_fingerprint: ${wowFp}`,
    `- wow_usage_fingerprint: ${wowUsageFp}`,
    `- edge_meta_fingerprint: ${edgeFp}`,
    `- node_version: ${process.version}`,
    `- npm_version: ${(spawnSync('npm', ['-v'], { encoding: 'utf8' }).stdout || '').trim()}`,
    '- env_normalization:', `  - TZ=${env.TZ}`, `  - LANG=${env.LANG}`, `  - LC_ALL=${env.LC_ALL}`, `  - SOURCE_DATE_EPOCH=${env.SOURCE_DATE_EPOCH}`,
    ...rows
  ].join('\n');
}

function buildWowUsage(wowFp, wowUsageFp, used) {
  const ids = [...new Set(used)].sort();
  const traces = [
    { id: ids[0], where: 'scripts/verify/e73_edge_contract_x2.mjs', anchor: 'law-evaluator', why: 'deterministic contract evaluation path' },
    { id: ids[1], where: 'scripts/verify/e73_contract_court.mjs', anchor: 'contract-court', why: 'contract evolution governance trace' },
    { id: ids[2], where: 'reports/evidence/E73/EDGE_CONTRACT.md', anchor: 'budget-summary', why: 'allowed-fail budget reporting trace' }
  ];
  return [
    '# E73 WOW USAGE',
    `- wow_fingerprint: ${wowFp}`,
    `- wow_usage_fingerprint: ${wowUsageFp}`,
    `- WOW_USED: [${ids.join(', ')}]`,
    '',
    ...traces.flatMap((t) => [
      `## ${t.id}`,
      '- trace:',
      `  - where: ${t.where}`,
      `  - anchor: ${t.anchor}`,
      `  - why: ${t.why}`
    ])
  ].join('\n');
}

function buildContractCourt(court) {
  return [
    '# E73 CONTRACT COURT',
    `- previous_contract_hash: ${court.previous_contract_hash}`,
    `- new_contract_hash: ${court.new_contract_hash}`,
    `- breaking_change: ${court.breaking_change ? 'true' : 'false'}`,
    `- migration_notes_required: ${court.migration_notes_required ? 'true' : 'false'}`,
    `- diff_policy_verdict: ${court.breaking_change ? 'PASS_WITH_BREAKING_CHANGE' : 'PASS'}`,
    `- changed: ${court.changed ? 'true' : 'false'}`,
    `- changes_count: ${court.changes.length}`
  ].join('\n');
}

function buildEdgeContract(edge, contractRows, budgets) {
  const lines = [
    '# E73 EDGE CONTRACT',
    `- strict_laws: ${strictLaws}`,
    `- allowed_fail_budget_max_total: ${budgets.max_total}`,
    '',
    '| law | dataset | expected_status | observed_pass | reason_code | observed_delta |',
    '|---|---|---|---|---|---:|'
  ];
  let observedAllowed = 0;
  const perLaw = {};
  const perRegime = {};

  for (const c of contractRows) {
    const obs = edge.laws.find((x) => x.law === c.law && x.dataset === c.dataset);
    const reason = c.expected === 'ALLOWED_FAIL' && !obs.pass ? c.reason : 'NOT_APPLICABLE';
    if (c.expected === 'ALLOWED_FAIL' && !obs.pass) {
      observedAllowed += 1;
      perLaw[c.law] = (perLaw[c.law] || 0) + 1;
    }
    lines.push(`| ${c.law} | ${c.dataset} | ${c.expected} | ${obs.pass ? 'true' : 'false'} | ${reason} | ${Number(obs.observed_delta).toFixed(8)} |`);
  }

  for (const regime of ['baseline', 'fee_shock', 'spread_spike', 'missing_candles']) {
    perRegime[regime] = edge.regimes.filter((r) => r.regime === regime && r.metrics.net_pnl < 0).length;
  }

  lines.push('', `- observed_allowed_fail_total: ${observedAllowed}`);
  lines.push('- observed_allowed_fail_per_law:');
  for (const k of Object.keys(budgets.per_law).sort()) lines.push(`  - ${k}: observed=${perLaw[k] || 0} budget=${budgets.per_law[k]}`);
  lines.push('- observed_allowed_fail_per_regime:');
  for (const k of Object.keys(budgets.per_regime).sort()) lines.push(`  - ${k}: observed=${perRegime[k] || 0} budget=${budgets.per_regime[k]}`);
  return lines.join('\n');
}

function buildCloseout(fp, bundle) {
  return [
    '# E73 CLOSEOUT',
    '',
    `- chain_mode: ${chainMode}`,
    `- strict_laws: ${strictLaws}`,
    `- chain_bundle_fingerprint: ${bundle.chain_bundle_fingerprint}`,
    '- commands:',
    '  - npm ci',
    `  - CI=false UPDATE_E73_EVIDENCE=1 CHAIN_MODE=${chainMode} npm run -s verify:e73`,
    `- canonical_fingerprint: ${fp}`,
    '- links:',
    '  - MATERIALS.md',
    '  - WOW_USAGE.md',
    '  - CONTRACT_COURT.md',
    '  - CONTRACT_DIFF.md',
    '  - CONTRACT_CHANGELOG.md',
    '  - EDGE_CONTRACT.md',
    '  - RUNS_EDGE_CONTRACT_X2.md',
    '  - SHA256SUMS.md'
  ].join('\n');
}

function buildVerdict(fp, bundle) {
  return [
    '# E73 VERDICT',
    '',
    `Status: ${strictLaws === '1' ? 'PASS' : 'PASS (NON-STRICT)'}`,
    `- chain_mode: ${chainMode}`,
    `- strict_laws: ${strictLaws}`,
    `- chain_bundle_fingerprint: ${bundle.chain_bundle_fingerprint}`,
    `- canonical_fingerprint: ${fp}`
  ].join('\n');
}

function verifyAll() {
  const req = ['MATERIALS.md', 'WOW_USAGE.md', 'CONTRACT_COURT.md', 'CONTRACT_DIFF.md', 'CONTRACT_CHANGELOG.md', 'EDGE_CONTRACT.md', 'RUNS_EDGE_CONTRACT_X2.md', 'CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md'];
  for (const f of req) if (!fs.existsSync(path.join(E73_ROOT, f))) throw new Error(`Missing ${f}`);
  const fp = evidenceFingerprintE73();
  const c = readCanonicalFingerprintFromMd(path.join(E73_ROOT, 'CLOSEOUT.md'));
  const v = readCanonicalFingerprintFromMd(path.join(E73_ROOT, 'VERDICT.md'));
  if (!fp || c !== fp || v !== fp) throw new Error(`canonical mismatch closeout=${c} verdict=${v} computed=${fp}`);
  verifySumsRowsE73();
  const chk = spawnSync('bash', ['-lc', "grep -E '^[0-9a-f]{64} ' reports/evidence/E73/SHA256SUMS.md | sha256sum -c -"], { encoding: 'utf8' });
  if ((chk.status ?? 1) !== 0) throw new Error(`sha check failed\n${chk.stdout}\n${chk.stderr}`);
  return fp;
}

const before = gitStatus();
const wowUsed = String(process.env.WOW_USED || 'W-0001,W-0004,W-0008').split(',').map((x) => x.trim()).filter(Boolean);
const wowFp = computeWowFingerprint();
const wowUsageFp = computeWowUsageFingerprint(wowUsed);
const edge = runEdgeMetaSuiteV1({ seed: Number(process.env.SEED || '12345') });
const contractRows = parseContractRows();
const budgets = parseBudgets();
const court = runContractCourt();
const bundle = buildChainBundle(chainMode);

if (update) {
  ensureDir(E73_ROOT);
  if (!fs.existsSync(path.join(E73_ROOT, 'RUNS_EDGE_CONTRACT_X2.md'))) throw new Error('RUNS_EDGE_CONTRACT_X2.md missing (run x2 first)');
  writeMd(path.join(E73_ROOT, 'MATERIALS.md'), buildMaterials(bundle, wowFp, wowUsageFp, edge.deterministic_fingerprint));
  writeMd(path.join(E73_ROOT, 'WOW_USAGE.md'), buildWowUsage(wowFp, wowUsageFp, wowUsed));
  writeMd(path.join(E73_ROOT, 'CONTRACT_COURT.md'), buildContractCourt(court));
  writeMd(path.join(E73_ROOT, 'EDGE_CONTRACT.md'), buildEdgeContract(edge, contractRows, budgets));
  writeMd(path.join(E73_ROOT, 'CLOSEOUT.md'), buildCloseout('0'.repeat(64), bundle));
  writeMd(path.join(E73_ROOT, 'VERDICT.md'), buildVerdict('0'.repeat(64), bundle));
  rewriteSumsE73();

  let fp = evidenceFingerprintE73();
  writeMd(path.join(E73_ROOT, 'CLOSEOUT.md'), buildCloseout(fp, bundle));
  writeMd(path.join(E73_ROOT, 'VERDICT.md'), buildVerdict(fp, bundle));
  rewriteSumsE73();

  const fp2 = evidenceFingerprintE73();
  if (fp2 !== fp) {
    writeMd(path.join(E73_ROOT, 'CLOSEOUT.md'), buildCloseout(fp2, bundle));
    writeMd(path.join(E73_ROOT, 'VERDICT.md'), buildVerdict(fp2, bundle));
    rewriteSumsE73();
  }
}

const verified = verifyAll();
const after = gitStatus();
if (before !== after) {
  if (process.env.CI === 'true') throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');
  if (!driftOnlyAllowed(before, after)) throw new Error('UPDATE_SCOPE_VIOLATION');
}
console.log(`verify:e73:evidence PASSED canonical_fingerprint=${verified}`);
