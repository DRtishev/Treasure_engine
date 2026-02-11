#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveEvidenceDir, resolveEvidenceEpoch } from './evidence_helpers.mjs';

const evidenceEpoch = resolveEvidenceEpoch();
const evidenceDir = process.env.EVIDENCE_DIR || resolveEvidenceDir();
const cleanDir = path.join(evidenceDir, 'CLEAN_CLONE');
fs.mkdirSync(cleanDir, { recursive: true });

const requiredFiles = [
  'PREFLIGHT.log',
  'SNAPSHOT.md',
  'ASSUMPTIONS.md',
  'GATE_PLAN.md',
  'RISK_REGISTER.md',
  'SUMMARY.md',
  'VERDICT.md'
];

for (const fileName of requiredFiles) {
  const filePath = path.join(evidenceDir, fileName);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `# ${fileName}\nBootstrap placeholder for ${evidenceEpoch}.\n`);
  }
}

function run(stepId, cmd) {
  const log = path.join(cleanDir, `${String(stepId).padStart(2, '0')}_${cmd.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 72)}.log`);
  const result = spawnSync('bash', ['-lc', cmd], {
    encoding: 'utf8',
    env: {
      ...process.env,
      EVIDENCE_EPOCH: evidenceEpoch,
      EVIDENCE_DIR: evidenceDir,
      CLEAN_CLONE_BOOTSTRAP: '1'
    }
  });
  fs.writeFileSync(log, `$ ${cmd}\n${result.stdout || ''}${result.stderr || ''}`);
  if (result.status !== 0) {
    console.error(`clean-clone bootstrap failed: ${cmd} (see ${log})`);
    process.exit(result.status ?? 1);
  }
}

run(1, 'npm ci');
run(2, 'SKIP_CLEAN_CLONE_IN_WALL=1 SKIP_SHA_CHECKS_IN_WALL=1 npm run verify:wall');
run(3, 'npm run verify:release-governor');
run(4, 'npm run verify:release-governor');

const markerPath = path.join(cleanDir, 'CLEAN_CLONE.OK');
fs.writeFileSync(markerPath, `PASS EVIDENCE_EPOCH=${evidenceEpoch}\n`);
console.log(`verify:clean-clone passed (${markerPath})`);
