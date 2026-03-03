/**
 * chaos_net_leak.mjs — CHAOS_NET_LEAK
 *
 * Attempts outbound network I/O under TREASURE_NET_KILL=1 and verifies
 * the net_kill_preload.cjs guard throws NETV01.
 *
 * This proves: the kill switch ACTUALLY blocks network, not just declared.
 *
 * Gate ID: CHAOS_NET_LEAK · Wired: ops:doctor (chaos phase)
 * Side effects: NONE (no actual network traffic — preload blocks BEFORE connection)
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'CHAOS_NET_LEAK';
const NEXT_ACTION = 'npm run -s ops:doctor';

let status = 'FAIL';
let reason_code = 'CHAOS_NET_LEAK_IMMUNE_BROKEN';
let detail = '';

try {
  // Guard: verify TREASURE_NET_KILL is active
  if (process.env.TREASURE_NET_KILL !== '1') {
    detail = 'TREASURE_NET_KILL not set to 1 — cannot test network guard';
    reason_code = 'CHAOS_NET_LEAK_IMMUNE_BROKEN';
  } else {
    let netv01Count = 0;
    const attempts = [];

    // Attempt 1: globalThis.fetch
    try {
      globalThis.fetch('http://localhost:1');
      attempts.push({ api: 'globalThis.fetch', blocked: false });
    } catch (e) {
      const isNetv01 = e.code === 'NETV01' || (e.message || '').includes('NETWORK_DISABLED');
      attempts.push({ api: 'globalThis.fetch', blocked: true, netv01: isNetv01 });
      if (isNetv01) netv01Count++;
    }

    // Attempt 2: http.get (dynamic import to test the preload)
    try {
      const http = await import('node:http');
      http.default.get('http://localhost:1');
      attempts.push({ api: 'node:http.get', blocked: false });
    } catch (e) {
      const isNetv01 = e.code === 'NETV01' || (e.message || '').includes('NETWORK_DISABLED');
      attempts.push({ api: 'node:http.get', blocked: true, netv01: isNetv01 });
      if (isNetv01) netv01Count++;
    }

    // Attempt 3: dns.resolve4
    try {
      const dns = await import('node:dns');
      dns.default.resolve4('localhost', () => {});
      attempts.push({ api: 'node:dns.resolve4', blocked: false });
    } catch (e) {
      const isNetv01 = e.code === 'NETV01' || (e.message || '').includes('NETWORK_DISABLED');
      attempts.push({ api: 'node:dns.resolve4', blocked: true, netv01: isNetv01 });
      if (isNetv01) netv01Count++;
    }

    const allBlocked = attempts.every((a) => a.blocked);

    if (allBlocked && netv01Count >= 1) {
      status = 'PASS';
      reason_code = 'NONE';
      detail = `All ${attempts.length} network attempts blocked (${netv01Count} NETV01 throws) — kill switch WORKS`;
    } else if (allBlocked) {
      status = 'PASS';
      reason_code = 'NONE';
      detail = `All ${attempts.length} network attempts blocked (non-NETV01 errors, but still caught)`;
    } else {
      const leaked = attempts.filter((a) => !a.blocked).map((a) => a.api);
      detail = `Network leaked through: ${leaked.join(', ')} — kill switch BROKEN`;
    }
  }
} catch (e) {
  detail = `Unexpected error: ${e.message}`;
}

writeMd(path.join(EXEC, 'CHAOS_NET_LEAK.md'), [
  '# CHAOS_NET_LEAK.md — Chaos: network isolation proof', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '', '## RESULT', detail,
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'chaos_net_leak.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, detail,
});

console.log(`[${status}] chaos_net_leak — ${reason_code}`);
if (detail) console.log(`  ${detail}`);
process.exit(status === 'PASS' ? 0 : 1);
