#!/usr/bin/env node
import net from 'node:net';
import { E132_ROOT, E132_TARGETS, proxyShape, writeMdAtomic, hostHash } from './e132_lib.mjs';
import './e132_diag.mjs';

const p = proxyShape();
const targets = E132_TARGETS.map((t) => new URL(t.endpoint)).slice(0, 5);

async function connectAttempt(u) {
  const host = u.hostname;
  const port = Number(u.port || ((u.protocol === 'wss:' || u.protocol === 'https:') ? 443 : 80));
  const row = { host_hash: hostHash(host), port, connect_ok:false, rtt_ms:0, reason_code:'E_PROXY_UNSET' };
  const start = Date.now();
  if (!p.present) { row.rtt_ms = Date.now()-start; return row; }
  try {
    const proxy = new URL(process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY);
    await new Promise((resolve,reject)=>{
      const s = net.connect({ host: proxy.hostname, port: Number(proxy.port || 8080), timeout: 4000 }, () => {
        const req = `CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\nProxy-Connection: Keep-Alive\r\n\r\n`;
        s.write(req);
      });
      let buf='';
      s.on('data',(d)=>{buf += d.toString('utf8'); if (/\r\n\r\n/.test(buf)) { if (/ 200 /.test(buf)) resolve(); else reject(new Error('E_CONNECT_REJECT')); s.destroy(); }});
      s.on('timeout',()=>{s.destroy(); reject(new Error('E_TIMEOUT'));});
      s.on('error',()=>reject(new Error('E_CONNECT_FAIL')));
    });
    row.connect_ok = true;
    row.reason_code = 'E_OK';
  } catch (e) { row.reason_code = String(e.message || 'E_TIMEOUT'); }
  row.rtt_ms = Date.now()-start;
  return row;
}

const rows = [];
for (const u of targets) rows.push(await connectAttempt(u));

const doc = [
  '# E132 CONNECT PROOF',
  `- proxy_vars_present: ${p.present}`,
  `- proxy_shape_hash: ${p.hash}`,
  `- proxy_dispatcher_enabled: ${p.present}`,
  '| host_hash | port | connect_ok | rtt_ms | reason_code |',
  '|---|---:|---|---:|---|',
  ...rows.map((r) => `| ${r.host_hash} | ${r.port} | ${r.connect_ok} | ${r.rtt_ms} | ${r.reason_code} |`)
].join('\n');

if (process.env.UPDATE_E132_EVIDENCE === '1' || process.env.E132_DIAG_WRITE === '1') {
  writeMdAtomic(`${E132_ROOT}/CONNECT_PROOF.md`, doc);
} else {
  process.stdout.write(`${doc}\n`);
}
