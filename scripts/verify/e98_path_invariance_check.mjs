#!/usr/bin/env node
// E98-2: Path invariance - ensure E98 evidence has no absolute path leakage
import fs from 'node:fs';
import path from 'node:path';
import { E98_ROOT, ensureDir, isCIMode } from './e98_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E98_EVIDENCE==='1';
if(isCIMode()&&update) throw new Error('UPDATE_E98_EVIDENCE forbidden in CI');

if(!fs.existsSync(E98_ROOT)){
  console.log('e98:path_invariance_check SKIP (no evidence yet)');
  process.exit(0);
}

const violations=[];
const mdFiles=fs.readdirSync(E98_ROOT).filter((f)=>f.endsWith('.md'));

// E98 contract: PREFLIGHT.md pwd must use <REPO_ROOT> not absolute path
for(const f of mdFiles){
  const content=fs.readFileSync(path.join(E98_ROOT,f),'utf8');
  const lines=content.split('\n');

  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    // Detect absolute unix paths in pwd field (but not in code blocks or git output)
    if(/^- pwd:\s+\//.test(line)&&!line.includes('<REPO_ROOT>')){
      violations.push({file:f,line:i+1,pattern:'absolute_pwd',text:line.trim()});
    }
  }
}

const status=violations.length===0?'PASS':'FAIL';
const report=[
  '# E98 PATH INVARIANCE ASSERTIONS',
  '',
  `- status: ${status}`,
  `- files_checked: ${mdFiles.length}`,
  `- violations_found: ${violations.length}`,
  ''
];

if(violations.length>0){
  report.push('## Violations');
  report.push('');
  for(const v of violations){
    report.push(`- ${v.file}:${v.line} [${v.pattern}] ${v.text}`);
  }
  report.push('');
}

report.push('## Contract');
report.push('- E98 evidence PREFLIGHT.md pwd must use <REPO_ROOT> placeholder');
report.push('- Absolute paths leak workspace topology');
report.push('- E90-E97 evidence is grandfathered (no retroactive fix)');

if(update&&!isCIMode()){
  ensureDir(E98_ROOT);
  writeMd(path.join(E98_ROOT,'PATH_INVARIANCE_ASSERTIONS.md'),report.join('\n'));
}

if(status==='FAIL'){
  console.error('E98 path invariance check FAILED');
  process.exit(1);
}

console.log('e98:path_invariance_check PASSED');
