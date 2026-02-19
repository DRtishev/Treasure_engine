#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, REASONS, env1, writeMd } from './e142m_lib.mjs';

export function classifyNet({write = true} = {}) {
  const onlineFlags = env1('ENABLE_NET') && env1('I_UNDERSTAND_LIVE_RISK') && (env1('ONLINE_OPTIONAL') || env1('ONLINE_REQUIRED'));
  const e136Online = path.resolve('reports/evidence/E136/ONLINE_DIAG.md');
  const e135Matrix = path.resolve('reports/evidence/E135/TRANSPORT_HARNESS_MATRIX.md');

  let netClass = 'OFFLINE_HARNESS_READY';
  let reason = REASONS.OK;
  if (!onlineFlags) {
    netClass = 'ONLINE_SKIPPED_FLAGS';
    reason = REASONS.SKIP_ONLINE_FLAGS_NOT_SET;
  } else if (fs.existsSync(e136Online) && /status:\s*PASS/i.test(fs.readFileSync(e136Online, 'utf8'))) {
    netClass = 'ONLINE_DIAG_PASS';
    reason = REASONS.OK;
  } else if (onlineFlags) {
    netClass = 'ONLINE_DIAG_UNKNOWN';
    reason = REASONS.OK;
  }

  const lines = [
    '# E142_MEGA NETWORK CLASSIFICATION',
    `- net_class: ${netClass}`,
    `- reason_code: ${reason}`,
    '## RAW',
    `- has_e135_matrix: ${fs.existsSync(e135Matrix)}`,
    `- has_e136_online_diag: ${fs.existsSync(e136Online)}`,
    `- online_flags: ${onlineFlags}`,
  ];
  if (write) writeMd(path.join(ROOT, 'NETWORK_CLASSIFICATION.md'), lines.join('\n'));
  return { netClass, reason };
}

if (process.argv[1] === new URL(import.meta.url).pathname) classifyNet({write:true});
