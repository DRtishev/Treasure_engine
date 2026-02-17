#!/usr/bin/env node
// E100-4: Path invariance contract - scan E97..E100 evidence for absolute paths
import fs from 'node:fs';
import path from 'node:path';

const epochs=['E97','E98','E99','E100'];
const violations=[];

for(const epoch of epochs){
  const epochRoot=`reports/evidence/${epoch}`;
  if(!fs.existsSync(epochRoot)) continue;

  const mdFiles=fs.readdirSync(epochRoot).filter((f)=>f.endsWith('.md'));

  for(const f of mdFiles){
    const content=fs.readFileSync(path.join(epochRoot,f),'utf8');
    const lines=content.split('\n');

    for(let i=0;i<lines.length;i++){
      const line=lines[i];

      // Skip git status output (starts with ?? or M/A/D)
      if(/^[?]{2}\s+/.test(line)||/^\s*[MAD]\s+/.test(line)) continue;
      // Skip script/file references in git status
      if(line.includes('scripts/verify/')||line.includes('reports/evidence/')) continue;

      // Detect absolute paths
      const absPathPatterns=[
        /^-\s+pwd:\s+\/(?!.*<REPO_ROOT>)/, // pwd with absolute path (but not <REPO_ROOT>)
        /\/workspace\//,
        /\/home\//,
        /\/Users\//,
        /C:\\/,
        /\\\\/
      ];

      for(const pat of absPathPatterns){
        if(pat.test(line)){
          // Exception: allow literal "<REPO_ROOT>"
          if(line.includes('<REPO_ROOT>')) continue;
          violations.push({epoch,file:f,line:i+1,text:line.trim().slice(0,80)});
          break;
        }
      }
    }
  }
}

if(violations.length>0){
  console.error(`E100 path invariance contract FAILED: ${violations.length} violations`);
  for(const v of violations){
    console.error(`  - ${v.epoch}/${v.file}:${v.line} ${v.text}`);
  }
  process.exit(1);
}

console.log('e100:path_invariance_contract PASSED');
