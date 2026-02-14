#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const strict = process.env.RELEASE_STRICT === '1' || process.env.EVIDENCE_COMMIT_BINDING_STRICT === '1';
const manualDir = path.resolve('reports/evidence/EPOCH-66/gates/manual');
fs.mkdirSync(manualDir, { recursive: true });

const run = spawnSync('node', ['scripts/evidence/finalize_commit_binding.mjs'], {
  encoding: 'utf8',
  env: process.env
});

if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);

let parsed = {};
try {
  parsed = JSON.parse((run.stdout || '{}').trim() || '{}');
} catch {
  parsed = { parse_error: true };
}

const report = {
  generated_at: new Date().toISOString(),
  strict_mode: strict,
  status: (run.status ?? 1) === 0 ? 'PASS' : strict ? 'FAIL' : 'WARN',
  ...parsed
};
fs.writeFileSync(path.join(manualDir, 'evidence_commit_binding_report.json'), `${JSON.stringify(report, null, 2)}\n`);

if ((run.status ?? 1) !== 0 && strict) process.exit(1);
if ((run.status ?? 1) !== 0) {
  console.warn('verify:evidence:commit_binding WARN (non-strict)');
  process.exit(0);
}
console.log('verify:evidence:commit_binding PASSED');
