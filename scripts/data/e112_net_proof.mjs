#!/usr/bin/env node
import dns from 'node:dns/promises';
import { sha256Text } from '../verify/e66_lib.mjs';
import { E112_ROOT, assertNetGuard, modeState, writeMdAtomic } from '../verify/e112_lib.mjs';

const mode = modeState();
const forcedDown = process.env.FORCE_NET_DOWN === '1';
if (mode !== 'OFFLINE_ONLY') assertNetGuard();

async function check(name, fn) {
  try {
    if (forcedDown) throw new Error('FORCED_ENETUNREACH');
    await fn();
    return { name, pass: true, detail: 'OK' };
  } catch (e) {
    return { name, pass: false, detail: String(e.message || e) };
  }
}

const checks = [
  await check('dns_resolve_api_bybit_com', async () => { await dns.lookup('api.bybit.com'); }),
  await check('https_get_bybit_time', async () => {
    const r = await fetch('https://api.bybit.com/v5/market/time');
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
    const j = await r.json();
    if (!j?.result?.timeSecond) throw new Error('BAD_TIME_PAYLOAD');
  }),
  await check('https_get_httpbin', async () => {
    const r = await fetch('https://httpbin.org/get');
    if (!r.ok) throw new Error(`HTTP_${r.status}`);
  })
];

const passed = checks.filter(c => c.pass).length;
const status = passed === 3 ? 'PASS' : 'FAIL';
const body = [
  '# E112 NET PROOF',
  `- mode: ${mode}`,
  `- force_net_down: ${forcedDown ? '1' : '0'}`,
  `- checks_passed: ${passed}/3`,
  `- status: ${status}`,
  '## Checks',
  ...checks.map(c => `- ${c.name}: ${c.pass ? 'PASS' : 'FAIL'} (${c.detail})`)
].join('\n');
const netProofHash = sha256Text(`${body}\n`);
writeMdAtomic(`${E112_ROOT}/NET_PROOF.md`, `${body}\n- net_proof_sha256: ${netProofHash}`);

if (mode === 'ONLINE_REQUIRED' && status !== 'PASS') {
  throw new Error('E112_NET_PROOF_REQUIRED_FAIL');
}
console.log(`e112_net_proof: ${status} ${passed}/3`);
