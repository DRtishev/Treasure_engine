import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/SAFETY');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:net-kill-preload-path-safe';
fs.mkdirSync(MANUAL, { recursive: true });

const preloadPath = path.join(ROOT, 'scripts', 'safety', 'net_kill_preload.cjs');
const workdir = path.join(ROOT, 'scripts', 'verify');
const probe = "try{fetch('https://example.com')}catch(e){console.log(String(e.code||'')+'|'+String(e.message||''))}";
const r = spawnSync(process.execPath, ['-r', preloadPath, '--input-type=module', '-e', probe], {
  cwd: workdir,
  encoding: 'utf8',
  env: { ...process.env, TREASURE_NET_KILL: '1' },
});
const out = (r.stdout || '').trim();
const ok = r.status === 0 && out === 'NETV01|NETWORK_DISABLED_BY_TREASURE_NET_KILL';
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'NETV01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_NET_KILL_PRELOAD_PATH_SAFE.md'), `# REGRESSION_NET_KILL_PRELOAD_PATH_SAFE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- ec: ${r.status ?? 1}\n- cwd: ${workdir}\n- preload_path: ${preloadPath}\n- stdout: ${out || 'EMPTY'}\n- stderr: ${(r.stderr || '').trim() || 'NONE'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_net_kill_preload_path_safe.json'), {
  schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  ec: r.status ?? 1, cwd: workdir, preload_path: preloadPath, stdout: out, stderr: (r.stderr || '').trim(),
});
console.log(`[${status}] regression_net_kill_preload_path_safe — ${reason_code}`);
process.exit(ok ? 0 : 1);
