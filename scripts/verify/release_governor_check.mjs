#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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
  return fs.existsSync(p) && fs.statSync(p).size >= 0;
}

function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function parseShaFile(filePath) {
  const line = fs.readFileSync(filePath, 'utf8').trim().split('\n')[0] || '';
  return line.split(/\s+/)[0] || '';
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EPOCH-21 RELEASE GOVERNOR CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const requiredLogs = [
    'reports/evidence/EPOCH-19/gates/verify_governance_run1.log',
    'reports/evidence/EPOCH-19/gates/verify_governance_run2.log',
    'reports/evidence/EPOCH-19/gates/verify_e2_run1.log',
    'reports/evidence/EPOCH-19/gates/verify_e2_run2.log',
    'reports/evidence/EPOCH-19/gates/verify_paper_run1.log',
    'reports/evidence/EPOCH-19/gates/verify_paper_run2.log'
  ];

  for (const p of requiredLogs) {
    assert(mustExist(p), `required anti-flake log exists: ${p}`);
  }

  const requiredEvidence = [
    'reports/evidence/EPOCH-19/SHA256SUMS.SOURCE.txt',
    'reports/evidence/EPOCH-19/SHA256SUMS.EVIDENCE.txt',
    'reports/evidence/EPOCH-19/SHA256SUMS.EXPORT.txt',
    'reports/evidence/EPOCH-19/VERDICT.md',
    'FINAL_VALIDATED.zip',
    'FINAL_VALIDATED.zip.sha256'
  ];

  for (const p of requiredEvidence) {
    assert(mustExist(p), `required release artifact exists: ${p}`);
  }

  if (mustExist('FINAL_VALIDATED.zip') && mustExist('FINAL_VALIDATED.zip.sha256')) {
    const actual = sha256('FINAL_VALIDATED.zip');
    const declared = parseShaFile('FINAL_VALIDATED.zip.sha256');
    assert(actual === declared, 'FINAL_VALIDATED.zip checksum matches declared sha256');
  }

  const verdictPath = path.join('reports', 'evidence', 'EPOCH-19', 'VERDICT.md');
  if (mustExist(verdictPath)) {
    const verdict = fs.readFileSync(verdictPath, 'utf8');
    const hasStatus = /Status:\s*(SAFE|BLOCKED)/.test(verdict);
    const hasReason = /Reason:/.test(verdict);
    assert(hasStatus, 'verdict contains explicit SAFE/BLOCKED status');
    assert(hasReason, 'verdict contains explicit rationale');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ PASSED: ${passed}`);
  console.log(`✗ FAILED: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
