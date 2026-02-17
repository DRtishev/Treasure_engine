#!/usr/bin/env node
// E98-1: Case collision detection for macOS portability
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { E98_ROOT, ensureDir, isCIMode } from './e98_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E98_EVIDENCE==='1';
if(isCIMode()&&update) throw new Error('UPDATE_E98_EVIDENCE forbidden in CI');

// Get all files tracked by git (excluding deleted files)
const result=spawnSync('git',['ls-files','--cached','--exclude-standard'],{encoding:'utf8'});
if(result.status!==0) throw new Error('git ls-files failed');

// Also get deleted files so we can exclude them
const deletedResult=spawnSync('git',['ls-files','--deleted'],{encoding:'utf8'});
const deletedFiles=new Set(deletedResult.stdout.trim().split('\n').filter(Boolean));

const files=result.stdout.trim().split('\n').filter(Boolean).filter(f=>!deletedFiles.has(f));
const lowerMap=new Map();
const collisions=[];

for(const file of files){
  const lower=file.toLowerCase();
  if(lowerMap.has(lower)){
    collisions.push({canonical:lowerMap.get(lower),conflict:file});
  }else{
    lowerMap.set(lower,file);
  }
}

// E98 contract: NO case collisions allowed
const status=collisions.length===0?'PASS':'FAIL';
const report=[
  '# E98 CASE COLLISION CONTRACT',
  '',
  `- status: ${status}`,
  `- total_files: ${files.length}`,
  `- collisions_found: ${collisions.length}`,
  ''
];

if(collisions.length>0){
  report.push('## Collisions (macOS unsafe)');
  report.push('');
  for(const c of collisions){
    report.push(`- conflict: ${c.conflict} vs ${c.canonical}`);
  }
  report.push('');
}

report.push('## Contract');
report.push('- All file paths must be unique when lowercased (case-insensitive safe)');
report.push('- Canonical choice: prefer UPPERCASE for policy/doc files');
report.push('- Resolution: remove/rename conflicting path');

if(update&&!isCIMode()){
  ensureDir(E98_ROOT);
  writeMd(path.join(E98_ROOT,'CASE_COLLISION_CONTRACT.md'),report.join('\n'));
}

if(status==='FAIL'){
  console.error('E98 case collision check FAILED');
  process.exit(1);
}

console.log('e98:case_collision_scan PASSED');
