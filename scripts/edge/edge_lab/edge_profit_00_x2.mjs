import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { RUN_ID, sha256Norm, canonSort, writeMd } from './canon.mjs';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00');
const MANUAL_DIR = path.join(EPOCH_DIR, 'gates', 'manual');
fs.mkdirSync(MANUAL_DIR, { recursive: true });

function runProfit() {
  execSync('node scripts/edge/edge_lab/edge_profit_00_closeout.mjs', { cwd: ROOT, stdio: 'inherit' });
}

function collectRows() {
  const keyMd = [
    'reports/evidence/EDGE_PROFIT_00/EXPECTANCY.md',
    'reports/evidence/EDGE_PROFIT_00/OVERFIT_DEFENSE.md',
    'reports/evidence/EDGE_PROFIT_00/EDGE_PROFIT_00_CLOSEOUT.md',
  ];
  const jsonDir = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'gates', 'manual');
  const jsonFiles = fs.existsSync(jsonDir)
    ? fs.readdirSync(jsonDir).filter((f) => f.endsWith('.json')).map((f) => `reports/evidence/EDGE_PROFIT_00/gates/manual/${f}`)
    : [];
  const files = canonSort([...keyMd, ...jsonFiles]);
  const rows = [];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      rows.push(`${rel}|MISSING`);
      continue;
    }
    const content = fs.readFileSync(abs, 'utf8');
    rows.push(`${rel}|${sha256Norm(content)}`);
  }
  return rows;
}

function fingerprint(rows) {
  return crypto.createHash('sha256').update(rows.join('\n') + '\n').digest('hex');
}

console.log('\n============================================================');
console.log('EDGE_PROFIT_00 X2 — Deterministic Anti-Flake');
console.log(`RUN_ID: ${RUN_ID}`);
console.log('============================================================');

console.log('\n[X2] Run 1/2');
runProfit();
const rows1 = collectRows();
const fp1 = fingerprint(rows1);

console.log('\n[X2] Run 2/2');
runProfit();
const rows2 = collectRows();
const fp2 = fingerprint(rows2);

const match = fp1 === fp2;
const status = match ? 'PASS' : 'FAIL';
const reasonCode = match ? 'NONE' : 'ND01';
const nextAction = match ? 'npm run -s edge:profit:00' : 'npm run -s edge:profit:00:x2';

const drift = [];
const max = Math.max(rows1.length, rows2.length);
for (let i = 0; i < max; i++) {
  if ((rows1[i] || '') !== (rows2[i] || '')) drift.push({ run1: rows1[i] || 'MISSING', run2: rows2[i] || 'MISSING' });
}

writeMd(path.join(EPOCH_DIR, 'EDGE_PROFIT_00_X2.md'), `# EDGE_PROFIT_00_X2.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## Fingerprints\n\n- run1: ${fp1}\n- run2: ${fp2}\n- match: ${match}\n- row_count: ${rows1.length}\n- drift_count: ${drift.length}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'edge_profit_00_x2.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: match ? 'EDGE_PROFIT_00 deterministic across two consecutive runs.' : 'Determinism mismatch across x2 runs.',
  next_action: nextAction,
  fingerprint_run1: fp1,
  fingerprint_run2: fp2,
  fingerprints_match: match,
  row_count: rows1.length,
  drift_count: drift.length,
  drift: drift,
});

console.log(`\n[${status}] edge_profit_00_x2 — ${reasonCode}`);
process.exit(match ? 0 : 1);
