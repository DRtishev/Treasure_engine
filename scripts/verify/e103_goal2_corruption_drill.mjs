#!/usr/bin/env node
// E103-2: Corruption Drill - P0 Security Test
// Goal: Prove 3 corruption scenarios cause 0 writes (fail-safe)

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E103_ROOT, ensureDir } from './e103_lib.mjs';
import { E101_JOURNAL_PATH } from './e101_lib.mjs';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';

const update = process.env.UPDATE_E103_EVIDENCE === '1';

if (isCIMode() && update) {
  throw new Error('UPDATE_E103_EVIDENCE forbidden in CI');
}

if (!update) {
  console.log('e103:goal2_corruption_drill SKIP (UPDATE_E103_EVIDENCE not set)');
  process.exit(0);
}

ensureDir(E103_ROOT);

function runExpectFail(name, journalContent, scenario) {
  // Save corrupted journal
  fs.writeFileSync(E101_JOURNAL_PATH, journalContent, 'utf8');

  // Capture BEFORE state
  const overlayBefore = sha256File('core/edge/contracts/e97_envelope_tuning_overlay.md');
  const ledgerBefore = sha256File('core/edge/state/profit_ledger_state.md');

  // Try rollback (should FAIL without writes)
  const env = {
    ...process.env,
    CI: 'false',
    ROLLBACK_E101: '1',
    ROLLBACK_MODE: 'ROLLBACK',
    CHAIN_MODE: 'FAST',
    QUIET: '1'
  };
  delete env.UPDATE_E103_EVIDENCE;

  const r = spawnSync('npm', ['run', '-s', 'verify:e101:rollback_txn'], {
    stdio: 'pipe',
    env,
    encoding: 'utf8'
  });

  // Capture AFTER state
  const overlayAfter = sha256File('core/edge/contracts/e97_envelope_tuning_overlay.md');
  const ledgerAfter = sha256File('core/edge/state/profit_ledger_state.md');

  const exitCode = r.status ?? 1;
  const failed = exitCode !== 0;
  const noWrites = overlayBefore === overlayAfter && ledgerBefore === ledgerAfter;

  return {
    scenario,
    exit_code: exitCode,
    failed,
    overlay_before: overlayBefore,
    overlay_after: overlayAfter,
    ledger_before: ledgerBefore,
    ledger_after: ledgerAfter,
    no_writes: noWrites,
    pass: failed && noWrites,
    stderr: r.stderr || ''
  };
}

// Setup: Create valid journal first
console.log('=== SETUP: Create valid journal ===');
const setupEnv = {
  ...process.env,
  CI: 'false',
  UPDATE_E101_EVIDENCE: '1',
  UPDATE_E101_APPLY_TXN: '1',
  APPLY_MODE: 'APPLY',
  CHAIN_MODE: 'FAST',
  QUIET: '1'
};
delete setupEnv.UPDATE_E103_EVIDENCE;

const setupR = spawnSync('npm', ['run', '-s', 'verify:e101:apply_txn'], {
  stdio: 'inherit',
  env: setupEnv
});

if ((setupR.status ?? 1) !== 0) {
  throw new Error('Setup failed: could not create valid journal');
}

// Read valid journal
if (!fs.existsSync(E101_JOURNAL_PATH)) {
  throw new Error('Setup failed: journal not created');
}

const validJournal = JSON.parse(fs.readFileSync(E101_JOURNAL_PATH, 'utf8'));

// Scenario 1: Wrong integrity_sha256
console.log('=== SCENARIO 1: Wrong integrity_sha256 ===');
const corrupt1 = { ...validJournal };
corrupt1.integrity_sha256 = 'deadbeef'.repeat(8);
const result1 = runExpectFail('scenario1', JSON.stringify(corrupt1, null, 2), 'WRONG_INTEGRITY_SHA256');

// Scenario 2: Truncated JSON
console.log('=== SCENARIO 2: Truncated JSON ===');
const validJson = JSON.stringify(validJournal, null, 2);
const truncated = validJson.slice(0, Math.floor(validJson.length / 2));
const result2 = runExpectFail('scenario2', truncated, 'TRUNCATED_JSON');

// Scenario 3: Bad schema_version
console.log('=== SCENARIO 3: Bad schema_version ===');
const corrupt3 = { ...validJournal };
corrupt3.schema_version = 999;
// Recompute integrity with bad schema
const corrupt3Body = JSON.stringify({
  schema_version: corrupt3.schema_version,
  applied_epoch: corrupt3.applied_epoch,
  before: corrupt3.before,
  after: corrupt3.after
}, null, 2);
corrupt3.integrity_sha256 = sha256Text(corrupt3Body);
const result3 = runExpectFail('scenario3', JSON.stringify(corrupt3, null, 2), 'BAD_SCHEMA_VERSION');

// Restore valid journal
fs.writeFileSync(E101_JOURNAL_PATH, JSON.stringify(validJournal, null, 2), 'utf8');

// Verification: All scenarios should FAIL and cause 0 writes
const allPass = result1.pass && result2.pass && result3.pass;

// Generate report
const report = [
  '# E103 GOAL 2: CORRUPTION DRILL',
  '',
  '## Scenario 1: Wrong integrity_sha256',
  `- exit_code: ${result1.exit_code}`,
  `- failed: ${result1.failed}`,
  `- overlay_before: ${result1.overlay_before}`,
  `- overlay_after: ${result1.overlay_after}`,
  `- ledger_before: ${result1.ledger_before}`,
  `- ledger_after: ${result1.ledger_after}`,
  `- no_writes: ${result1.no_writes}`,
  `- pass: ${result1.pass ? 'PASS' : 'FAIL'}`,
  '',
  '## Scenario 2: Truncated JSON',
  `- exit_code: ${result2.exit_code}`,
  `- failed: ${result2.failed}`,
  `- overlay_before: ${result2.overlay_before}`,
  `- overlay_after: ${result2.overlay_after}`,
  `- ledger_before: ${result2.ledger_before}`,
  `- ledger_after: ${result2.ledger_after}`,
  `- no_writes: ${result2.no_writes}`,
  `- pass: ${result2.pass ? 'PASS' : 'FAIL'}`,
  '',
  '## Scenario 3: Bad schema_version',
  `- exit_code: ${result3.exit_code}`,
  `- failed: ${result3.failed}`,
  `- overlay_before: ${result3.overlay_before}`,
  `- overlay_after: ${result3.overlay_after}`,
  `- ledger_before: ${result3.ledger_before}`,
  `- ledger_after: ${result3.ledger_after}`,
  `- no_writes: ${result3.no_writes}`,
  `- pass: ${result3.pass ? 'PASS' : 'FAIL'}`,
  '',
  '## Security Verification',
  `- scenario_1_pass: ${result1.pass}`,
  `- scenario_2_pass: ${result2.pass}`,
  `- scenario_3_pass: ${result3.pass}`,
  `- all_scenarios_pass: ${allPass}`,
  '',
  '## Proof of 0 Writes',
  '- Scenario 1: ' + (result1.no_writes ? 'NO WRITES (safe)' : 'WRITES DETECTED (UNSAFE)'),
  '- Scenario 2: ' + (result2.no_writes ? 'NO WRITES (safe)' : 'WRITES DETECTED (UNSAFE)'),
  '- Scenario 3: ' + (result3.no_writes ? 'NO WRITES (safe)' : 'WRITES DETECTED (UNSAFE)'),
  '',
  '## Verdict',
  `- overall: ${allPass ? 'PASS' : 'FAIL'}`
].join('\n');

writeMd(path.join(E103_ROOT, 'GOAL_2_CORRUPTION_DRILL.md'), report);

if (!allPass) {
  const failures = [];
  if (!result1.pass) failures.push('scenario1');
  if (!result2.pass) failures.push('scenario2');
  if (!result3.pass) failures.push('scenario3');
  throw new Error(`Corruption Drill FAILED: ${failures.join(', ')}`);
}

console.log('e103:goal2_corruption_drill PASSED (all scenarios: fail-safe, 0 writes)');
