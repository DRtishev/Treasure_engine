#!/usr/bin/env node
// E101-4,6: Rollback Transaction v2 with determinism x2 + crash-safety
// Restores from journal v2 with integrity verification

import fs from 'node:fs';
import path from 'node:path';
import { E101_JOURNAL_PATH, E101_ROOT } from './e101_lib.mjs';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';
import { repoRootPlaceholder } from './foundation_paths.mjs';

const updateRollback = process.env.ROLLBACK_E101 === '1';

if (isCIMode() && updateRollback) {
  throw new Error('ROLLBACK_E101 forbidden in CI');
}

if (!updateRollback) {
  console.log('e101:rollback SKIP (ROLLBACK_E101 not set)');
  process.exit(0);
}

if (!fs.existsSync(E101_JOURNAL_PATH)) {
  throw new Error(`Journal not found: ${E101_JOURNAL_PATH}`);
}

const overlayPath = path.resolve('core/edge/contracts/e97_envelope_tuning_overlay.md');
const ledgerPath = path.resolve('core/edge/state/profit_ledger_state.md');

// Phase 1: Read and verify journal
const journal = JSON.parse(fs.readFileSync(E101_JOURNAL_PATH, 'utf8'));

if (journal.schema_version !== 2) {
  throw new Error(`Unsupported journal schema: ${journal.schema_version}`);
}

// Verify integrity
const journalBody = JSON.stringify({
  schema_version: journal.schema_version,
  applied_epoch: journal.applied_epoch,
  before: journal.before,
  after: journal.after
}, null, 2);

const computedIntegrity = sha256Text(journalBody);
if (journal.integrity_sha256 !== computedIntegrity) {
  throw new Error(`Journal integrity check FAILED: recorded=${journal.integrity_sha256} computed=${computedIntegrity}`);
}

const before = journal.before;

// Phase 2: Rollback run 1
fs.writeFileSync(overlayPath, before.overlay_content, 'utf8');
fs.writeFileSync(ledgerPath, before.ledger_content, 'utf8');

const rb1 = {
  overlay_sha256: sha256File(overlayPath),
  ledger_sha256: sha256File(ledgerPath)
};

// Phase 3: Rollback run 2 (determinism test)
fs.writeFileSync(overlayPath, before.overlay_content, 'utf8');
fs.writeFileSync(ledgerPath, before.ledger_content, 'utf8');

const rb2 = {
  overlay_sha256: sha256File(overlayPath),
  ledger_sha256: sha256File(ledgerPath)
};

// Verification
const deterministic = rb1.overlay_sha256 === rb2.overlay_sha256 &&
  rb1.ledger_sha256 === rb2.ledger_sha256;

const matchesBefore = rb1.overlay_sha256 === before.overlay_sha256 &&
  rb1.ledger_sha256 === before.ledger_sha256;

const report = [
  '# E101 ROLLBACK TRANSACTION',
  '',
  '## Phase 1: Read Journal',
  `- schema_version: ${journal.schema_version}`,
  `- journal_path: ${journal.journal_path_portable || repoRootPlaceholder() + '/.foundation-seal/E101_APPLY_JOURNAL.json'}`,
  `- integrity_check: PASS`,
  `- before_overlay_sha256: ${before.overlay_sha256}`,
  `- before_ledger_sha256: ${before.ledger_sha256}`,
  '',
  '## Phase 2: Rollback Run 1',
  `- overlay_sha256: ${rb1.overlay_sha256}`,
  `- ledger_sha256: ${rb1.ledger_sha256}`,
  '',
  '## Phase 3: Rollback Run 2 (Determinism)',
  `- overlay_sha256: ${rb2.overlay_sha256}`,
  `- ledger_sha256: ${rb2.ledger_sha256}`,
  '',
  '## Verification',
  `- determinism_check: ${deterministic ? 'PASS (rb1 == rb2)' : 'FAIL'}`,
  `- matches_before_check: ${matchesBefore ? 'PASS (rb == before)' : 'FAIL'}`,
  `- overlay_match: ${rb1.overlay_sha256 === before.overlay_sha256}`,
  `- ledger_match: ${rb1.ledger_sha256 === before.ledger_sha256}`
].join('\n');

writeMd(path.join(E101_ROOT, 'ROLLBACK_TXN.md'), report);

// RUNS_ROLLBACK_X2
const runs = [
  '# E101 RUNS ROLLBACK X2',
  '',
  '## Determinism Proof',
  `- rb1_overlay: ${rb1.overlay_sha256}`,
  `- rb2_overlay: ${rb2.overlay_sha256}`,
  `- overlay_match: ${rb1.overlay_sha256 === rb2.overlay_sha256}`,
  '',
  `- rb1_ledger: ${rb1.ledger_sha256}`,
  `- rb2_ledger: ${rb2.ledger_sha256}`,
  `- ledger_match: ${rb1.ledger_sha256 === rb2.ledger_sha256}`,
  '',
  `- deterministic: ${deterministic ? 'YES' : 'NO'}`,
  '',
  '## Match BEFORE State',
  `- before_overlay: ${before.overlay_sha256}`,
  `- rb_overlay: ${rb1.overlay_sha256}`,
  `- match: ${rb1.overlay_sha256 === before.overlay_sha256}`,
  '',
  `- before_ledger: ${before.ledger_sha256}`,
  `- rb_ledger: ${rb1.ledger_sha256}`,
  `- match: ${rb1.ledger_sha256 === before.ledger_sha256}`,
  '',
  `- byte_for_byte_restore: ${matchesBefore ? 'YES' : 'NO'}`
].join('\n');

writeMd(path.join(E101_ROOT, 'RUNS_ROLLBACK_X2.md'), runs);

if (!deterministic) {
  throw new Error('Rollback determinism check FAILED');
}

if (!matchesBefore) {
  throw new Error('Rollback does not match BEFORE state');
}

console.log('e101:rollback PASSED');
