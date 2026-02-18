#!/usr/bin/env node
import fs from 'node:fs';
const files=fs.readdirSync('reports/evidence/E123').filter(f=>f.endsWith('.md'));
const pats=[/api[_-]?key\s*[:=]\s*[A-Za-z0-9]/i,/\bsecret\b\s*[:=]\s*[A-Za-z0-9]/i,/hmac\s*[:=]\s*[A-Za-z0-9]/i,/bearer\s+[a-z0-9._-]+/i,/private[_-]?key\s*[:=]\s*[A-Za-z0-9]/i,/x-bapi/i];
for(const f of files){const t=fs.readFileSync(`reports/evidence/E123/${f}`,'utf8'); for(const p of pats) if(p.test(t)) throw new Error(`E123_REDACTION_FAIL:${f}`);} 
