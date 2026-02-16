#!/usr/bin/env node
// E100-2: Transactional APPLY with journaling
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E100_ROOT, E100_JOURNAL_PATH, ensureDir, isCIMode, isQuiet, minimalLog } from './e100_lib.mjs';
import { writeMd, sha256File, sha256Text } from './e66_lib.mjs';

const update=process.env.UPDATE_E100_EVIDENCE==='1';
const updateApply=process.env.UPDATE_E100_APPLY==='1';
const applyMode=String(process.env.APPLY_MODE||'PROPOSE').toUpperCase();

if(isCIMode()&&(update||updateApply)) throw new Error('UPDATE_E100_* forbidden in CI');
if(isCIMode()) throw new Error('apply_txn forbidden in CI mode');

if(!(!isCIMode()&&updateApply&&applyMode==='APPLY')){
  console.log('verify:e100:apply_txn SKIPPED (not in APPLY mode)');
  process.exit(0);
}

function run(name,cmd,env,opts={}){
  if(!isQuiet()) minimalLog(`[E100_APPLY_TXN] ${name}`);
  const r=spawnSync(cmd[0],cmd.slice(1),{stdio:opts.silent?'pipe':'inherit',env,encoding:'utf8'});
  if((r.status??1)!==0){
    throw new Error(`apply_txn failed at ${name}: exit ${r.status}`);
  }
  return r;
}

function captureSnapshot(label){
  const overlay='core/edge/contracts/e97_envelope_tuning_overlay.md';
  const ledger='core/edge/state/profit_ledger_state.md';

  const snap={
    label,
    overlay: fs.existsSync(overlay) ? {
      content: fs.readFileSync(overlay,'utf8'),
      sha256: sha256File(overlay)
    } : {content:null, sha256:'ABSENT'},
    ledger: fs.existsSync(ledger) ? {
      content: fs.readFileSync(ledger,'utf8'),
      sha256: sha256File(ledger)
    } : {content:null, sha256:'ABSENT'}
  };
  return snap;
}

// Build clean env without E100-specific UPDATE vars
const cleanEnv={...process.env};
delete cleanEnv.UPDATE_E100_EVIDENCE;
delete cleanEnv.UPDATE_E100_APPLY;

const env={
  ...cleanEnv,
  CHAIN_MODE:'FAST_PLUS',
  QUIET:'1',
  TZ:'UTC',
  LANG:'C',
  LC_ALL:'C',
  SOURCE_DATE_EPOCH:process.env.SOURCE_DATE_EPOCH||'1700000000',
  SEED:String(process.env.SEED||'12345')
};

const report=[];
report.push('# E100 APPLY TXN');
report.push('');

// Phase 1: Capture BEFORE snapshot
report.push('## Phase 1: BEFORE Snapshot');
const before=captureSnapshot('BEFORE');
report.push(`- overlay_before: ${before.overlay.sha256}`);
report.push(`- ledger_before: ${before.ledger.sha256}`);
report.push('');

// Phase 2: Apply x2 (idempotence test)
report.push('## Phase 2: Apply x2 (Idempotence Test)');

// Apply run #1
run('apply-run1',['npm','run','-s','verify:e97:apply'],{
  ...env,
  CI:'false',
  UPDATE_E97_EVIDENCE:'1',
  UPDATE_E97_APPLY:'1',
  APPLY_MODE:'APPLY'
});

const after1=captureSnapshot('AFTER_RUN1');
report.push(`- overlay_after_run1: ${after1.overlay.sha256}`);
report.push(`- ledger_after_run1: ${after1.ledger.sha256}`);

// Apply run #2 (must be idempotent)
run('apply-run2',['npm','run','-s','verify:e97:apply'],{
  ...env,
  CI:'false',
  UPDATE_E97_EVIDENCE:'1',
  UPDATE_E97_APPLY:'1',
  APPLY_MODE:'APPLY'
});

const after2=captureSnapshot('AFTER_RUN2');
report.push(`- overlay_after_run2: ${after2.overlay.sha256}`);
report.push(`- ledger_after_run2: ${after2.ledger.sha256}`);
report.push(`- overlay_idempotent: ${after1.overlay.sha256===after2.overlay.sha256}`);
report.push(`- ledger_idempotent: ${after1.ledger.sha256===after2.ledger.sha256}`);
report.push('');

// Phase 3: Save journal for rollback
report.push('## Phase 3: Journal (for rollback)');
const journal={
  timestamp: new Date().toISOString(),
  before,
  after: after2
};

fs.mkdirSync(path.dirname(E100_JOURNAL_PATH),{recursive:true});
fs.writeFileSync(E100_JOURNAL_PATH,JSON.stringify(journal,null,2),'utf8');
report.push(`- journal_saved: ${E100_JOURNAL_PATH}`);
report.push(`- journal_sha256: ${sha256File(E100_JOURNAL_PATH)}`);
report.push('');

// Phase 4: Verdict
const overlayIdempotent=after1.overlay.sha256===after2.overlay.sha256;
const ledgerIdempotent=after1.ledger.sha256===after2.ledger.sha256;
const verdict=(overlayIdempotent&&ledgerIdempotent)?'PASS':'FAIL';

report.push(`## Verdict: ${verdict}`);
report.push('');
report.push('## Contracts');
report.push('- Apply must be idempotent (x2 overlay/ledger hashes stable)');
report.push('- Journal must be saved for deterministic rollback');

if(update&&!isCIMode()){
  ensureDir(E100_ROOT);
  writeMd(path.join(E100_ROOT,'APPLY_TXN.md'),report.join('\n'));

  // Write x2 proof
  const x2Report=[
    '# E100 RUNS APPLY TXN X2',
    '',
    '## Run 1',
    `- overlay_sha256: ${after1.overlay.sha256}`,
    `- ledger_sha256: ${after1.ledger.sha256}`,
    '',
    '## Run 2',
    `- overlay_sha256: ${after2.overlay.sha256}`,
    `- ledger_sha256: ${after2.ledger.sha256}`,
    '',
    `## Overlay Idempotent: ${overlayIdempotent?'PASS':'FAIL'}`,
    `## Ledger Idempotent: ${ledgerIdempotent?'PASS':'FAIL'}`
  ].join('\n');
  writeMd(path.join(E100_ROOT,'RUNS_APPLY_TXN_X2.md'),x2Report);
}

if(verdict==='FAIL'){
  console.error('E100 apply txn FAILED');
  process.exit(1);
}

minimalLog('e100:apply_txn PASSED');
