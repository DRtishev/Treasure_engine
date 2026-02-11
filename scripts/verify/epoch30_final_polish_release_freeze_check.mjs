#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function run(cmd, log) {
  const r = spawnSync('bash', ['-lc', cmd], { encoding: 'utf8', env: process.env });
  fs.writeFileSync(log, `$ ${cmd}\n${r.stdout || ''}${r.stderr || ''}`);
  if (r.status !== 0) throw new Error(`FAILED: ${cmd} (see ${log})`);
}

const evidenceEpoch = process.env.EVIDENCE_EPOCH || 'EPOCH-30-FINAL';
const evidenceDir = path.join('reports', 'evidence', evidenceEpoch);
const cleanDir = path.join(evidenceDir, 'CLEAN_CLONE');
fs.mkdirSync(cleanDir, { recursive: true });

run('npm run verify:wall', path.join(cleanDir, '01_verify_wall.log'));
run('npm run verify:release-governor', path.join(cleanDir, '02_verify_release_governor.log'));
run('npm run verify:release-governor', path.join(cleanDir, '03_verify_release_governor_repeat.log'));

const ledger = JSON.parse(fs.readFileSync('specs/epochs/LEDGER.json', 'utf8'));
for (let i = 1; i <= 30; i += 1) {
  const row = ledger.epochs?.[String(i)];
  if (!row || row.status !== 'DONE') throw new Error(`Ledger not DONE for EPOCH-${String(i).padStart(2, '0')}`);
}
if (!fs.existsSync('FINAL_VALIDATED.zip') || !fs.existsSync('FINAL_VALIDATED.zip.sha256')) {
  throw new Error('Missing FINAL_VALIDATED.zip or checksum');
}
console.log('epoch30 final freeze checks passed');
