import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const evidenceEpoch = process.env.EVIDENCE_EPOCH || 'EPOCH-EDGE-LOCAL-MEGA';
const base = path.join('reports/evidence', evidenceEpoch, 'mega');
fs.mkdirSync(base, { recursive: true });

for (const epoch of ['31', '32', '33', '34', '35', '36', '37', '38', '39', '40']) {
  const cmd = ['run', `verify:epoch${epoch}`];
  const log = path.join(base, `verify_epoch${epoch}.log`);
  const res = spawnSync('npm', cmd, { encoding: 'utf8', env: process.env });
  fs.writeFileSync(log, (res.stdout || '') + (res.stderr || ''));
  if (res.status !== 0) {
    console.error(`verify:epoch${epoch} failed; see ${log}`);
    process.exit(res.status ?? 1);
  }
}

if (process.env.ENABLE_CLEAN_CLONE === '1') {
  const cc = spawnSync('npm', ['run', 'verify:clean-clone'], { encoding: 'utf8', env: process.env });
  fs.writeFileSync(path.join(base, 'clean_clone.log'), (cc.stdout || '') + (cc.stderr || ''));
  if (cc.status !== 0) process.exit(cc.status ?? 1);
} else {
  fs.writeFileSync(path.join(base, 'clean_clone.log'), 'SKIPPED (set ENABLE_CLEAN_CLONE=1 to run).\n');
}

console.log(`PASS verify:edge evidence=${base}`);
