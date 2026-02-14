#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const update = process.env.UPDATE_E67_EVIDENCE === '1';
if (process.env.CI === 'true' && update) {
  console.error('verify:e67 FAILED\n- UPDATE_E67_EVIDENCE=1 forbidden when CI=true');
  process.exit(1);
}
for (const k of Object.keys(process.env)) {
  if ((k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) && process.env.CI === 'true' && String(process.env[k] || '').trim() !== '') {
    console.error(`verify:e67 FAILED\n- ${k} forbidden when CI=true`);
    process.exit(1);
  }
}


function scrubMutableFlags(src) {
  const clean = { ...src };
  for (const k of Object.keys(clean)) {
    if (k.startsWith('UPDATE_') || k.startsWith('APPROVE_')) delete clean[k];
  }
  return clean;
}


function gitStatusPorcelain() {
  const r = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  return (r.stdout || '').trim();
}

function parseStatusMap(text) {
  const map = new Map();
  for (const row of text.split('\n').map((x) => x.trim()).filter(Boolean)) {
    const status = row.slice(0, 2);
    const rel = row.slice(3).trim();
    map.set(rel, status);
  }
  return map;
}

function driftOnlyUnderE67(before, after) {
  const beforeMap = parseStatusMap(before);
  const afterMap = parseStatusMap(after);
  const changedPaths = [];
  for (const [rel, status] of afterMap.entries()) {
    if (!beforeMap.has(rel) || beforeMap.get(rel) !== status) changedPaths.push(rel);
  }
  for (const rel of beforeMap.keys()) {
    if (!afterMap.has(rel)) changedPaths.push(rel);
  }
  if (changedPaths.length === 0) return true;
  return changedPaths.every((rel) => rel.startsWith('reports/evidence/E67/'));
}

function runStep(name, cmd, env = process.env) {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) {
    console.error(`verify:e67 FAILED at ${name}`);
    process.exit(1);
  }
}

const normalizedEnv = {
  ...process.env,
  TZ: 'UTC',
  LANG: 'C',
  LC_ALL: 'C',
  SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000',
  SEED: String(process.env.SEED || '12345')
};

const before = gitStatusPorcelain();
const ciEnv = { ...scrubMutableFlags(normalizedEnv), CI: 'true' };
runStep('verify:e66', ['npm', 'run', '-s', 'verify:e66'], ciEnv);
runStep('verify:phoenix:x2', ['npm', 'run', '-s', 'verify:phoenix:x2'], ciEnv);
runStep('verify:evidence', ['npm', 'run', '-s', 'verify:evidence'], ciEnv);
runStep('verify:edge:recon:x2', ['npm', 'run', '-s', 'verify:edge:recon:x2'], normalizedEnv);
runStep('verify:e67:evidence', ['node', 'scripts/verify/e67_evidence.mjs'], normalizedEnv);
const after = gitStatusPorcelain();
if (before !== after) {
  if (process.env.CI === 'true') {
    console.error('verify:e67 FAILED\n- CI_READ_ONLY_VIOLATION');
    process.exit(1);
  }
  if (!update) {
    console.error('verify:e67 FAILED\n- READ_ONLY_VIOLATION');
    process.exit(1);
  }
  if (!driftOnlyUnderE67(before, after)) {
    console.error('verify:e67 FAILED\n- UPDATE_SCOPE_VIOLATION');
    process.exit(1);
  }
}
console.log('verify:e67 PASSED');
