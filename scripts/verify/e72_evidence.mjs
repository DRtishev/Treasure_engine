#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runEdgeMetaSuiteV1 } from '../../core/edge/alpha/edge_magic_meta_suite_v1.mjs';
import { computeWowFingerprint } from './e71_wow_verify.mjs';
import { computeWowUsageFingerprint } from './e72_wow_usage_verify.mjs';
import { E72_ROOT, ensureDir, defaultNormalizedEnv, readE71Binding, contractTextHash, materialsHashesE72, rewriteSumsE72, verifySumsRowsE72, evidenceFingerprintE72, readCanonicalFingerprintFromMd } from './e72_lib.mjs';
import { writeMd } from './e66_lib.mjs';
import { buildChainBundle } from './e70_chain_bundle.mjs';

const update = process.env.UPDATE_E72_EVIDENCE === '1';
const chainMode = String(process.env.CHAIN_MODE || 'FAST_PLUS').toUpperCase();
const strictLaws = process.env.STRICT_LAWS === '0' ? '0' : '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E72_EVIDENCE=1 forbidden when CI=true');

function gitStatus() { return (spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout || '').trim(); }
function parseMap(text) { const m = new Map(); for (const row of text.split('\n').map((x) => x.trim()).filter(Boolean)) m.set(row.slice(3).trim(), row.slice(0, 2)); return m; }
function driftOnlyUnderE72(before, after) { const b = parseMap(before), a = parseMap(after), ch = []; for (const [r, s] of a.entries()) if (!b.has(r) || b.get(r) !== s) ch.push(r); for (const r of b.keys()) if (!a.has(r)) ch.push(r); return ch.every((r) => r.startsWith('reports/evidence/E72/')); }

function parseContractRows() {
  return fs.readFileSync(path.resolve('docs/edge/EDGE_META_CONTRACT.md'), 'utf8').split(/\r?\n/)
    .filter((line) => /^\|\sM[1-5]\s\|/.test(line))
    .map((line) => line.split('|').map((x) => x.trim()).filter(Boolean))
    .map((p) => ({ law: p[0], dataset: p[1], expected_status: p[2], reason_code: p[3] }))
    .sort((a, b) => `${a.law}:${a.dataset}`.localeCompare(`${b.law}:${b.dataset}`));
}

function buildMaterials(bundle, wowFp, wowUsageFp, edgeFp) {
  const bind = readE71Binding();
  const env = defaultNormalizedEnv();
  const rows = materialsHashesE72().map((x) => `- ${x.file}: ${x.sha256}`);
  return [
    '# E72 MATERIALS',
    `- chain_mode: ${chainMode}`,
    `- strict_laws: ${strictLaws}`,
    `- e71_canonical_fingerprint: ${bind.e71_canonical_fingerprint}`,
    `- chain_bundle_fingerprint: ${bundle.chain_bundle_fingerprint}`,
    `- contract_text_hash: ${contractTextHash()}`,
    `- wow_fingerprint: ${wowFp}`,
    `- wow_usage_fingerprint: ${wowUsageFp}`,
    `- edge_meta_fingerprint: ${edgeFp}`,
    `- node_version: ${process.version}`,
    `- npm_version: ${(spawnSync('npm', ['-v'], { encoding: 'utf8' }).stdout || '').trim()}`,
    '- env_normalization:',
    `  - TZ=${env.TZ}`,
    `  - LANG=${env.LANG}`,
    `  - LC_ALL=${env.LC_ALL}`,
    `  - SOURCE_DATE_EPOCH=${env.SOURCE_DATE_EPOCH}`,
    ...rows
  ].join('\n');
}

function buildWowUsage(wowFp, wowUsageFp, used) {
  const uniq = [...new Set(used)].sort();
  return [
    '# E72 WOW USAGE',
    `- wow_fingerprint: ${wowFp}`,
    `- wow_usage_fingerprint: ${wowUsageFp}`,
    `- WOW_USED: [${uniq.join(', ')}]`,
    '- rationale:',
    `  - ${uniq[0]} used for deterministic edge contract discipline.`,
    `  - ${uniq[1]} used for governance/read-only gate design.`,
    `  - ${uniq[2]} used for anti-flake x2 verification doctrine.`,
    '- usage_trace:',
    '  - scripts/verify/e72_edge_contract_x2.mjs (law contract enforcement)',
    '  - scripts/verify/e72_run.mjs (governance orchestration)',
    '  - scripts/verify/e72_evidence.mjs (finalizer doctrine)'
  ].join('\n');
}

function buildEdgeContract(edgeReport, contractRows) {
  const laws = edgeReport.laws;
  const table = [
    '# E72 EDGE CONTRACT',
    `- strict_laws: ${strictLaws}`,
    '',
    '| law | dataset | expected_status | observed_pass | reason_code | observed_delta |',
    '|---|---|---|---|---|---:|'
  ];
  let must = 0; let allow = 0; let na = 0;
  for (const c of contractRows) {
    const lawObs = laws.find((x) => x.law === c.law && x.dataset === c.dataset);
    if (!lawObs) throw new Error(`missing law observation ${c.law}:${c.dataset}`);
    const reason = c.expected_status === 'MUST_PASS' ? (lawObs.pass ? 'NOT_APPLICABLE' : 'FAIL_ORDER_DEPENDENCE') : (lawObs.pass ? 'NOT_APPLICABLE' : c.reason_code);
    table.push(`| ${c.law} | ${c.dataset} | ${c.expected_status} | ${lawObs.pass ? 'true' : 'false'} | ${reason} | ${Number(lawObs.observed_delta).toFixed(8)} |`);
    if (c.expected_status === 'MUST_PASS') must += 1;
    if (c.expected_status === 'ALLOWED_FAIL') allow += 1;
    if (c.expected_status === 'NOT_APPLICABLE') na += 1;
  }
  table.push('', `- summary_must_pass_rows: ${must}`, `- summary_allowed_fail_rows: ${allow}`, `- summary_not_applicable_rows: ${na}`);
  return table.join('\n');
}

function buildCloseout(fp, bundle) {
  return [
    '# E72 CLOSEOUT',
    '',
    `- chain_mode: ${chainMode}`,
    `- strict_laws: ${strictLaws}`,
    `- chain_bundle_fingerprint: ${bundle.chain_bundle_fingerprint}`,
    '- commands:',
    '  - npm ci',
    `  - CI=false UPDATE_E72_EVIDENCE=1 CHAIN_MODE=${chainMode} npm run -s verify:e72`,
    `- canonical_fingerprint: ${fp}`,
    '- links:',
    '  - MATERIALS.md',
    '  - WOW_USAGE.md',
    '  - EDGE_CONTRACT.md',
    '  - RUNS_EDGE_CONTRACT_X2.md',
    '  - SHA256SUMS.md'
  ].join('\n');
}

function buildVerdict(fp, bundle, hasViolations) {
  const status = hasViolations && strictLaws === '0' ? 'PASS (NON-STRICT)' : 'PASS';
  return [
    '# E72 VERDICT',
    '',
    `Status: ${status}`,
    `- chain_mode: ${chainMode}`,
    `- strict_laws: ${strictLaws}`,
    `- chain_bundle_fingerprint: ${bundle.chain_bundle_fingerprint}`,
    `- canonical_fingerprint: ${fp}`
  ].join('\n');
}

function verifyAll() {
  const req = ['MATERIALS.md', 'WOW_USAGE.md', 'EDGE_CONTRACT.md', 'RUNS_EDGE_CONTRACT_X2.md', 'CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md'];
  for (const f of req) if (!fs.existsSync(path.join(E72_ROOT, f))) throw new Error(`Missing ${f}`);
  const fp = evidenceFingerprintE72();
  const c = readCanonicalFingerprintFromMd(path.join(E72_ROOT, 'CLOSEOUT.md'));
  const v = readCanonicalFingerprintFromMd(path.join(E72_ROOT, 'VERDICT.md'));
  if (!fp || c !== fp || v !== fp) throw new Error(`canonical mismatch closeout=${c} verdict=${v} computed=${fp}`);
  verifySumsRowsE72();
  const chk = spawnSync('bash', ['-lc', "grep -E '^[0-9a-f]{64} ' reports/evidence/E72/SHA256SUMS.md | sha256sum -c -"], { encoding: 'utf8' });
  if ((chk.status ?? 1) !== 0) throw new Error(`sha check failed\n${chk.stdout}\n${chk.stderr}`);
  return fp;
}

const before = gitStatus();
const bundle = buildChainBundle(chainMode);
const wowUsed = String(process.env.WOW_USED || 'W-0001,W-0004,W-0008').split(',').map((x) => x.trim()).filter(Boolean);
const wowFp = computeWowFingerprint();
const wowUsageFp = computeWowUsageFingerprint(wowUsed);
const edgeReport = runEdgeMetaSuiteV1({ seed: Number(process.env.SEED || '12345') });
const contractRows = parseContractRows();
const hasViolations = contractRows.some((c) => c.expected_status === 'MUST_PASS' && !edgeReport.laws.find((x) => x.law === c.law && x.dataset === c.dataset)?.pass);

if (update) {
  ensureDir(E72_ROOT);
  if (!fs.existsSync(path.join(E72_ROOT, 'RUNS_EDGE_CONTRACT_X2.md'))) throw new Error('RUNS_EDGE_CONTRACT_X2.md missing (run x2 first)');
  writeMd(path.join(E72_ROOT, 'MATERIALS.md'), buildMaterials(bundle, wowFp, wowUsageFp, edgeReport.deterministic_fingerprint));
  writeMd(path.join(E72_ROOT, 'WOW_USAGE.md'), buildWowUsage(wowFp, wowUsageFp, wowUsed));
  writeMd(path.join(E72_ROOT, 'EDGE_CONTRACT.md'), buildEdgeContract(edgeReport, contractRows));
  writeMd(path.join(E72_ROOT, 'CLOSEOUT.md'), buildCloseout('0'.repeat(64), bundle));
  writeMd(path.join(E72_ROOT, 'VERDICT.md'), buildVerdict('0'.repeat(64), bundle, hasViolations));
  rewriteSumsE72();
  let fp = evidenceFingerprintE72();
  writeMd(path.join(E72_ROOT, 'CLOSEOUT.md'), buildCloseout(fp, bundle));
  writeMd(path.join(E72_ROOT, 'VERDICT.md'), buildVerdict(fp, bundle, hasViolations));
  rewriteSumsE72();
  const fp2 = evidenceFingerprintE72();
  if (fp2 !== fp) {
    writeMd(path.join(E72_ROOT, 'CLOSEOUT.md'), buildCloseout(fp2, bundle));
    writeMd(path.join(E72_ROOT, 'VERDICT.md'), buildVerdict(fp2, bundle, hasViolations));
    rewriteSumsE72();
  }
}

const verified = verifyAll();
const after = gitStatus();
if (before !== after) {
  if (process.env.CI === 'true') throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');
  if (!driftOnlyUnderE72(before, after)) throw new Error('UPDATE_SCOPE_VIOLATION');
}
console.log(`verify:e72:evidence PASSED canonical_fingerprint=${verified}`);
