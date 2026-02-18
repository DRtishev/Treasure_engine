#!/usr/bin/env node
import { isCITruthy } from './e120_lib.mjs';
if (!isCITruthy()) process.exit(0);
for (const [k, vRaw] of Object.entries(process.env)) {
  const v = String(vRaw || '').trim();
  if (!v) continue;
  if (k.startsWith('UPDATE_') || k === 'ENABLE_NET' || k.startsWith('ONLINE_') || k.startsWith('LIVE_') || k === 'ENABLE_LIVE_ORDERS' || k.startsWith('WS_') || k === 'I_UNDERSTAND_LIVE_RISK') throw new Error(`E120_CI_FORBIDDEN_ENV:${k}`);
}
