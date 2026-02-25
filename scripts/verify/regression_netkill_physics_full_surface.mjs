import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:netkill-physics-full-surface';
const preload = path.join(ROOT, 'scripts/safety/net_kill_preload.cjs');
const probe = `const dns=require('node:dns');const net=require('node:net');const tls=require('node:tls');let u=null;try{u=require('undici')}catch{};const checks=[];function a(name,fn){try{fn();checks.push({name,ok:false,msg:'NO_THROW'})}catch(e){checks.push({name,ok:e&&e.code==='NETV01'&&String(e.message||'').includes('NETWORK_DISABLED_BY_TREASURE_NET_KILL'),code:e&&e.code,msg:String(e&&e.message||'')})}};a('dns.resolve4',()=>dns.resolve4('example.com',()=>{}));a('dns.resolve6',()=>dns.resolve6('example.com',()=>{}));a('net.connect',()=>net.connect(80,'example.com'));a('tls.connect',()=>tls.connect(443,'example.com'));if(u&&u.request)a('undici.request',()=>u.request('https://example.com'));if(u&&u.stream)a('undici.stream',()=>u.stream('https://example.com',{},()=>{}));const bad=checks.filter(c=>!c.ok);console.log(JSON.stringify({checks,bad_n:bad.length}));process.exit(bad.length?1:0);`;
const cmd = `TREASURE_NET_KILL=1 node -r ${JSON.stringify(preload)} -e ${JSON.stringify(probe)}`;
const run = runBounded(cmd, { cwd: ROOT, env: process.env, maxBuffer: 8 * 1024 * 1024, timeoutMs: 15000 });
const status = run.ec === 0 ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'RG_NETP01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_NETKILL_PHYSICS_FULL_SURFACE.md'), `# REGRESSION_NETKILL_PHYSICS_FULL_SURFACE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- ec: ${run.ec}\n\n\`\`\`\n${(run.stdout + run.stderr).trim() || '(no output)'}\n\`\`\`\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_netkill_physics_full_surface.json'), { schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, ec: run.ec, output: (run.stdout + run.stderr).trim() });
console.log(`[${status}] regression_netkill_physics_full_surface — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
