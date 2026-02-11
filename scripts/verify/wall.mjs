#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolveEvidenceDir, resolveEvidenceEpoch } from '../ops/evidence_helpers.mjs';

const evidenceEpoch = resolveEvidenceEpoch();
const evidenceDir = process.env.EVIDENCE_DIR || resolveEvidenceDir();
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
  'npm run regen:manifests',
  `sha256sum -c ${path.join(evidenceDir, 'SHA256SUMS.SOURCE.txt')}`,
  `sha256sum -c ${path.join(evidenceDir, 'SHA256SUMS.EVIDENCE.txt')}`,
  `sha256sum -c ${path.join(evidenceDir, 'SHA256SUMS.EXPORT.txt')}`
];

fs.mkdirSync(path.join(evidenceDir, 'gates'), { recursive: true });
console.log(`verify:wall using EVIDENCE_EPOCH=${evidenceEpoch}`);

for (const cmd of commands) {
  console.log(`\n$ ${cmd}`);
  const result = spawnSync('bash', ['-lc', cmd], {
    stdio: 'inherit',
    env: {
      ...process.env,
      EVIDENCE_EPOCH: evidenceEpoch,
      EVIDENCE_DIR: evidenceDir
    }
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
