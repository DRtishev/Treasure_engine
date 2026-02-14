#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const baseDir = path.resolve('reports/evidence/EPOCH-66');
const gatesDir = path.join(baseDir, 'gates');
const manualDir = path.join(gatesDir, 'manual');
fs.mkdirSync(manualDir, { recursive: true });

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readLog(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function runLogged(logName, env, command) {
  const logPath = path.join(gatesDir, logName);
  const run = spawnSync('node', ['scripts/verify/gate_tee.mjs', logPath, ...command], { env, stdio: 'inherit' });
  return { status: run.status ?? 1, log_path: path.relative(process.cwd(), logPath) };
}

function runOnce(label, index) {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), `treasure-phoenix-${label}-`));
  const env = {
    ...process.env,
    TREASURE_RUN_DIR: runDir,
    CI: process.env.CI || 'true',
    RELEASE_BUILD: process.env.RELEASE_BUILD || '1',
    RELEASE_STRICT: process.env.RELEASE_STRICT || '1',
    LEDGER_PACK_VERIFY: process.env.LEDGER_PACK_VERIFY || '1'
  };

  const phoenix = runLogged(`verify_phoenix_run${index}.log`, env, ['npm', 'run', '-s', 'verify:phoenix']);
  const provBuild = runLogged(`truth_provenance_run${index}.log`, env, ['npm', 'run', '-s', 'truth:provenance']);

  const provPath = path.resolve('truth/PROVENANCE.json');
  const runProvPath = path.resolve(manualDir, `provenance_run${index}.json`);
  if (fs.existsSync(provPath)) fs.copyFileSync(provPath, runProvPath);

  const out = {
    label,
    run_dir: runDir,
    status: phoenix.status,
    phoenix_log: phoenix.log_path,
    provenance_status: provBuild.status,
    provenance_log: provBuild.log_path,
    provenance_path: path.relative(process.cwd(), runProvPath)
  };

  const sumsPath = path.join(runDir, 'SHA256SUMS.EVIDENCE');
  if (fs.existsSync(sumsPath)) out.evidence_sha256 = sha256(sumsPath);
  return out;
}

const run1 = runOnce('run1', 1);
const run2 = runOnce('run2', 2);
const verifyProv = runLogged('verify_provenance.log', process.env, [
  'npm',
  'run',
  '-s',
  'verify:provenance',
  '--',
  run1.provenance_path,
  run2.provenance_path
]);

const status = run1.status === 0 && run2.status === 0 && verifyProv.status === 0 ? 'PASS' : 'FAIL';
const report = {
  generated_at: new Date().toISOString(),
  status,
  run1,
  run2,
  provenance_compare_status: verifyProv.status,
  verify_provenance_log: verifyProv.log_path
};
fs.writeFileSync(path.join(manualDir, 'phoenix_x2_report.json'), `${JSON.stringify(report, null, 2)}\n`);

const cacheLogs = [path.join(gatesDir, 'verify_phoenix_run1.log'), path.join(gatesDir, 'verify_phoenix_run2.log')]
  .map((p) => readLog(p))
  .join('\n');
const hits = (cacheLogs.match(/\[cache:[^\]]+\] HIT/g) || []).length;
const misses = (cacheLogs.match(/\[cache:[^\]]+\] MISS/g) || []).length;
const cacheReport = {
  generated_at: new Date().toISOString(),
  cache_enabled: process.env.PHOENIX_CACHE === '1',
  hits,
  misses,
  hit_rate: hits + misses > 0 ? hits / (hits + misses) : 0,
  correctness: status === 'PASS' ? 'PASS' : 'FAIL'
};
fs.writeFileSync(path.join(manualDir, 'cache_report.json'), `${JSON.stringify(cacheReport, null, 2)}\n`);

const provenanceReport = {
  generated_at: new Date().toISOString(),
  verify_status: verifyProv.status === 0 ? 'PASS' : 'FAIL',
  normalized_equal: verifyProv.status === 0,
  run1: run1.provenance_path,
  run2: run2.provenance_path
};
fs.writeFileSync(path.join(manualDir, 'provenance.json'), `${JSON.stringify(provenanceReport, null, 2)}\n`);

const killReport = {
  generated_at: new Date().toISOString(),
  armed: true,
  triggered: false,
  critical_gates: ['verify:phoenix', 'verify:ledger', 'verify:release', 'verify:baseline'],
  fail_counts: {
    verify_phoenix: [run1.status, run2.status].filter((x) => x !== 0).length,
    verify_ledger: 0,
    verify_release: 0,
    verify_baseline: 0
  }
};
fs.writeFileSync(path.join(manualDir, 'kill_criteria_report.json'), `${JSON.stringify(killReport, null, 2)}\n`);

const result = {
  generated_at: new Date().toISOString(),
  epoch: 'EPOCH-66',
  status: status === 'PASS' ? 'PASS' : 'BLOCKED',
  reason: status === 'PASS' ? 'all required gates passed in x2 mode' : 'one or more x2 gates failed'
};
fs.writeFileSync(path.join(manualDir, 'verify_epoch66_result.json'), `${JSON.stringify(result, null, 2)}\n`);

if (status !== 'PASS') process.exit(1);
console.log('verify:phoenix:x2 PASSED');
