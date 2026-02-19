#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { BOOT_DIR, BOOT_NODE, CAPSULE_TAR, E141_ROOT, REASON, run, writeMd } from './e141_lib.mjs';

export function runBootstrap({probe=false}={}){
  if(fs.existsSync(BOOT_NODE)){
    const chk=run(BOOT_NODE,['-v']);
    if(chk.ec===0){ writeMd(path.join(E141_ROOT,'NODE_BOOTSTRAP.md'),'# E141 NODE BOOTSTRAP\n- status: PASS\n- reason_code: BOOTSTRAP_OK\n- node_bin: '+BOOT_NODE+'\n## RAW\n- node_v: '+chk.out); return {ec:0,node:BOOT_NODE,reason:REASON.BOOTSTRAP_OK}; }
  }
  if(!fs.existsSync(CAPSULE_TAR)){
    writeMd(path.join(E141_ROOT,'NODE_BOOTSTRAP.md'),'# E141 NODE BOOTSTRAP\n- status: BLOCKED\n- reason_code: NEED_NODE_CAPSULE\n- node_bin: NA\n## RAW\n- detail: capsule missing');
    return {ec:probe?0:1,node:'',reason:REASON.NEED_NODE_CAPSULE};
  }
  fs.mkdirSync(BOOT_DIR,{recursive:true});
  const untar=run('tar',['-xJf',CAPSULE_TAR,'--strip-components=1','-C',BOOT_DIR]);
  const chk=run(BOOT_NODE,['-v']);
  const ok=untar.ec===0&&chk.ec===0;
  writeMd(path.join(E141_ROOT,'NODE_BOOTSTRAP.md'),['# E141 NODE BOOTSTRAP',`- status: ${ok?'PASS':'FAIL'}`,`- reason_code: ${ok?'BOOTSTRAP_OK':'FAIL_NODE_POLICY'}`,`- node_bin: ${ok?BOOT_NODE:'NA'}`,'## RAW',`- untar_ec: ${untar.ec}`,`- node_check_ec: ${chk.ec}`,`- node_v: ${chk.out||'NA'}`].join('\n'));
  return {ec:ok?0:(probe?0:1), node: ok?BOOT_NODE:'', reason: ok?REASON.BOOTSTRAP_OK:REASON.FAIL_NODE_POLICY};
}
if(process.argv[1]===new URL(import.meta.url).pathname) process.exit(runBootstrap({probe:process.argv.includes('--probe')}).ec);
