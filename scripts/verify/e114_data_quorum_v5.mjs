#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { modeE114, runDirE114, writeMdAtomic } from './e114_lib.mjs';

const mode=modeE114(); const minBars=Number(process.env.E114_MIN_BARS||5000); const minSymbols=Number(process.env.E114_MIN_SYMBOLS||2); const maxFresh=Number(process.env.E114_FRESHNESS_WINDOW_MS||86400000);
const dir=path.join(runDirE114(),'normalized');
const files=fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.jsonl')).sort():[];
const reasons=[]; if(files.length<minSymbols) reasons.push('MULTI_SYMBOL_LT_MIN');
let attempted=0, success=0; const np=fs.readFileSync(path.resolve('reports/evidence/E114/NET_PROOF.md'),'utf8');
attempted=Number((np.match(/endpoint_attempts:\s*(\d+)/)||[])[1]||0); success=Number((np.match(/provider_success_count:\s*(\d+)/)||[])[1]||0);
for(const f of files){ const rows=fs.readFileSync(path.join(dir,f),'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x)); if(rows.length<minBars) reasons.push(`${f}:BARS_LT_MIN`); if(!rows.every((r,i)=>i===0||r.ts>rows[i-1].ts)) reasons.push(`${f}:NON_MONO`); const fresh=Date.now()-rows[rows.length-1].ts; if(mode==='ONLINE_REQUIRED' && fresh>maxFresh) reasons.push(`${f}:FRESHNESS_STRICT_FAIL`); }
if (mode==='ONLINE_REQUIRED' && !(attempted>=2 && success>=1)) reasons.push('PROVIDER_DIVERSITY_FAIL');
const pass = reasons.length===0;
writeMdAtomic('reports/evidence/E114/DATA_QUORUM_V5.md',['# E114 DATA QUORUM V5',`- mode: ${mode}`,`- symbols_checked: ${files.length}`,`- endpoint_attempts: ${attempted}`,`- provider_success_count: ${success}`,`- status: ${pass?'PASS':'FAIL'}`,'## Reasons',...(reasons.length?reasons.map(r=>`- ${r}`):['- NONE'])].join('\n'));
if(!pass) throw new Error('E114_QUORUM_V5_FAIL');
console.log('e114_data_quorum_v5: PASS');
