import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence', `EPOCH-VICTORY-${RUN_ID}`);
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
fs.mkdirSync(MANUAL, { recursive: true });

const runChain = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_run_chain.mjs'), 'utf8');
const preloadAbs = path.join(ROOT, 'scripts', 'safety', 'net_kill_preload.cjs');
const staticChecks = {
  force_flag: runChain.includes('runShell(cmd, isVerifyStep(cmd))'),
  net_kill_env: runChain.includes("TREASURE_NET_KILL: '1'"),
  preload_abs: runChain.includes("path.join(ROOT, 'scripts', 'safety', 'net_kill_preload.cjs')"),
  node_options_injected: runChain.includes('NODE_OPTIONS: nodeOptions') && runChain.includes('buildNetKillNodeOptions(process.env.NODE_OPTIONS)'),
};

const probe = `
import http from 'node:http';
const out = {};
try{ fetch('https://example.com'); out.fetch='NO_THROW'; }catch(e){ out.fetch=String(e.code||'')+'|'+String(e.message||''); }
try{ http.request('http://example.com'); out.http='NO_THROW'; }catch(e){ out.http=String(e.code||'')+'|'+String(e.message||''); }
console.log(JSON.stringify(out));
`;
const r = spawnSync(process.execPath, ['-r', preloadAbs, '--input-type=module', '-e', probe], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, TREASURE_NET_KILL: '1', NODE_OPTIONS: `--require ${JSON.stringify(preloadAbs)}` },
});
const out = r.status === 0 ? JSON.parse((r.stdout || '{}').trim() || '{}') : {};
const runtime_ok = out.fetch === 'NETV01|NETWORK_DISABLED_BY_TREASURE_NET_KILL' && out.http === 'NETV01|NETWORK_DISABLED_BY_TREASURE_NET_KILL';

const status = Object.values(staticChecks).every(Boolean) && runtime_ok && r.status === 0 ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'RG_NET01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_EXECUTOR_NETKILL_RUNTIME_LEDGER.md'), `# REGRESSION_EXECUTOR_NETKILL_RUNTIME_LEDGER.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- preload_abs_path: ${preloadAbs}\n- probe_ec: ${r.status ?? 1}\n- probe_fetch: ${out.fetch || 'MISSING'}\n- probe_http: ${out.http || 'MISSING'}\n${Object.entries(staticChecks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_executor_netkill_runtime_ledger.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, preload_abs_path:preloadAbs, probe_ec:r.status ?? 1, probe:out, static_checks:staticChecks });
console.log(`[${status}] regression_executor_netkill_runtime_ledger — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
