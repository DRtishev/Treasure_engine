#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

if(process.env.CI==='true') throw new Error('operator cadence runner forbidden in CI');
for(const k of ['ENABLE_DEMO_ADAPTER','ALLOW_MANUAL_RECON','UPDATE_E83_EVIDENCE']) if(process.env[k]!=='1') throw new Error(`${k}=1 required`);
const env={...process.env,QUIET:String(process.env.QUIET||'1')};
function run(cmd){const r=spawnSync(cmd[0],cmd.slice(1),{stdio:'inherit',env});if((r.status??1)!==0) throw new Error(`cadence failed at ${cmd.join(' ')}`);}
run(['node','scripts/verify/e83_exec_recon_demo_daily.mjs']);
run(['node','scripts/verify/e83_readiness_tracker.mjs']);
run(['node','scripts/verify/e83_threshold_court.mjs']);
console.log('verify:e83:cadence:runner PASSED');
