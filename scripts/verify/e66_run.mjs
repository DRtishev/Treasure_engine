#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E66_ROOT, LOCK_DIR, LOCK_PATH, RUN_DIR, ensureDir, writeMd, ensureNoLock, sha256Text } from './e66_lib.mjs';

ensureDir(E66_ROOT);
ensureDir(LOCK_DIR);
ensureDir(RUN_DIR);

const steps = ['verify:snapshots', 'verify:cas', 'truth:provenance', 'verify:provenance'];
const logs = [];

function runStep(script) {
  const r = spawnSync('npm', ['run', '-s', script], { encoding: 'utf8', env: { ...process.env, CI: process.env.CI || 'true', TZ: 'UTC', LANG: 'C', LC_ALL: 'C', SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000' } });
  logs.push(`## ${script}\n\n\`\`\`\n${(r.stdout || '') + (r.stderr || '')}\n\`\`\``);
  return r.status ?? 1;
}

try {
  ensureNoLock();
} catch (e) {
  writeMd(path.join(E66_ROOT, 'LOCK.md'), `# E66 LOCK\n\n- reason: ${String(e.message)}`);
  console.error(String(e.message));
  process.exit(1);
}

// bootstrap placeholders so verify:evidence can evaluate later step
for (const file of ['VERDICT.md', 'PACK.md', 'DIFFS.md', 'RUNS.md', 'CHECKLIST.md']) {
  const p = path.join(E66_ROOT, file);
  if (!fs.existsSync(p)) writeMd(p, `# E66 ${file.replace('.md', '')}\n`);
}

let failed = '';
for (const s of steps) {
  const st = runStep(s);
  if (st !== 0) {
    failed = s;
    break;
  }
}

const fpInput = logs.join('\n');
const fingerprint = sha256Text(fpInput);
writeMd(path.join(RUN_DIR, `run-${Date.now()}.md`), `# run\n\n- fingerprint: ${fingerprint}`);
writeMd(path.join(E66_ROOT, 'RUNS.md'), `# E66 RUNS\n\n- fingerprint: ${fingerprint}\n- ci: ${process.env.CI || ''}\n\n${logs.join('\n\n')}`);

if (failed) {
  writeMd(path.join(E66_ROOT, 'VERDICT.md'), `# E66 VERDICT\n\nStatus: BLOCKED\n\nFailed step: ${failed}`);
  writeMd(path.join(E66_ROOT, 'PACK.md'), '# E66 PACK\n\nStatus: BLOCKED');
  writeMd(path.join(E66_ROOT, 'CHECKLIST.md'), '# E66 CHECKLIST\n\nStatus: BLOCKED');
  console.error(`verify:e66 FAILED at ${failed}`);
  process.exit(1);
}

writeMd(path.join(E66_ROOT, 'PACK.md'), '# E66 PACK\n\nStatus: COMPLETE');
writeMd(path.join(E66_ROOT, 'VERDICT.md'), '# E66 VERDICT\n\nStatus: PASS');
const evidence = spawnSync('npm', ['run', '-s', 'verify:evidence'], { stdio: 'inherit', env: process.env });
if ((evidence.status ?? 1) !== 0) {
  writeMd(path.join(E66_ROOT, 'VERDICT.md'), '# E66 VERDICT\n\nStatus: BLOCKED\n\nFailed step: verify:evidence');
  process.exit(1);
}
console.log(`verify:e66 PASSED fingerprint=${fingerprint}`);
