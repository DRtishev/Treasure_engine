#!/usr/bin/env node
// E99 path invariance contract - scan E99 evidence for absolute paths
import fs from 'node:fs';
import path from 'node:path';

const E99_ROOT='reports/evidence/E99';

if(!fs.existsSync(E99_ROOT)){
  console.log('e99:path_invariance_contract SKIP (no evidence yet)');
  process.exit(0);
}

const violations=[];
const mdFiles=fs.readdirSync(E99_ROOT).filter((f)=>f.endsWith('.md'));

for(const f of mdFiles){
  const content=fs.readFileSync(path.join(E99_ROOT,f),'utf8');
  const lines=content.split('\n');

  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    // Detect absolute unix paths in pwd field
    if(/^- pwd:\s+\//.test(line)&&!line.includes('<REPO_ROOT>')){
      violations.push({file:f,line:i+1,text:line.trim()});
    }
  }
}

if(violations.length>0){
  console.error(`E99 path invariance contract FAILED: ${violations.length} violations`);
  for(const v of violations){
    console.error(`  - ${v.file}:${v.line} ${v.text}`);
  }
  process.exit(1);
}

console.log('e99:path_invariance_contract PASSED');
