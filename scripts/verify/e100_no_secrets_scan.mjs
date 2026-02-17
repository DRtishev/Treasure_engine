#!/usr/bin/env node
// E100-5: No-secrets scan for E100 evidence
import fs from 'node:fs';
import path from 'node:path';

const E100_ROOT='reports/evidence/E100';

if(!fs.existsSync(E100_ROOT)){
  console.log('e100:no_secrets_scan SKIP (no evidence yet)');
  process.exit(0);
}

const patterns=[
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /-----BEGIN (RSA |DSA )?PRIVATE KEY-----/,
  /sk-[a-zA-Z0-9]{48}/
];

const violations=[];
const mdFiles=fs.readdirSync(E100_ROOT).filter((f)=>f.endsWith('.md'));

for(const f of mdFiles){
  const content=fs.readFileSync(path.join(E100_ROOT,f),'utf8');
  const lines=content.split('\n');

  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    // Skip git status output
    if(/^[?]{2}\s+/.test(line)||/^\s*[MAD]\s+/.test(line)) continue;
    // Skip self-references to security checks
    if(/no_secrets|no-secrets|_scan\.mjs|security_check/i.test(line)) continue;

    for(const pat of patterns){
      if(pat.test(line)){
        violations.push({file:f,line:i+1,pattern:pat.source,text:line.trim().slice(0,80)});
      }
    }
  }
}

if(violations.length>0){
  console.error(`E100 no-secrets scan FAILED: ${violations.length} potential secrets`);
  for(const v of violations){
    console.error(`  - ${v.file}:${v.line} [${v.pattern}]`);
  }
  process.exit(1);
}

console.log('e100:no_secrets_scan PASSED');
