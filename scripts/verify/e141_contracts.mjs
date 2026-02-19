#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E141_ROOT, writeMd } from './e141_lib.mjs';

const req=['SNAPSHOT.md','DOCTOR_OUTPUT.md','NODE_CAPSULE_SPEC.md','NODE_CAPSULE_REQUEST.md','NODE_ACQUIRE.md','NODE_BOOTSTRAP.md','EXEC_BRIDGE.md','GATE_RUN.md','CONTRACTS.md','SEAL_X2.md','VERDICT.md','SHA256SUMS.md'];
const rawRequired = new Set(['SNAPSHOT.md','DOCTOR_OUTPUT.md','NODE_CAPSULE_SPEC.md','NODE_CAPSULE_REQUEST.md','NODE_ACQUIRE.md','NODE_BOOTSTRAP.md','EXEC_BRIDGE.md','GATE_RUN.md','CONTRACTS.md','SEAL_X2.md','VERDICT.md']);
const TOK=/(?:Bearer|token|api_key|apikey|password|secret|Authorization)\s*[=:]\s*\S+/i;
const RAW_PROXY=/https?:\/\/[a-zA-Z0-9._-]+:[0-9]{2,5}/;
export function runContracts(){
  const files=fs.existsSync(E141_ROOT)?fs.readdirSync(E141_ROOT):[]; let md=true, head=true, red=true; const det=[];
  for(const f of files){ if(!f.endsWith('.md')){md=false;det.push(`non_md:${f}`);} }
  for(const f of req){ const p=path.join(E141_ROOT,f); if(!fs.existsSync(p)){ head=false; det.push(`missing:${f}`); continue; } const c=fs.readFileSync(p,'utf8'); if(!c.startsWith(`# E141 `)){ head=false; det.push(`header:${f}`);} if(rawRequired.has(f) && !c.includes('## RAW')){ head=false; det.push(`raw:${f}`);} if(TOK.test(c)||RAW_PROXY.test(c)){ red=false; det.push(`redaction:${f}`);} }
  const pass=md&&head&&red;
  writeMd(path.join(E141_ROOT,'CONTRACTS.md'),['# E141 CONTRACTS',`- status: ${pass?'PASS':'FAIL'}`,`- md_only: ${md?'PASS':'FAIL'}`,`- redaction: ${red?'PASS':'FAIL'}`,`- header_exactness: ${head?'PASS':'FAIL'}`,'## RAW',...det.map(d=>`- ${d}`)].join('\n'));
  return {ec:pass?0:1};
}
if(process.argv[1]===new URL(import.meta.url).pathname) process.exit(runContracts().ec);
