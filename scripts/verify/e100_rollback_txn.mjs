#!/usr/bin/env node
// E100-2: Deterministic ROLLBACK from journal
import fs from 'node:fs';
import path from 'node:path';
import { E100_ROOT, E100_JOURNAL_PATH, ensureDir, isCIMode, minimalLog } from './e100_lib.mjs';
import { writeMd, sha256File, sha256Text } from './e66_lib.mjs';

const rollback=process.env.ROLLBACK_E100==='1';
const rollbackMode=String(process.env.ROLLBACK_MODE||'OBSERVE').toUpperCase();

if(isCIMode()&&rollback) throw new Error('ROLLBACK_E100 forbidden in CI');
if(isCIMode()) throw new Error('rollback_txn forbidden in CI mode');

if(!(!isCIMode()&&rollback&&rollbackMode==='ROLLBACK')){
  console.log('verify:e100:rollback SKIPPED (not in ROLLBACK mode)');
  process.exit(0);
}

if(!fs.existsSync(E100_JOURNAL_PATH)){
  throw new Error('rollback journal not found - run apply_txn first');
}

const journal=JSON.parse(fs.readFileSync(E100_JOURNAL_PATH,'utf8'));
const {before}=journal;

const report=[];
report.push('# E100 ROLLBACK TXN');
report.push('');
report.push('## Phase 1: Read Journal');
report.push(`- journal_path: <REPO_ROOT>/.foundation-seal/E100_APPLY_JOURNAL.json`);
report.push(`- journal_sha256: ${sha256File(E100_JOURNAL_PATH)}`);
report.push(`- overlay_before: ${before.overlay.sha256}`);
report.push(`- ledger_before: ${before.ledger.sha256}`);
report.push('');

// Phase 2: Restore BEFORE snapshot (byte-for-byte)
report.push('## Phase 2: Restore x2 (Determinism Test)');

function restoreSnapshot(snap){
  const overlay='core/edge/contracts/e97_envelope_tuning_overlay.md';
  const ledger='core/edge/state/profit_ledger_state.md';

  if(snap.overlay.content!==null){
    fs.mkdirSync(path.dirname(overlay),{recursive:true});
    fs.writeFileSync(overlay,snap.overlay.content,'utf8');
  }else if(fs.existsSync(overlay)){
    fs.unlinkSync(overlay);
  }

  if(snap.ledger.content!==null){
    fs.mkdirSync(path.dirname(ledger),{recursive:true});
    fs.writeFileSync(ledger,snap.ledger.content,'utf8');
  }else if(fs.existsSync(ledger)){
    fs.unlinkSync(ledger);
  }
}

function captureCurrentSnapshot(){
  const overlay='core/edge/contracts/e97_envelope_tuning_overlay.md';
  const ledger='core/edge/state/profit_ledger_state.md';

  return {
    overlay: fs.existsSync(overlay) ? sha256File(overlay) : 'ABSENT',
    ledger: fs.existsSync(ledger) ? sha256File(ledger) : 'ABSENT'
  };
}

// Restore run #1
restoreSnapshot(before);
const restore1=captureCurrentSnapshot();
report.push(`- overlay_after_restore1: ${restore1.overlay}`);
report.push(`- ledger_after_restore1: ${restore1.ledger}`);

// Restore run #2 (must be deterministic)
restoreSnapshot(before);
const restore2=captureCurrentSnapshot();
report.push(`- overlay_after_restore2: ${restore2.overlay}`);
report.push(`- ledger_after_restore2: ${restore2.ledger}`);
report.push(`- overlay_deterministic: ${restore1.overlay===restore2.overlay}`);
report.push(`- ledger_deterministic: ${restore1.ledger===restore2.ledger}`);
report.push('');

// Phase 3: Verify match with BEFORE
const overlayMatch=restore1.overlay===before.overlay.sha256&&restore2.overlay===before.overlay.sha256;
const ledgerMatch=restore1.ledger===before.ledger.sha256&&restore2.ledger===before.ledger.sha256;

report.push('## Phase 3: Verify Match with BEFORE');
report.push(`- overlay_match: ${overlayMatch}`);
report.push(`- ledger_match: ${ledgerMatch}`);
report.push('');

const verdict=(overlayMatch&&ledgerMatch)?'PASS':'FAIL';
report.push(`## Verdict: ${verdict}`);
report.push('');
report.push('## Contracts');
report.push('- Rollback must be deterministic (x2 restore produces identical state)');
report.push('- Rollback must restore BEFORE snapshot byte-for-byte');

const update=process.env.UPDATE_E100_EVIDENCE==='1';
if(update&&!isCIMode()){
  ensureDir(E100_ROOT);
  writeMd(path.join(E100_ROOT,'ROLLBACK_TXN.md'),report.join('\n'));

  // Write x2 proof
  const x2Report=[
    '# E100 RUNS ROLLBACK X2',
    '',
    '## Run 1',
    `- overlay_sha256: ${restore1.overlay}`,
    `- ledger_sha256: ${restore1.ledger}`,
    '',
    '## Run 2',
    `- overlay_sha256: ${restore2.overlay}`,
    `- ledger_sha256: ${restore2.ledger}`,
    '',
    `## Overlay Deterministic: ${restore1.overlay===restore2.overlay?'PASS':'FAIL'}`,
    `## Ledger Deterministic: ${restore1.ledger===restore2.ledger?'PASS':'FAIL'}`,
    `## Match with BEFORE: ${overlayMatch&&ledgerMatch?'PASS':'FAIL'}`
  ].join('\n');
  writeMd(path.join(E100_ROOT,'RUNS_ROLLBACK_X2.md'),x2Report);
}

if(verdict==='FAIL'){
  console.error('E100 rollback txn FAILED');
  process.exit(1);
}

minimalLog('e100:rollback PASSED');
