import crypto from 'node:crypto';
import path from 'node:path';
import { runBounded } from './spawn_bounded.mjs';

const ROOT = path.resolve(process.cwd());
const PRELOAD = path.join(ROOT, 'scripts', 'safety', 'net_kill_preload.cjs');
const PROBE_SOURCE = "const https=require('node:https'); try{https.request('https://example.com'); console.log('PROBE_UNEXPECTED_ALLOW'); process.exit(0);}catch(e){console.log('PROBE_ERR_CODE='+(e&&e.code?e.code:'UNKNOWN')); process.exit((e&&e.code==='NETV01')?0:1);}";

export function runNetkillRuntimeProbe() {
  const signature = crypto.createHash('sha256').update(PROBE_SOURCE).digest('hex');
  const cmd = `TREASURE_NET_KILL=1 node -r ${JSON.stringify(PRELOAD)} -e ${JSON.stringify(PROBE_SOURCE)}`;
  const r = runBounded(cmd, { cwd: ROOT, env: process.env, timeoutMs: 6000, maxBuffer: 2 * 1024 * 1024 });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const sawNetv01 = /PROBE_ERR_CODE=NETV01/.test(out) || /NETV01/.test(out);
  if (r.ec === 0 && sawNetv01) return { status: 'PASS', error_code: 'NONE', signature_sha256: signature, cmd };
  const errorCodeMatch = out.match(/PROBE_ERR_CODE=([A-Z0-9_]+)/);
  return { status: 'FAIL', error_code: errorCodeMatch ? errorCodeMatch[1] : `EC_${r.ec}`, signature_sha256: signature, cmd };
}
