#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { runEdgeMetaSuiteV1 } from '../../core/edge/alpha/edge_magic_meta_suite_v1.mjs';
import { E73_ROOT, E73_LOCK_PATH, ensureDir, defaultNormalizedEnv, contractTextHash, registryHash, budgetHash } from './e73_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update = process.env.UPDATE_E73_EVIDENCE === '1';
const strictLaws = process.env.STRICT_LAWS === '0' ? '0' : '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E73_EVIDENCE=1 forbidden when CI=true');
for (const k of Object.keys(process.env)) {
  if ((k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) && process.env.CI === 'true' && String(process.env[k] || '').trim() !== '') throw new Error(`${k} forbidden when CI=true`);
}

function parseRegistry() {
  const raw = fs.readFileSync(path.resolve('docs/edge/EDGE_REASON_CODES.md'), 'utf8');
  const codes = raw.split(/\r?\n/).filter((line) => /^\|\s[A-Z0-9_]{3,48}\s\|/.test(line)).map((line) => line.split('|').map((x) => x.trim()).filter(Boolean)[0]);
  const uniq = new Set();
  for (const c of codes) {
    if (!/^[A-Z0-9_]{3,48}$/.test(c)) throw new Error(`invalid reason code ${c}`);
    if (uniq.has(c)) throw new Error(`duplicate reason code ${c}`);
    uniq.add(c);
  }
  return uniq;
}

function parseContract() {
  const raw = fs.readFileSync(path.resolve('docs/edge/EDGE_META_CONTRACT.md'), 'utf8');
  const rows = raw.split(/\r?\n/).filter((line) => /^\|\sM[1-5]\s\|/.test(line)).map((line) => line.split('|').map((x) => x.trim()).filter(Boolean));
  const contract = new Map();
  for (const p of rows) contract.set(`${p[0]}:${p[1]}`, { law: p[0], dataset: p[1], expected: p[2], reason: p[3] });

  const lines = raw.split(/\r?\n/);
  const maxTotal = Number((lines.find((l) => /^max_total:/.test(l)) || 'max_total: 0').split(':')[1].trim());
  const perLaw = {};
  const perRegime = {};
  let mode = '';
  for (const line of lines) {
    if (/^per_law:/.test(line)) mode = 'law';
    else if (/^per_regime:/.test(line)) mode = 'regime';
    else if (/^- /.test(line) && mode === 'law') { const [k, v] = line.slice(2).split(':').map((x) => x.trim()); perLaw[k] = Number(v); }
    else if (/^- /.test(line) && mode === 'regime') { const [k, v] = line.slice(2).split(':').map((x) => x.trim()); perRegime[k] = Number(v); }
  }
  return { contract, budget: { max_total: maxTotal, per_law: perLaw, per_regime: perRegime } };
}

function evaluate(report, parsed, strictMode, registry) {
  const evalRows = [];
  let mustViolations = 0;
  let allowedTotal = 0;
  const allowedLaw = {};
  const allowedRegime = {};

  for (const obs of report.laws) {
    const c = parsed.contract.get(`${obs.law}:${obs.dataset}`);
    if (!c) throw new Error(`contract missing ${obs.law}:${obs.dataset}`);
    if (!registry.has(c.reason) && c.reason !== 'NOT_APPLICABLE') throw new Error(`unknown reason code ${c.reason}`);

    let reason = 'NOT_APPLICABLE';
    if (c.expected === 'MUST_PASS') {
      if (!obs.pass) { mustViolations += 1; reason = 'FAIL_ORDER_DEPENDENCE'; }
    } else if (c.expected === 'ALLOWED_FAIL') {
      if (!obs.pass) {
        reason = c.reason;
        allowedTotal += 1;
        allowedLaw[obs.law] = (allowedLaw[obs.law] || 0) + 1;
      }
    }

    evalRows.push({ law: obs.law, dataset: obs.dataset, expected_status: c.expected, observed_pass: obs.pass, reason_code: reason, observed_delta: obs.observed_delta });
  }
  evalRows.sort((a, b) => `${a.law}:${a.dataset}`.localeCompare(`${b.law}:${b.dataset}`));

  for (const [law, count] of Object.entries(allowedLaw)) {
    if ((parsed.budget.per_law[law] ?? 0) < count && strictMode) mustViolations += 1;
  }
  for (const regime of ['fee_shock', 'spread_spike', 'missing_candles', 'baseline']) {
    const count = report.regimes.filter((r) => r.regime === regime && r.metrics.net_pnl < 0).length;
    allowedRegime[regime] = count;
    if ((parsed.budget.per_regime[regime] ?? 0) < count && strictMode) mustViolations += 1;
  }
  if (strictMode && allowedTotal > parsed.budget.max_total) mustViolations += 1;

  return {
    rows: evalRows,
    summary: { must_pass_violations: mustViolations, allowed_fail_observed_total: allowedTotal, allowed_fail_observed_per_law: allowedLaw, allowed_fail_observed_per_regime: allowedRegime },
    failed: strictMode && mustViolations > 0
  };
}

function runOnce(label, seed, strictMode) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `e73-${label}-`));
  try {
    const report = runEdgeMetaSuiteV1({ seed });
    const parsed = parseContract();
    const reg = parseRegistry();
    const evaluation = evaluate(report, parsed, strictMode, reg);
    const runCore = {
      strict_laws: strictMode ? '1' : '0',
      seed,
      contract_text_hash: contractTextHash(),
      registry_hash: registryHash(),
      budget_hash: budgetHash(),
      edge_meta_fingerprint: report.deterministic_fingerprint,
      summary: evaluation.summary,
      rows: evaluation.rows
    };
    const runFingerprint = crypto.createHash('sha256').update(JSON.stringify(runCore)).digest('hex');
    return { status: evaluation.failed ? 2 : 0, tempRoot, runFingerprint, report, evaluation, seed };
  } catch (error) {
    return { status: 1, tempRoot, runFingerprint: '', error: String(error?.message || error), seed };
  }
}

const baseSeed = Number(process.env.SEED || '12345');
const run1Seed = Number(process.env.E73_RUN1_SEED || baseSeed);
const run2Seed = Number(process.env.E73_RUN2_SEED || (process.env.FORCE_E73_MISMATCH === '1' ? baseSeed + 23 : baseSeed));
const strictMode = strictLaws === '1';

const run1 = runOnce('run1', run1Seed, strictMode);
const run2 = runOnce('run2', run2Seed, strictMode);
const deterministicMatch = run1.status === 0 && run2.status === 0 && run1.runFingerprint === run2.runFingerprint;
const pass = run1.status === 0 && run2.status === 0 && deterministicMatch;

const doubleFail = run1.status !== 0 && run2.status !== 0;
const mismatch = run1.status === 0 && run2.status === 0 && run1.runFingerprint !== run2.runFingerprint;
if (!pass && (doubleFail || mismatch)) {
  ensureDir(path.dirname(E73_LOCK_PATH));
  writeMd(E73_LOCK_PATH, [
    '# E73 KILL LOCK',
    '',
    `- reason: ${doubleFail ? 'verify:edge:contract:x2 failed twice' : 'deterministic mismatch across run1/run2'}`,
    `- timestamp_utc: ${new Date(Number(defaultNormalizedEnv().SOURCE_DATE_EPOCH) * 1000).toISOString()}`,
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_fingerprint: ${run1.runFingerprint || 'N/A'}`,
    `- run2_fingerprint: ${run2.runFingerprint || 'N/A'}`,
    `- run1_seed: ${run1Seed}`,
    `- run2_seed: ${run2Seed}`,
    `- run1_temp: ${run1.tempRoot}`,
    `- run2_temp: ${run2.tempRoot}`
  ].join('\n'));
}
if (pass && fs.existsSync(E73_LOCK_PATH) && process.env.CI !== 'true') fs.rmSync(E73_LOCK_PATH, { force: true });

if (update && process.env.CI !== 'true') {
  ensureDir(E73_ROOT);
  writeMd(path.join(E73_ROOT, 'RUNS_EDGE_CONTRACT_X2.md'), [
    '# E73 RUNS EDGE CONTRACT X2',
    `- strict_laws: ${strictLaws}`,
    `- run1_status: ${run1.status}`,
    `- run2_status: ${run2.status}`,
    `- run1_seed: ${run1Seed}`,
    `- run2_seed: ${run2Seed}`,
    `- run1_fingerprint: ${run1.runFingerprint || 'N/A'}`,
    `- run2_fingerprint: ${run2.runFingerprint || 'N/A'}`,
    `- deterministic_match: ${String(deterministicMatch)}`,
    '- run1_root: <tmp-run1>',
    '- run2_root: <tmp-run2>'
  ].join('\n'));
}

if (!pass) {
  console.error('verify:edge:contract:x2 FAILED');
  process.exit(1);
}
console.log(`verify:edge:contract:x2 temp_roots run1=${run1.tempRoot} run2=${run2.tempRoot}`);
console.log(`verify:edge:contract:x2 PASSED run_fingerprint=${run1.runFingerprint}`);
