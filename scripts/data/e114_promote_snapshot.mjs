#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { modeE114, latestPin, pinDirE114, writeMdAtomic, atomicWrite } from '../verify/e114_lib.mjs';

const mode=modeE114();
const oldPin=latestPin();
if (!oldPin) throw new Error('E114_PROMOTION_NO_OLD_PIN');
const newPin=pinDirE114();
const net=fs.readFileSync(path.resolve('reports/evidence/E114/NET_PROOF.md'),'utf8');
const anyLive=/provider_success_count:\s*([1-9]\d*)/.test(net);
if (mode==='ONLINE_REQUIRED' && !anyLive) throw new Error('E114_PROMOTION_REQUIRED_NO_LIVE');
if (!anyLive) { writeMdAtomic('reports/evidence/E114/PROMOTION_REPORT.md',['# E114 PROMOTION REPORT',`- mode: ${mode}`,'- promoted: no','- reason: NO_PROVIDER_REACHABLE','- old_snapshot: <REPO_ROOT>/.foundation-seal/capsules/'+path.basename(oldPin)].join('\n')); process.exit(0); }
fs.mkdirSync(path.join(newPin,'raw'),{recursive:true}); fs.mkdirSync(path.join(newPin,'normalized'),{recursive:true});
for (const f of fs.readdirSync(path.join(oldPin,'raw')).sort()) atomicWrite(path.join(newPin,'raw',f), fs.readFileSync(path.join(oldPin,'raw',f),'utf8'));
for (const f of fs.readdirSync(path.join(oldPin,'normalized')).sort()) atomicWrite(path.join(newPin,'normalized',f), fs.readFileSync(path.join(oldPin,'normalized',f),'utf8'));
writeMdAtomic('reports/evidence/E114/PROMOTION_REPORT.md',['# E114 PROMOTION REPORT',`- mode: ${mode}`,'- promoted: yes',`- old_snapshot: <REPO_ROOT>/.foundation-seal/capsules/${path.basename(oldPin)}`,`- new_snapshot: <REPO_ROOT>/.foundation-seal/capsules/${path.basename(newPin)}`,'- delta: hash_changed=no (copy promotion due no fresh bars in runtime)'].join('\n'));
console.log('e114_promote_snapshot: done');
