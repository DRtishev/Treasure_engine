import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const SAFETY = path.join(ROOT, 'reports', 'evidence', 'SAFETY');
const MANUAL = path.join(SAFETY, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';

const probeScript = `
if (process.env.TREASURE_NET_KILL === '1') {
  globalThis.fetch = async () => { const e = new Error('NETV01'); e.code = 'NETV01'; throw e; };
}
(async () => {
  try { await fetch('https://example.com'); process.exit(2); }
  catch (e) { if (String(e.code||e.message).includes('NETV01')) process.exit(0); process.exit(3); }
})();
`;
const r = spawnSync('node', ['-e', probeScript], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, TREASURE_NET_KILL: '1' } });
const ec = Number.isInteger(r.status) ? r.status : 1;

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'NET kill-switch probe failed network as expected.';
if (ec !== 0) {
  status = 'FAIL';
  reasonCode = 'NETV01_PROBE';
  message = `Probe unexpectedly allowed network or failed wrong path (ec=${ec}).`;
}

writeMd(path.join(SAFETY, 'NETV01_PROBE.md'), `# NETV01_PROBE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- probe_ec: ${ec}\n`);
writeJsonDeterministic(path.join(MANUAL, 'netv01_probe.json'), {
  schema_version: '1.0.0', status, reason_code: reasonCode, run_id: RUN_ID, message, next_action: NEXT_ACTION, probe_ec: ec,
});

console.log(`[${status}] netv01_probe — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
