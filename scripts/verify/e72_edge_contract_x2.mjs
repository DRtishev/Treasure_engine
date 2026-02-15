#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { runEdgeMetaSuiteV1 } from '../../core/edge/alpha/edge_magic_meta_suite_v1.mjs';
import { E72_ROOT, E72_LOCK_PATH, ensureDir, defaultNormalizedEnv, contractTextHash } from './e72_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update = process.env.UPDATE_E72_EVIDENCE === '1';
const strictLaws = process.env.STRICT_LAWS === '0' ? '0' : '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E72_EVIDENCE=1 forbidden when CI=true');
for (const k of Object.keys(process.env)) {
  if ((k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) && process.env.CI === 'true' && String(process.env[k] || '').trim() !== '') {
    throw new Error(`${k} forbidden when CI=true`);
  }
}

function parseContract() {
  const raw = fs.readFileSync(path.resolve('docs/edge/EDGE_META_CONTRACT.md'), 'utf8').replace(/\r\n/g, '\n');
  const rows = raw.split('\n')
    .filter((line) => /^\|\sM[1-5]\s\|/.test(line))
    .map((line) => line.split('|').map((x) => x.trim()).filter(Boolean));
  const map = new Map();
  for (const parts of rows) {
    const [law, dataset, expected, reason] = parts;
    if (!['MUST_PASS', 'ALLOWED_FAIL', 'NOT_APPLICABLE'].includes(expected)) throw new Error(`bad expected_status ${expected}`);
    map.set(`${law}:${dataset}`, { law, dataset, expected_status: expected, reason_code: reason });
  }
  return map;
}

function evaluate(report, contract, strictMode) {
  const out = [];
  let mustPassViolations = 0;
  for (const row of report.laws) {
    const key = `${row.law}:${row.dataset}`;
    const c = contract.get(key);
    if (!c) throw new Error(`contract missing ${key}`);

    let status = c.expected_status;
    let reasonCode = c.reason_code;
    if (c.expected_status === 'MUST_PASS') {
      if (!row.pass) {
        if (strictMode) mustPassViolations += 1;
        status = 'MUST_PASS';
        reasonCode = 'FAIL_ORDER_DEPENDENCE';
      } else {
        reasonCode = 'NOT_APPLICABLE';
      }
    } else if (c.expected_status === 'ALLOWED_FAIL') {
      reasonCode = row.pass ? 'NOT_APPLICABLE' : c.reason_code;
    }
    out.push({ law: row.law, dataset: row.dataset, pass: row.pass, observed_delta: row.observed_delta, status, reason_code: reasonCode });
  }
  out.sort((a, b) => `${a.law}:${a.dataset}`.localeCompare(`${b.law}:${b.dataset}`));
  const summary = {
    must_pass: out.filter((x) => x.status === 'MUST_PASS').length,
    allowed_fail: out.filter((x) => x.status === 'ALLOWED_FAIL').length,
    not_applicable: out.filter((x) => x.status === 'NOT_APPLICABLE').length,
    must_pass_violations: mustPassViolations
  };
  return { evaluated_laws: out, summary, failed: strictMode && mustPassViolations > 0 };
}

function runOnce(label, seed, strictMode) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `e72-${label}-`));
  try {
    const report = runEdgeMetaSuiteV1({ seed });
    const contract = parseContract();
    const evalResult = evaluate(report, contract, strictMode);
    const runCore = {
      strict_laws: strictMode ? '1' : '0',
      seed,
      contract_text_hash: contractTextHash(),
      edge_meta_fingerprint: report.deterministic_fingerprint,
      summary: evalResult.summary,
      laws: evalResult.evaluated_laws
    };
    const runFingerprint = crypto.createHash('sha256').update(JSON.stringify(runCore)).digest('hex');
    return { status: evalResult.failed ? 2 : 0, tempRoot, runFingerprint, report, evalResult, seed };
  } catch (error) {
    return { status: 1, tempRoot, runFingerprint: '', error: String(error?.message || error), seed };
  }
}

const baseSeed = Number(process.env.SEED || '12345');
const run1Seed = Number(process.env.E72_RUN1_SEED || baseSeed);
const run2Seed = Number(process.env.E72_RUN2_SEED || (process.env.FORCE_E72_MISMATCH === '1' ? baseSeed + 19 : baseSeed));
const strictMode = strictLaws === '1';

const run1 = runOnce('run1', run1Seed, strictMode);
const run2 = runOnce('run2', run2Seed, strictMode);
const deterministicMatch = run1.status === 0 && run2.status === 0 && run1.runFingerprint === run2.runFingerprint;
const pass = run1.status === 0 && run2.status === 0 && deterministicMatch;

const doubleFail = run1.status !== 0 && run2.status !== 0;
const mismatch = run1.status === 0 && run2.status === 0 && run1.runFingerprint !== run2.runFingerprint;
if (!pass && (doubleFail || mismatch)) {
  ensureDir(path.dirname(E72_LOCK_PATH));
  writeMd(E72_LOCK_PATH, [
    '# E72 KILL LOCK',
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
if (pass && fs.existsSync(E72_LOCK_PATH) && process.env.CI !== 'true') fs.rmSync(E72_LOCK_PATH, { force: true });

if (update && process.env.CI !== 'true') {
  ensureDir(E72_ROOT);
  writeMd(path.join(E72_ROOT, 'RUNS_EDGE_CONTRACT_X2.md'), [
    '# E72 RUNS EDGE CONTRACT X2',
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
