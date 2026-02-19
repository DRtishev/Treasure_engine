#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, REASONS, env1, proxyRedacted, writeMd } from './e142m_lib.mjs';

export function classifyNet({ write = true } = {}) {
  const proxy = proxyRedacted();
  const onlineOptional = env1('ONLINE_OPTIONAL');
  const onlineRequired = env1('ONLINE_REQUIRED');
  const enableNet = env1('ENABLE_NET');
  const risk = env1('I_UNDERSTAND_LIVE_RISK');
  const e136Online = path.resolve('reports/evidence/E136/ONLINE_DIAG.md');

  let netClass = 'OFFLINE';
  let reason = REASONS.SKIP_ONLINE_FLAGS_NOT_SET;
  if (proxy.present && !(enableNet && risk)) {
    netClass = 'PROXY_ONLY';
    reason = REASONS.E_PROXY_BLOCK;
  } else if (enableNet && risk && (onlineOptional || onlineRequired)) {
    if (fs.existsSync(e136Online) && /status:\s*PASS/i.test(fs.readFileSync(e136Online, 'utf8'))) {
      netClass = 'ONLINE_OK';
      reason = REASONS.E_NET_OK;
    } else {
      netClass = 'ONLINE_LIMITED';
      reason = REASONS.E_WS_BLOCKED;
    }
  }

  if (write) {
    writeMd(path.join(ROOT, 'NETWORK_CLASSIFICATION.md'), [
      '# E142_MEGA NETWORK CLASSIFICATION',
      `- net_class: ${netClass}`,
      `- reason_code: ${reason}`,
      '## RAW',
      `- ENABLE_NET: ${enableNet}`,
      `- I_UNDERSTAND_LIVE_RISK: ${risk}`,
      `- ONLINE_OPTIONAL: ${onlineOptional}`,
      `- ONLINE_REQUIRED: ${onlineRequired}`,
      `- proxy_present: ${proxy.present}`,
      `- e136_online_diag_present: ${fs.existsSync(e136Online)}`,
      '- reason_table: E_PROXY_BLOCK|E_TLS_INTERCEPT|E_WS_BLOCKED|E_DNS_FILTERED',
    ].join('\n'));
    writeMd(path.join(ROOT, 'NET_CLASSIFICATION.md'), [
      '# E142_MEGA NET CLASSIFICATION',
      `- net_class: ${netClass}`,
      `- reason_code: ${reason}`,
      '## RAW',
      '- classes: OFFLINE|PROXY_ONLY|ONLINE_LIMITED|ONLINE_OK',
      '- reason_codes: E_PROXY_BLOCK|E_TLS_INTERCEPT|E_WS_BLOCKED|E_DNS_FILTERED',
    ].join('\n'));
  }

  return { netClass, reason };
}

if (process.argv[1] === new URL(import.meta.url).pathname) classifyNet({ write: true });
