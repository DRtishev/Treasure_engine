#!/usr/bin/env node
// E99 case collision contract (should be 0 after E98)
import { spawnSync } from 'node:child_process';

// Get all files tracked by git (excluding deleted files)
const result=spawnSync('git',['ls-files','--cached','--exclude-standard'],{encoding:'utf8'});
if(result.status!==0) throw new Error('git ls-files failed');

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

if(collisions.length>0){
  console.error(`E99 case collision contract FAILED: ${collisions.length} collisions`);
  for(const c of collisions){
    console.error(`  - ${c.conflict} vs ${c.canonical}`);
  }
  process.exit(1);
}

console.log('e99:case_collision_contract PASSED');
