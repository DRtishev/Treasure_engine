import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { sha256Text, stableEvidenceNormalize, RUN_ID } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');

// Normalize then snapshot all .md files in EVIDENCE_DIR root only
function snapshot() {
  if (!fs.existsSync(EVIDENCE_DIR)) return { fingerprint: 'EMPTY', files: [] };
  const files = fs.readdirSync(EVIDENCE_DIR)
    .filter((f) => fs.statSync(path.join(EVIDENCE_DIR, f)).isFile() && f.endsWith('.md'))
    .sort();
  const entries = files.map((f) => {
    const raw = fs.readFileSync(path.join(EVIDENCE_DIR, f), 'utf8');
    const normalized = stableEvidenceNormalize(raw);
    return { file: f, hash: sha256Text(normalized) };
  });
  const fingerprint = sha256Text(entries.map((e) => `${e.file}:${e.hash}`).join('\n'));
  return { fingerprint, files: entries };
}

function runEdgeAll() {
  execSync('node scripts/edge/edge_lab/edge_all.mjs', { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
  return snapshot();
}

console.log('[edge:all:x2] Running edge:all run 1 of 2...');
const snap1 = runEdgeAll();
console.log(`[edge:all:x2] Run 1 fingerprint: ${snap1.fingerprint}`);

console.log('[edge:all:x2] Running edge:all run 2 of 2...');
const snap2 = runEdgeAll();
console.log(`[edge:all:x2] Run 2 fingerprint: ${snap2.fingerprint}`);

const status = snap1.fingerprint === snap2.fingerprint ? 'PASS' : 'FAIL';
const reason = status === 'PASS' ? 'NONE' : 'NONDETERMINISM';

// Build file hash matrix
const allFiles = new Set([...snap1.files.map((e) => e.file), ...snap2.files.map((e) => e.file)]);
const matrix = [...allFiles].sort().map((f) => {
  const h1 = snap1.files.find((e) => e.file === f)?.hash || 'MISSING';
  const h2 = snap2.files.find((e) => e.file === f)?.hash || 'MISSING';
  return { file: f, sha256_run1: h1, sha256_run2: h2, match: h1 === h2 };
});
const driftFiles = matrix.filter((r) => !r.match).map((r) => r.file);

// Write evidence files (in EVIDENCE_DIR after second run)
fs.mkdirSync(MANUAL_DIR, { recursive: true });

const gateResult = {
  run_id: RUN_ID,
  status,
  reason_code: reason,
  message: status === 'PASS'
    ? 'edge:all is deterministic across two consecutive runs. Anti-flake independence verified.'
    : `Nondeterminism detected in edge:all output. Drift files: ${driftFiles.join(', ')}`,
  fingerprint_run1: snap1.fingerprint,
  fingerprint_run2: snap2.fingerprint,
  drift_files: driftFiles,
  file_count: snap1.files.length,
};
fs.writeFileSync(
  path.join(MANUAL_DIR, 'anti_flake_independence.json'),
  `${JSON.stringify(gateResult, null, 2)}\n`,
);

const matrixLines = matrix.map((r) =>
  `| ${r.file} | ${r.sha256_run1.slice(0, 16)}… | ${r.sha256_run2.slice(0, 16)}… | ${r.match ? 'MATCH' : 'DRIFT'} |`,
).join('\n');

const md = `# ANTI_FLAKE_INDEPENDENCE.md

STATUS: ${status}
REASON_CODE: ${reason}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${status === 'PASS' ? 'Proceed. edge:all is verified deterministic.' : 'Patch nondeterministic output listed in DRIFT_FILES.'}

## Methodology

Runs edge:all (producer pipeline) twice consecutively.
Each run wipes EVIDENCE_DIR and rebuilds all court outputs.
After each run: applies stableEvidenceNormalize() to all .md files, then SHA256-fingerprints all files.
Compares fingerprints between run1 and run2.
This check is INDEPENDENT of edge:next-epoch readiness gates.

## Fingerprints

| Run | Fingerprint |
|-----|-------------|
| run1 | ${snap1.fingerprint} |
| run2 | ${snap2.fingerprint} |

## File Hash Matrix

| File | SHA256 run1 (prefix) | SHA256 run2 (prefix) | Status |
|------|---------------------|---------------------|--------|
${matrixLines}

## DRIFT_FILES

${driftFiles.length ? driftFiles.map((f) => `- ${f}`).join('\n') : '- NONE'}

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/gates/manual/anti_flake_independence.json
`;

fs.writeFileSync(path.join(EVIDENCE_DIR, 'ANTI_FLAKE_INDEPENDENCE.md'), md);

if (status !== 'PASS') {
  console.error(`[FAIL] edge:all:x2 — NONDETERMINISM detected. Drift files: ${driftFiles.join(', ')}`);
  process.exit(1);
}

console.log('[PASS] edge:all:x2');
