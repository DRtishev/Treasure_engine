import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

function run() {
  const r = spawnSync(process.execPath, ['scripts/verify/repo_byte_audit.mjs'], { encoding: 'utf8' });
  if (r.status !== 0) process.exit(r.status || 1);
  const s = JSON.parse(fs.readFileSync('reports/evidence/EXECUTOR/REPO_BYTE_AUDIT_SCOPE.json', 'utf8'));
  return s.manifest_sha256;
}

const a = run();
const b = run();
if (a !== b) {
  console.error(`[FAIL] ND_BYTE01 manifest drift x2 a=${a} b=${b}`);
  process.exit(1);
}
console.log('[PASS] RG_BYTE01 repo manifest stable x2');
