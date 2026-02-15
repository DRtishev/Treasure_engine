#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function run(quiet){
  const r=spawnSync('node',['scripts/verify/e79_recon_observed_multi.mjs'],{encoding:'utf8',env:{...process.env,QUIET:String(quiet),CI:'false'}});
  if((r.status??1)!==0) throw new Error('recon smoke failed');
  const m=(r.stdout.match(/recon_fingerprint=([a-f0-9]{64})/)||[])[1]||'';
  if(!m) throw new Error('missing fingerprint output');
  return {out:r.stdout,fp:m};
}

const a=run(0),b=run(1);
if(a.fp!==b.fp) throw new Error('QUIET fingerprint mismatch');
console.log(`verify:quiet:smoke PASSED fingerprint=${a.fp}`);
