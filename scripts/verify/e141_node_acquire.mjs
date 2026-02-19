#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { CAPSULE_DIR, CAPSULE_SHA, CAPSULE_TAR, E141_ROOT, OFFICIAL_SHASUMS_URL, OFFICIAL_TAR_URL, PINNED_SHA, REASON, env1, run, sha256File, writeMd } from './e141_lib.mjs';

export function runAcquire(){
  fs.mkdirSync(CAPSULE_DIR,{recursive:true});
  const flagsOk = env1('ENABLE_NET')&&env1('I_UNDERSTAND_LIVE_RISK')&&(env1('ONLINE_OPTIONAL')||env1('ONLINE_REQUIRED'));
  if(fs.existsSync(CAPSULE_TAR)&&fs.existsSync(CAPSULE_SHA)){
    writeMd(path.join(E141_ROOT,'NODE_ACQUIRE.md'),'# E141 NODE ACQUIRE\n- status: SKIPPED\n- reason_code: ACQUIRE_OK\n## RAW\n- detail: capsule already present');
    return {ec:0, reason:REASON.ACQUIRE_OK};
  }
  if(!flagsOk){
    writeMd(path.join(E141_ROOT,'NODE_ACQUIRE.md'),'# E141 NODE ACQUIRE\n- status: SKIPPED\n- reason_code: SKIP_ONLINE_FLAGS_NOT_SET\n## RAW\n- required_flags: ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1 ONLINE_OPTIONAL=1|ONLINE_REQUIRED=1');
    return {ec:1, reason:REASON.SKIP_ONLINE_FLAGS_NOT_SET};
  }
  const sh = run('curl',['-fsSL',OFFICIAL_SHASUMS_URL]);
  if(sh.ec!==0){ writeMd(path.join(E141_ROOT,'NODE_ACQUIRE.md'),'# E141 NODE ACQUIRE\n- status: FAIL\n- reason_code: NEED_NODE_CAPSULE\n## RAW\n- step: fetch_shasums_failed'); return {ec:1,reason:REASON.NEED_NODE_CAPSULE}; }
  const row = sh.out.split(/\r?\n/).find((l)=>l.includes(path.basename(CAPSULE_TAR)))||'';
  const expected = row.split(/\s+/)[0]||'';
  if(expected!==PINNED_SHA){ writeMd(path.join(E141_ROOT,'NODE_ACQUIRE.md'),'# E141 NODE ACQUIRE\n- status: FAIL\n- reason_code: NEED_NODE_CAPSULE\n## RAW\n- step: shasums_mismatch'); return {ec:1,reason:REASON.NEED_NODE_CAPSULE}; }
  const dl = run('curl',['-fsSL',OFFICIAL_TAR_URL,'-o',CAPSULE_TAR]);
  const actual = fs.existsSync(CAPSULE_TAR)?sha256File(CAPSULE_TAR):'';
  const ok = dl.ec===0 && actual===expected;
  if(ok){ fs.writeFileSync(CAPSULE_SHA,`${expected}  ${path.basename(CAPSULE_TAR)}\n`,'utf8'); }
  writeMd(path.join(E141_ROOT,'NODE_ACQUIRE.md'),[
    '# E141 NODE ACQUIRE',
    `- status: ${ok?'PASS':'FAIL'}`,
    `- reason_code: ${ok?REASON.ACQUIRE_OK:REASON.NEED_NODE_CAPSULE}`,
    `- capsule_path: ${CAPSULE_TAR}`,
    `- expected_sha256: ${expected||'NA'}`,
    `- actual_sha256: ${actual||'NA'}`,
    '## RAW',
    `- fetch_shasums_ec: ${sh.ec}`,
    `- download_ec: ${dl.ec}`,
  ].join('\n'));
  return {ec:ok?0:1, reason: ok?REASON.ACQUIRE_OK:REASON.NEED_NODE_CAPSULE};
}
if(process.argv[1]===new URL(import.meta.url).pathname) process.exit(runAcquire().ec);
