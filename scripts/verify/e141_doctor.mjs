#!/usr/bin/env node
import fs from 'node:fs';
import { BOOT_NODE, CAPSULE_TAR, REASON, env1, nodeMajor, redactedProxy } from './e141_lib.mjs';

export function doctorState({ probe=false }={}){
  const hasCapsule = fs.existsSync(CAPSULE_TAR);
  const hasBoot = fs.existsSync(BOOT_NODE);
  const nMajor = nodeMajor();
  const onlineReady = env1('ENABLE_NET') && env1('I_UNDERSTAND_LIVE_RISK') && (env1('ONLINE_OPTIONAL') || env1('ONLINE_REQUIRED'));
  let mode='AUTHORITATIVE_READY', why=REASON.BOOTSTRAP_OK, next='NEXT_ACTION: CI=true npm run -s verify:e141';
  if(probe){ mode='PROBE_ONLY_NON_AUTHORITATIVE'; why=REASON.PROBE_ONLY_NON_AUTHORITATIVE; next='NEXT_ACTION: CI=true npm run -s verify:e141'; }
  else if(nMajor>=22||hasBoot){ mode='AUTHORITATIVE_READY'; why=REASON.BOOTSTRAP_OK; }
  else if(hasCapsule){ mode='ACQUIRE_CAPSULE_AVAILABLE'; why=REASON.NEED_NODE_CAPSULE; next='NEXT_ACTION: CI=true npm run -s verify:e141'; }
  else if(onlineReady){ mode='ACQUIRE_CAPSULE_AVAILABLE'; why=REASON.SKIP_ONLINE_FLAGS_NOT_SET; next='NEXT_ACTION: ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1 ONLINE_OPTIONAL=1 CI=true npm run -s verify:e141'; }
  else { mode='NEED_NODE_CAPSULE'; why=REASON.NEED_NODE_CAPSULE; next='NEXT_ACTION: CI=true npm run -s verify:e141 (will generate NODE_CAPSULE_REQUEST.md)'; }
  return { mode, why, next, node:process.version, hasCapsule, hasBoot, proxy:redactedProxy() };
}

export function doctorText(s){
  return [
    `MODE=${s.mode}`,
    `WHY=${s.why}`,
    `NEXT_ACTION=${s.next.replace(/^NEXT_ACTION:\s*/, '')}`,
    `NODE=${s.node}`,
    `CAPSULE_PRESENT=${s.hasCapsule}`,
    `BOOTSTRAPPED_NODE_PRESENT=${s.hasBoot}`,
    `PROXY=scheme:${s.proxy.scheme};shape_hash:${s.proxy.shape_hash}`,
  ].join('\n');
}

if(process.argv[1]===new URL(import.meta.url).pathname){
  const t=doctorText(doctorState({probe:process.argv.includes('--probe')}));
  process.stdout.write(`${t}\n`);
}
