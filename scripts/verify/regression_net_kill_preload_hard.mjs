import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/SAFETY');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:net-kill-preload-hard';
fs.mkdirSync(MANUAL, { recursive: true });

const preloadPath = path.join(ROOT, 'scripts', 'safety', 'net_kill_preload.cjs');
const probeScript = `
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import tls from 'node:tls';
const out = {};
function capture(name, fn) {
  try {
    fn();
    out[name] = { ok: false, code: 'NO_THROW', message: 'NO_THROW' };
  } catch (e) {
    out[name] = { ok: true, code: String(e.code || ''), message: String(e.message || '') };
  }
}
capture('fetch', ()=>fetch('https://example.com'));
capture('http.request', ()=>http.request('http://example.com'));
capture('https.request', ()=>https.request('https://example.com'));
capture('dns.lookup', ()=>dns.lookup('example.com', ()=>{}));
capture('net.connect', ()=>net.connect(443, 'example.com'));
capture('tls.connect', ()=>tls.connect(443, 'example.com'));
console.log(JSON.stringify(out));
`;

const nodeOptionsUsed = `--require ${JSON.stringify(preloadPath)}`;
const r = spawnSync(process.execPath, ['-r', preloadPath, '--input-type=module', '-e', probeScript], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, TREASURE_NET_KILL: '1', NODE_OPTIONS: nodeOptionsUsed },
});

const probes = r.status === 0 ? JSON.parse((r.stdout || '{}').trim() || '{}') : {};
const expectedMessage = 'NETWORK_DISABLED_BY_TREASURE_NET_KILL';
const expectedCode = 'NETV01';
const names = ['fetch', 'http.request', 'https.request', 'dns.lookup', 'net.connect', 'tls.connect'];
const checks = names.map((name) => {
  const p = probes[name] || {};
  const ok = Boolean(p.ok) && p.code === expectedCode && p.message === expectedMessage;
  return { name, ok, code: p.code || 'MISSING', message: p.message || 'MISSING' };
});

const allOk = checks.every((x) => x.ok);
const status = r.status === 0 && allOk ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'NETV01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_NET_KILL_PRELOAD_HARD.md'), `# REGRESSION_NET_KILL_PRELOAD_HARD.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- ec: ${r.status ?? 1}\n- preload_path: ${preloadPath}\n- node_options_used: ${nodeOptionsUsed}\n- stderr: ${(r.stderr || '').trim() || 'NONE'}\n${checks.map((c) => `- ${c.name}: ok=${c.ok} code=${c.code} message=${c.message}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_net_kill_preload_hard.json'), {
  schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  ec: r.status ?? 1, preload_path: preloadPath, node_options_used: nodeOptionsUsed, checks,
});
console.log(`[${status}] regression_net_kill_preload_hard — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
