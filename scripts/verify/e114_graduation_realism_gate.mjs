#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { modeE114, writeMdAtomic } from './e114_lib.mjs';

const mode=modeE114();
const np=fs.readFileSync(path.resolve('reports/evidence/E114/NET_PROOF.md'),'utf8');
const live=Number((np.match(/provider_success_count:\s*(\d+)/)||[])[1]||0)>0;
let status='PASS'; const reasons=[];
if (live) {
  const cal = fs.existsSync('reports/evidence/E112/EXEC_CALIBRATION.md');
  if (!cal) { status='WARN'; reasons.push('CALIBRATION_STALE'); }
} else {
  reasons.push('OFFLINE_ONLY_PAPER_LIVE_ONLY');
}
writeMdAtomic('reports/evidence/E114/GRADUATION_REALISM_GATE.md',['# E114 GRADUATION REALISM GATE',`- mode: ${mode}`,`- live_reachable: ${live?'yes':'no'}`,`- status: ${status}`,'## Reasons',...reasons.map(r=>`- ${r}`)].join('\n'));
if (mode==='ONLINE_REQUIRED' && !live) throw new Error('E114_GRAD_REALISM_FAIL');
console.log('e114_graduation_realism_gate: done');
