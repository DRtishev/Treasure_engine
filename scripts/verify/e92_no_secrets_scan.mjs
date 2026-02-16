#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('reports/evidence/E92');
const pats=[/AKIA[0-9A-Z]{16}/,/sk_[A-Za-z0-9]{20,}/,/-----BEGIN/,/api[_-]?key\s*[:=]/i,/secret\s*[:=]/i,/token\s*[:=]/i];
for(const f of fs.readdirSync(root).filter((x)=>x.endsWith('.md'))){const text=fs.readFileSync(path.join(root,f),'utf8');if(pats.some((p)=>p.test(text))) throw new Error(`NO_SECRETS_GUARD_FAIL ${f}`);} 
console.log('verify:e92:no-secrets PASSED');
