#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const strict = process.env.RELEASE_STRICT === '1';
const enforceBuild = process.env.RELEASE_BUILD === '1';
if (!strict || !enforceBuild) {
  console.log('verify:release:chain SKIPPED (requires RELEASE_BUILD=1 and RELEASE_STRICT=1)');
  process.exit(0);
}

const reportPath = path.resolve('reports/truth/release_chain_report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const ledger = JSON.parse(fs.readFileSync('specs/epochs/LEDGER.json', 'utf8'));
const doneRows = Object.entries(ledger.epochs ?? {})
  .map(([epoch, row]) => ({ epoch: Number(epoch), row }))
  .filter(({ epoch, row }) => Number.isInteger(epoch) && epoch >= 17 && row?.stage === 'DONE' && typeof row?.evidence_root === 'string')
  .sort((a, b) => a.epoch - b.epoch);

const expectedRoots = doneRows.map(({ row }) => row.evidence_root.replace(/\\/g, '/').replace(/\/$/, ''));
const expectedSet = new Set();
for (const root of expectedRoots) {
  expectedSet.add(`${root}/pack_index.json`);
  expectedSet.add(`${root}/SHA256SUMS.EVIDENCE`);
}

const errors = [];
const allowlistPath = path.resolve('artifacts/out/evidence_allowlist.txt');
const tarPath = path.resolve('artifacts/out/evidence_chain.tar.gz');
if (!fs.existsSync(allowlistPath)) errors.push('missing artifacts/out/evidence_allowlist.txt');
if (!fs.existsSync(tarPath)) errors.push('missing artifacts/out/evidence_chain.tar.gz');

const allowlist = fs.existsSync(allowlistPath)
  ? fs.readFileSync(allowlistPath, 'utf8').split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
  : [];
const allowSet = new Set(allowlist);

if (allowlist.length === 0) errors.push('allowlist is empty');

for (const root of expectedRoots) {
  const packIdx = `${root}/pack_index.json`;
  const sums = `${root}/SHA256SUMS.EVIDENCE`;
  if (!allowSet.has(packIdx)) errors.push(`allowlist missing ${packIdx}`);
  if (!allowSet.has(sums)) errors.push(`allowlist missing ${sums}`);
}

const tarList = fs.existsSync(tarPath)
  ? spawnSync('tar', ['-tzf', tarPath], { encoding: 'utf8' })
  : { status: 1, stdout: '', stderr: 'tar missing' };
if (tarList.status !== 0) errors.push(`failed to list tar contents: ${tarList.stderr || tarList.stdout}`);
const tarEntries = tarList.status === 0 ? tarList.stdout.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).map((x) => x.replace(/^\.\//, '').replace(/\/$/, '')) : [];
const tarSet = new Set(tarEntries);

for (const item of allowSet) if (!tarSet.has(item)) errors.push(`tar missing allowlisted file: ${item}`);
for (const item of tarSet) if (!allowSet.has(item)) errors.push(`tar has non-allowlisted file: ${item}`);
if (tarSet.size !== allowSet.size) errors.push(`tar/allowlist count mismatch: tar=${tarSet.size} allowlist=${allowSet.size}`);

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

let extractedChecks = 0;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-chain-'));
const extractedMismatches = [];
for (const rel of allowlist) {
  const onDisk = path.resolve(rel);
  if (!fs.existsSync(onDisk)) {
    errors.push(`on-disk allowlisted file missing: ${rel}`);
    continue;
  }
  const extract = spawnSync('tar', ['-xzf', tarPath, '-C', tempDir, rel], { encoding: 'utf8' });
  if (extract.status !== 0) {
    errors.push(`failed to extract ${rel}: ${extract.stderr || extract.stdout}`);
    continue;
  }
  const extracted = path.join(tempDir, rel);
  if (!fs.existsSync(extracted)) {
    errors.push(`extracted file missing ${rel}`);
    continue;
  }
  const a = sha256File(extracted);
  const b = sha256File(onDisk);
  extractedChecks += 1;
  if (a !== b) {
    extractedMismatches.push(rel);
    errors.push(`sha mismatch for ${rel}`);
  }

  if (rel.endsWith('/SHA256SUMS.EVIDENCE')) {
    const txt = fs.readFileSync(extracted, 'utf8');
    if (!/\bpack_index\.json\b/.test(txt)) errors.push(`SHA256SUMS missing pack_index.json line: ${rel}`);
  }
}

const report = {
  generated_at: new Date().toISOString(),
  strict,
  enforceBuild,
  done_epoch_count: doneRows.length,
  expected_root_count: expectedRoots.length,
  expected_allowlist_count: expectedSet.size,
  allowlist_count: allowlist.length,
  tar_entry_count: tarEntries.length,
  extracted_checks: extractedChecks,
  missing: errors.filter((e) => e.includes('missing')),
  mismatches: errors.filter((e) => e.includes('mismatch') || e.includes('sha mismatch')),
  errors,
  status: errors.length ? 'FAIL' : 'PASS'
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  console.error('verify:release:chain FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('verify:release:chain PASSED');
