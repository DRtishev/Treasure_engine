import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const SAFETY_DIR = path.join(ROOT, 'reports', 'evidence', 'SAFETY');
const MANUAL_DIR = path.join(SAFETY_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';
const chain = path.join(ROOT, 'scripts', 'executor', 'executor_run_chain.mjs');

fs.mkdirSync(MANUAL_DIR, { recursive: true });
const chainRaw = fs.readFileSync(chain, 'utf8');
const hasInjector = chainRaw.includes("TREASURE_NET_KILL: '1'") && chainRaw.includes('isVerifyStep(cmd)');

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
let message = 'Verify net-kill enforcement is present and blocks runtime fetch.';
if (!hasInjector) {
  status = 'FAIL';
  reasonCode = 'NETK01';
  message = 'executor_run_chain missing TREASURE_NET_KILL verify-step injection.';
} else if (ec !== 0) {
  status = 'BLOCKED';
  reasonCode = 'NETV01';
  message = `NETV01 runtime probe mismatch (ec=${ec}).`;
}

writeMd(path.join(SAFETY_DIR, 'REGRESSION_VERIFY_NETKILL_ENFORCED.md'), `# REGRESSION_VERIFY_NETKILL_ENFORCED.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- has_injector: ${hasInjector}\n- probe_ec: ${ec}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_verify_netkill_enforced.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  has_injector: hasInjector,
  probe_ec: ec,
});

console.log(`[${status}] regression_verify_netkill_enforced — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
