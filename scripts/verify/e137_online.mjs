#!/usr/bin/env node
import path from 'node:path';
import { E137_ROOT, REASON, envFlag, run, writeMd } from './e137_lib.mjs';

export function runOnline() {
  const enabled = envFlag('ENABLE_NET') && envFlag('I_UNDERSTAND_LIVE_RISK') && (envFlag('ONLINE_OPTIONAL') || envFlag('ONLINE_REQUIRED'));
  const required = envFlag('ONLINE_REQUIRED');
  if (!enabled) {
    const reason = REASON.SKIP_ONLINE_FLAGS_NOT_SET;
    writeMd(path.join(E137_ROOT, 'ONLINE_MATRIX.md'), [
      '# E137 ONLINE MATRIX',
      '- status: SKIPPED',
      `- reason_code: ${reason}`,
      'Declare: online diagnostics are opt-in only.',
      'Verify: checked ENABLE_NET/I_UNDERSTAND_LIVE_RISK/ONLINE_OPTIONAL|ONLINE_REQUIRED flags.',
      'If mismatch: set required flags and rerun verify:e137:online.',
    ].join('\n'));
    process.stderr.write(`${reason}\n`);
    return { ec: 1, reasonCode: reason };
  }

  const diag = run('node', ['scripts/verify/e136_online_diag.mjs'], { env: process.env });
  const reason = diag.ec === 0 ? REASON.OK : REASON.FAIL_HTTP_EGRESS;
  writeMd(path.join(E137_ROOT, 'ONLINE_MATRIX.md'), [
    '# E137 ONLINE MATRIX',
    `- status: ${diag.ec === 0 ? 'PASS' : (required ? 'FAIL' : 'WARN')}`,
    `- reason_code: ${reason}`,
    `- e136_online_ec: ${diag.ec}`,
    'Declare: online diagnostic wraps E136 allowlisted probes.',
    'Verify: executed node scripts/verify/e136_online_diag.mjs.',
    'If mismatch: inspect E136 ONLINE_DIAG and network policy flags.',
  ].join('\n'));
  return { ec: required ? diag.ec : 0, reasonCode: reason };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const r = runOnline();
  process.exit(r.ec);
}
