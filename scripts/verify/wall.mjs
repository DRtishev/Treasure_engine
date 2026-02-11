#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolveEvidenceDir, resolveEvidenceEpoch } from '../ops/evidence_helpers.mjs';

const evidenceEpoch = resolveEvidenceEpoch();
const evidenceDir = process.env.EVIDENCE_DIR || resolveEvidenceDir();
const gatesDir = path.join(evidenceDir, 'gates');
const wallResultPath = path.join(evidenceDir, 'WALL_RESULT.json');
const wallMarkersPath = path.join(evidenceDir, 'WALL_MARKERS.txt');

fs.mkdirSync(gatesDir, { recursive: true });

const includeCleanClone = process.env.SKIP_CLEAN_CLONE_IN_WALL !== '1';
const includeShaChecks = process.env.SKIP_SHA_CHECKS_IN_WALL !== '1';

const commands = [
  'npm ci',
  'npm run verify:specs',
  'npm run verify:specs',
  'npm run verify:paper',
  'npm run verify:paper',
  'npm run verify:e2',
  'npm run verify:e2',
  'npm run verify:e2:multi',
  'npm run verify:paper:multi',
  'npm run verify:phase2',
  'npm run verify:integration',
  'npm run verify:core',
  'npm run verify:epoch27',
  'npm run verify:epoch28',
  'npm run verify:epoch29',
  ...(includeCleanClone ? ['npm run verify:clean-clone'] : []),
  'npm run export:validated',
  'npm run regen:manifests',
  ...(includeShaChecks ? [
    `sha256sum -c ${path.join(evidenceDir, 'SHA256SUMS.SOURCE.txt')}`,
    `sha256sum -c ${path.join(evidenceDir, 'SHA256SUMS.EVIDENCE.txt')}`,
    `sha256sum -c ${path.join(evidenceDir, 'SHA256SUMS.EXPORT.txt')}`
  ] : [])
];

const requiredMarkers = [
  'npm run verify:specs',
  'npm run verify:paper',
  'npm run verify:e2',
  'npm run verify:e2:multi',
  'npm run verify:paper:multi',
  'npm run verify:phase2',
  'npm run verify:integration',
  'npm run verify:core',
  ...(includeCleanClone ? ['npm run verify:clean-clone'] : []),
  'npm run export:validated',
  'npm run regen:manifests',
  ...(includeShaChecks ? ['sha256sum -c '] : [])
];

const startedAt = new Date().toISOString();
const wallResult = {
  evidence_epoch: evidenceEpoch,
  evidence_dir: evidenceDir,
  started_at: startedAt,
  finished_at: null,
  status: 'FAIL',
  required_markers: requiredMarkers,
  steps: []
};

function persist() {
  fs.writeFileSync(wallResultPath, `${JSON.stringify(wallResult, null, 2)}\n`);
  const lines = wallResult.steps.map((step, idx) => `${String(idx + 1).padStart(2, '0')}|${step.exit_code === 0 ? 'PASS' : 'FAIL'}|${step.command}|${step.log_path}`);
  const markerChecks = requiredMarkers.map((marker) => {
    const found = wallResult.steps.some((step) => step.command.includes(marker));
    return `REQUIRED|${found ? 'PASS' : 'FAIL'}|${marker}`;
  });
  fs.writeFileSync(wallMarkersPath, `${[...lines, ...markerChecks].join('\n')}\n`);
}

function run(command, index) {
  const stepStart = new Date().toISOString();
  const logPath = path.join(gatesDir, `${String(index + 1).padStart(2, '0')}_${command.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 80)}.log`);
  const result = spawnSync('bash', ['-lc', command], {
    encoding: 'utf8',
    env: {
      ...process.env,
      EVIDENCE_EPOCH: evidenceEpoch,
      EVIDENCE_DIR: evidenceDir
    }
  });
  fs.writeFileSync(logPath, `$ ${command}\n${result.stdout || ''}${result.stderr || ''}`);
  const step = {
    command,
    started_at: stepStart,
    finished_at: new Date().toISOString(),
    exit_code: result.status ?? 1,
    log_path: logPath
  };
  wallResult.steps.push(step);
  persist();
  return step.exit_code;
}

console.log(`verify:wall using EVIDENCE_EPOCH=${evidenceEpoch}`);
persist();
for (let i = 0; i < commands.length; i += 1) {
  const command = commands[i];
  console.log(`\n$ ${command}`);
  const exit = run(command, i);
  if (exit !== 0) {
    wallResult.finished_at = new Date().toISOString();
    wallResult.status = 'FAIL';
    persist();
    process.exit(exit);
  }
}

wallResult.finished_at = new Date().toISOString();
wallResult.status = 'PASS';
persist();
