#!/usr/bin/env node
// E101-4,5,6: Transaction Apply v2 with crash-safety + triangle check
// Journaling with schema_version, integrity, and <REPO_ROOT> paths

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E101_JOURNAL_PATH, E101_ROOT, ensureDir } from './e101_lib.mjs';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';
import { repoRootPlaceholder } from './foundation_paths.mjs';

const update = process.env.UPDATE_E101_EVIDENCE === '1';
const updateApply = process.env.UPDATE_E101_APPLY_TXN === '1';

if (isCIMode() && (update || updateApply)) {
  throw new Error('UPDATE_E101_* forbidden in CI');
}

if (!updateApply) {
  console.log('e101:apply_txn SKIP (UPDATE_E101_APPLY_TXN not set)');
  process.exit(0);
}

function run(name, cmd, env) {
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) {
    throw new Error(`apply_txn failed at ${name}: exit ${r.status}`);
  }
}

const overlayPath = path.resolve('core/edge/contracts/e97_envelope_tuning_overlay.md');
const ledgerPath = path.resolve('core/edge/state/profit_ledger_state.md');

ensureDir(E101_ROOT);

// Phase 1: Capture BEFORE state
const before = {
  overlay: {
    content: fs.readFileSync(overlayPath, 'utf8'),
    sha256: sha256File(overlayPath)
  },
  ledger: {
    content: fs.readFileSync(ledgerPath, 'utf8'),
    sha256: sha256File(ledgerPath)
  }
};

// Phase 2: Run E97 apply x2 (idempotence test)
const env = {
  ...process.env,
  CI: 'false',
  UPDATE_E97_EVIDENCE: '1',
  UPDATE_E97_APPLY: '1',
  APPLY_MODE: 'APPLY',
  CHAIN_MODE: 'FAST_PLUS',
  QUIET: '1'
};

// Clean UPDATE_E101_* from env
delete env.UPDATE_E101_EVIDENCE;
delete env.UPDATE_E101_APPLY_TXN;

const start1 = Date.now();
run('apply-run1', ['npm', 'run', '-s', 'verify:e97'], env);
const dur1 = ((Date.now() - start1) / 1000).toFixed(2);

const run1 = {
  overlay_sha256: sha256File(overlayPath),
  ledger_sha256: sha256File(ledgerPath)
};

const start2 = Date.now();
run('apply-run2', ['npm', 'run', '-s', 'verify:e97'], env);
const dur2 = ((Date.now() - start2) / 1000).toFixed(2);

const run2 = {
  overlay_sha256: sha256File(overlayPath),
  ledger_sha256: sha256File(ledgerPath)
};

// Phase 3: Capture AFTER state
const after = {
  overlay: {
    content: fs.readFileSync(overlayPath, 'utf8'),
    sha256: sha256File(overlayPath)
  },
  ledger: {
    content: fs.readFileSync(ledgerPath, 'utf8'),
    sha256: sha256File(ledgerPath)
  }
};

// Phase 4: Save journal v2 (with schema, integrity, <REPO_ROOT>)
const journal = {
  schema_version: 2,
  applied_epoch: 'E97',
  timestamp: new Date().toISOString(),
  before: {
    overlay_sha256: before.overlay.sha256,
    ledger_sha256: before.ledger.sha256,
    overlay_content: before.overlay.content,
    ledger_content: before.ledger.content
  },
  after: {
    overlay_sha256: after.overlay.sha256,
    ledger_sha256: after.ledger.sha256,
    overlay_content: after.overlay.content,
    ledger_content: after.ledger.content
  },
  run1: {
    overlay_sha256: run1.overlay_sha256,
    ledger_sha256: run1.ledger_sha256,
    duration_seconds: parseFloat(dur1)
  },
  run2: {
    overlay_sha256: run2.overlay_sha256,
    ledger_sha256: run2.ledger_sha256,
    duration_seconds: parseFloat(dur2)
  },
  journal_path_portable: `${repoRootPlaceholder()}/.foundation-seal/E101_APPLY_JOURNAL.json`
};

// Compute integrity hash (self-check)
const journalBody = JSON.stringify({
  schema_version: journal.schema_version,
  applied_epoch: journal.applied_epoch,
  before: journal.before,
  after: journal.after
}, null, 2);
journal.integrity_sha256 = sha256Text(journalBody);

fs.mkdirSync(path.dirname(E101_JOURNAL_PATH), { recursive: true });
fs.writeFileSync(E101_JOURNAL_PATH, JSON.stringify(journal, null, 2), 'utf8');

// Phase 5: Generate evidence
const idempotent = run1.overlay_sha256 === run2.overlay_sha256 &&
  run1.ledger_sha256 === run2.ledger_sha256;

const report = [
  '# E101 APPLY TRANSACTION',
  '',
  '## Phase 1: Before State',
  `- overlay_sha256: ${before.overlay.sha256}`,
  `- ledger_sha256: ${before.ledger.sha256}`,
  '',
  '## Phase 2: Apply x2',
  `- run1_duration: ${dur1}s`,
  `- run1_overlay_sha256: ${run1.overlay_sha256}`,
  `- run1_ledger_sha256: ${run1.ledger_sha256}`,
  `- run2_duration: ${dur2}s`,
  `- run2_overlay_sha256: ${run2.overlay_sha256}`,
  `- run2_ledger_sha256: ${run2.ledger_sha256}`,
  '',
  '## Phase 3: After State',
  `- overlay_sha256: ${after.overlay.sha256}`,
  `- ledger_sha256: ${after.ledger.sha256}`,
  '',
  '## Phase 4: Journal v2',
  `- schema_version: ${journal.schema_version}`,
  `- journal_path: ${journal.journal_path_portable}`,
  `- integrity_sha256: ${journal.integrity_sha256}`,
  '',
  '## Verification',
  `- idempotence_check: ${idempotent ? 'PASS (run1 == run2)' : 'FAIL'}`,
  `- before_differs_from_after: ${before.overlay.sha256 !== after.overlay.sha256}`
].join('\n');

writeMd(path.join(E101_ROOT, 'APPLY_TXN.md'), report);

// RUNS_APPLY_TXN_X2
const runs = [
  '# E101 RUNS APPLY TXN X2',
  '',
  '## Idempotence Proof',
  `- run1_overlay: ${run1.overlay_sha256}`,
  `- run2_overlay: ${run2.overlay_sha256}`,
  `- overlay_match: ${run1.overlay_sha256 === run2.overlay_sha256}`,
  '',
  `- run1_ledger: ${run1.ledger_sha256}`,
  `- run2_ledger: ${run2.ledger_sha256}`,
  `- ledger_match: ${run1.ledger_sha256 === run2.ledger_sha256}`,
  '',
  `- idempotent: ${idempotent ? 'YES' : 'NO'}`,
  '',
  '## Performance',
  `- run1: ${dur1}s`,
  `- run2: ${dur2}s`,
  `- delta: ${(parseFloat(dur2) - parseFloat(dur1)).toFixed(2)}s`
].join('\n');

writeMd(path.join(E101_ROOT, 'RUNS_APPLY_TXN_X2.md'), runs);

if (!idempotent) {
  throw new Error('Apply idempotence check FAILED');
}

console.log('e101:apply_txn PASSED');
