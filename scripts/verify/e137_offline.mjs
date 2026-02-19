#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E137_ROOT, REASON, run, writeMd } from './e137_lib.mjs';

export function runOffline() {
  const declare = 'Declare: offline transport truth derives from E135 deterministic harness.';
  const verify = 'Verify: run npm -s run verify:e135 and read reports/evidence/E135/TRANSPORT_HARNESS_MATRIX.md.';
  const harness = run('node', ['scripts/verify/e135_run.mjs']);

  let reason = REASON.OK;
  let matrix = '| scenario | reason_code |\n|---|---|';
  if (harness.ec !== 0) {
    reason = REASON.FAIL_PROXY_POLICY;
  } else {
    const e135Path = path.resolve('reports/evidence/E135/TRANSPORT_HARNESS_MATRIX.md');
    if (fs.existsSync(e135Path)) {
      const rows = fs.readFileSync(e135Path, 'utf8').split('\n').filter((l) => l.startsWith('| ') && !l.includes('scenario') && !l.startsWith('|---'));
      matrix += rows.map((row) => {
        const parts = row.split('|').map((s) => s.trim()).filter(Boolean);
        return `\n| ${parts[0] || 'unknown'} | ${parts[parts.length - 1] || 'UNKNOWN'} |`;
      }).join('');
    }
  }

  const lines = [
    '# E137 OFFLINE MATRIX',
    `- reason_code: ${reason}`,
    `- verify_e135_ec: ${harness.ec}`,
    declare,
    verify,
    harness.ec !== 0 ? 'If mismatch: mark FAIL_PROXY_POLICY and stop forward progress.' : 'If mismatch: tighten wrapper parsing and rerun verify:e135.',
    '',
    '## Scenario Matrix',
    matrix,
  ];
  writeMd(path.join(E137_ROOT, 'OFFLINE_MATRIX.md'), lines.join('\n'));
  return { ec: harness.ec, reasonCode: reason };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const r = runOffline();
  process.exit(r.ec === 0 ? 0 : 1);
}
