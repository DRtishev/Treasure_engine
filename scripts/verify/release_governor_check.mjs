#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { EVIDENCE_ROOT, resolveEvidenceDir } from '../ops/evidence_helpers.mjs';

const LEDGER_PATH = 'specs/epochs/LEDGER.json';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`✗ ${msg}`);
  }
}

function mustExist(p) {
  return fs.existsSync(p);
}

function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function parseShaFile(filePath) {
  const first = (fs.readFileSync(filePath, 'utf8').trim().split('\n')[0] || '').trim();
  return first.split(/\s+/)[0] || '';
}

function validateLedger() {
  assert(mustExist(LEDGER_PATH), `ledger exists: ${LEDGER_PATH}`);
  if (!mustExist(LEDGER_PATH)) return null;
  const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
  const statuses = ['DONE', 'READY', 'BLOCKED', 'LEGACY_DONE'];
  for (let epoch = 1; epoch <= 30; epoch += 1) {
    const e = ledger.epochs?.[String(epoch)];
    assert(Boolean(e), `ledger has epoch ${epoch}`);
    if (!e) continue;
    assert(statuses.includes(e.status), `epoch ${epoch} status is valid (${e.status})`);
  }

  const blocked = Object.entries(ledger.epochs || {})
    .filter(([k, v]) => Number(k) >= 1 && v.status === 'BLOCKED')
    .map(([k]) => k);
  assert(blocked.length === 0, `no BLOCKED epochs >=1 in ledger (found: ${blocked.join(', ') || 'none'})`);
  return ledger;
}

function validateWallEvidence(evidenceDir) {
  const wallJson = path.join(evidenceDir, 'WALL_RESULT.json');
  const wallMarkers = path.join(evidenceDir, 'WALL_MARKERS.txt');
  assert(mustExist(wallJson), `wall machine output exists: ${wallJson}`);
  assert(mustExist(wallMarkers), `wall markers exist: ${wallMarkers}`);

  if (!mustExist(wallJson)) return;

  let parsed = null;
  try {
    parsed = JSON.parse(fs.readFileSync(wallJson, 'utf8'));
  } catch {
    parsed = null;
  }
  assert(Boolean(parsed), 'WALL_RESULT.json is valid JSON');
  if (!parsed) return;

  assert(Array.isArray(parsed.steps) && parsed.steps.length > 0, 'WALL_RESULT.json has ordered steps');
  assert(typeof parsed.started_at === 'string' && typeof parsed.finished_at === 'string', 'WALL_RESULT.json has timestamps');

  const failedStep = (parsed.steps || []).find((step) => Number(step.exit_code) !== 0);
  assert(!failedStep, `WALL_RESULT.json reports all gate steps passed${failedStep ? ` (failed: ${failedStep.command})` : ''}`);

  const markersText = mustExist(wallMarkers) ? fs.readFileSync(wallMarkers, 'utf8') : '';
  assert(!markersText.includes('REQUIRED|FAIL|'), 'WALL_MARKERS.txt has no failed required markers');

  if ((!parsed.steps || parsed.steps.length === 0) && mustExist(path.join(evidenceDir, 'gates'))) {
    const gatesDir = path.join(evidenceDir, 'gates');
    const fallbackWallLog = fs.readdirSync(gatesDir)
      .filter((name) => name.includes('verify_wall') && name.endsWith('.log'))
      .map((name) => path.join(gatesDir, name))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    assert(Boolean(fallbackWallLog), `fallback wall log exists under: ${gatesDir}`);
  }
}

function validateEvidenceCompleteness(evidenceDir) {
  const requiredFiles = [
    'PREFLIGHT.log',
    'SNAPSHOT.md',
    'ASSUMPTIONS.md',
    'GATE_PLAN.md',
    'RISK_REGISTER.md',
    'SUMMARY.md',
    'VERDICT.md',
    'SHA256SUMS.SOURCE.txt',
    'SHA256SUMS.EVIDENCE.txt',
    'SHA256SUMS.EXPORT.txt'
  ];
  for (const f of requiredFiles) {
    assert(mustExist(path.join(evidenceDir, f)), `required evidence file exists: ${f}`);
  }
  if (process.env.CLEAN_CLONE_BOOTSTRAP === '1') {
    assert(true, 'clean-clone marker check deferred during bootstrap');
  } else {
    assert(mustExist(path.join(evidenceDir, 'CLEAN_CLONE', 'CLEAN_CLONE.OK')), 'clean-clone marker exists');
  }
}

function validateExportIntegrity() {
  assert(mustExist('FINAL_VALIDATED.zip'), 'FINAL_VALIDATED.zip exists');
  assert(mustExist('FINAL_VALIDATED.zip.sha256'), 'FINAL_VALIDATED.zip.sha256 exists');
  if (mustExist('FINAL_VALIDATED.zip') && mustExist('FINAL_VALIDATED.zip.sha256')) {
    const actual = sha256('FINAL_VALIDATED.zip');
    const declared = parseShaFile('FINAL_VALIDATED.zip.sha256');
    assert(actual === declared, 'FINAL_VALIDATED.zip checksum matches declared hash');
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('RELEASE GOVERNOR CHECK (LEDGER + LATEST EVIDENCE)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const ledger = validateLedger();
const latest = process.env.EVIDENCE_DIR || resolveEvidenceDir();
assert(Boolean(latest), `latest evidence directory exists under ${EVIDENCE_ROOT}`);
if (latest) {
  console.log(`Using latest evidence dir: ${latest}`);
  validateWallEvidence(latest);
  validateEvidenceCompleteness(latest);
}
validateExportIntegrity();

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✓ PASSED: ${passed}`);
console.log(`✗ FAILED: ${failed}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (failed > 0 || !ledger) process.exit(1);
