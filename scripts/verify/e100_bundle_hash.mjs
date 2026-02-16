#!/usr/bin/env node
// E100-3: Portable bundle hashing (no tar dependency)
import fs from 'node:fs';
import path from 'node:path';
import { E100_ROOT, ensureDir, isCIMode } from './e100_lib.mjs';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

const verify=process.argv.includes('--verify');
const update=process.env.UPDATE_E100_EVIDENCE==='1';

if(isCIMode()&&update) throw new Error('UPDATE_E100_EVIDENCE forbidden in CI');

// E100 bundle: evidence + overlay (BUNDLE_HASH.md excluded to avoid circular dependency)
const bundleFiles=[
  'reports/evidence/E100/APPLY_TXN.md',
  'reports/evidence/E100/CLOSEOUT.md',
  'reports/evidence/E100/CONTRACTS_SUMMARY.md',
  'reports/evidence/E100/PERF_NOTES.md',
  'reports/evidence/E100/PREFLIGHT.md',
  'reports/evidence/E100/ROLLBACK_TXN.md',
  'reports/evidence/E100/RUNS_APPLY_TXN_X2.md',
  'reports/evidence/E100/RUNS_ROLLBACK_X2.md',
  'reports/evidence/E100/SHA256SUMS.md',
  'reports/evidence/E100/VERDICT.md',
  'core/edge/contracts/e97_envelope_tuning_overlay.md'
].filter(f=>fs.existsSync(f)).sort();

function computeBundleHash(){
  const rows=bundleFiles.map(f=>`${sha256File(f)}  ${f}`);
  const bundleText=rows.join('\n')+'\n';
  return sha256Text(bundleText);
}

if(verify){
  // Verify mode: read existing BUNDLE_HASH.md and compare
  const bundlePath=path.join(E100_ROOT,'BUNDLE_HASH.md');
  if(!fs.existsSync(bundlePath)){
    console.error('BUNDLE_HASH.md not found');
    process.exit(1);
  }

  const content=fs.readFileSync(bundlePath,'utf8');
  const m=content.match(/^- bundle_hash:\s*([a-f0-9]{64})/m);
  if(!m){
    console.error('bundle_hash not found in BUNDLE_HASH.md');
    process.exit(1);
  }

  const recorded=m[1];
  const computed=computeBundleHash();

  if(recorded!==computed){
    console.error(`bundle_hash mismatch: recorded=${recorded} computed=${computed}`);
    process.exit(1);
  }

  console.log('e100:bundle_hash VERIFIED');
  process.exit(0);
}

// Generate mode
if(update&&!isCIMode()){
  ensureDir(E100_ROOT);

  const hash=computeBundleHash();
  const rows=bundleFiles.map(f=>`${sha256File(f)}  ${f}`);

  const report=[
    '# E100 BUNDLE HASH',
    '',
    `- bundle_hash: ${hash}`,
    `- files: ${bundleFiles.length}`,
    '',
    '## File Hashes (sorted)',
    '',
    ...rows.map(r=>`- ${r}`),
    '',
    '## Contract',
    '- Bundle hash is sha256(concat(sorted file hashes + newlines))',
    '- Reproducible on Linux + macOS (no tar dependency)',
    '- Verify mode: recompute and assert equality'
  ].join('\n');

  writeMd(path.join(E100_ROOT,'BUNDLE_HASH.md'),report);
  console.log(`e100:bundle_hash GENERATED: ${hash}`);
}else if(!update){
  // Read-only mode: just verify
  const bundlePath=path.join(E100_ROOT,'BUNDLE_HASH.md');
  if(fs.existsSync(bundlePath)){
    const content=fs.readFileSync(bundlePath,'utf8');
    const m=content.match(/^- bundle_hash:\s*([a-f0-9]{64})/m);
    if(m){
      const recorded=m[1];
      const computed=computeBundleHash();
      if(recorded===computed){
        console.log('e100:bundle_hash PASSED');
      }else{
        console.error(`bundle_hash mismatch: recorded=${recorded} computed=${computed}`);
        process.exit(1);
      }
    }
  }else{
    console.log('e100:bundle_hash SKIP (not generated yet)');
  }
}
