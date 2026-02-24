import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd, stableEvidenceNormalize } from '../edge/edge_lab/canon.mjs';
import { runBounded } from './spawn_bounded.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const MANUAL_DIR = path.join(EXEC_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';

const TARGETS = [
  'reports/evidence/EXECUTOR/COMMANDS_RUN.md',
  'reports/evidence/EXECUTOR/COMMANDS_RUN_GUARD.md',
  'reports/evidence/GOV/EXPORT_CONTRACT_INTEGRITY.md',
  'reports/evidence/GOV/FINAL_VALIDATED_INDEX.md',
  'reports/evidence/EDGE_PROFIT_00/registry/RELEASE_ARTIFACTS.md',
];

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function runMegaProof() {
  const run = runBounded('npm run -s epoch:mega:proof', { cwd: ROOT, env: process.env, maxBuffer: 32 * 1024 * 1024 });
  return { ec: run.ec, stdout: run.stdout || '', stderr: run.stderr || '', timed_out: run.timedOut };
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function normalizeForMega(content) {
  const base = stableEvidenceNormalize(content, { assertD005: false });
  return base
    .split(/\r?\n/)
    .filter((line) => !/^(STARTED_AT|COMPLETED_AT):\s*/.test(line.trim()))
    .filter((line) => !/^RUN_ID:\s*/.test(line.trim()))
    .filter((line) => !/^SHA256=/.test(line.trim()))
    .filter((line) => !/\b(STARTED_AT|COMPLETED_AT|RUN_ID):\s*/.test(line))
    .filter((line) => !/sha256=/.test(line))
    .join('\n');
}


function diffHint(a, b) {
  const mapA = new Map((a?.perFile || []).map((x) => [x.path, x.sha256_norm]));
  const mapB = new Map((b?.perFile || []).map((x) => [x.path, x.sha256_norm]));
  const all = [...new Set([...mapA.keys(), ...mapB.keys()])].sort((x, y) => x.localeCompare(y));
  return all.filter((k) => mapA.get(k) !== mapB.get(k));
}

function fingerprint() {
  const perFile = [];
  for (const rel of TARGETS) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      return { ok: false, missing: rel, perFile: [] };
    }
    const raw = fs.readFileSync(abs, 'utf8');
    const norm = normalizeForMega(raw);
    perFile.push({ path: rel, sha256_norm: sha256(norm) });
  }
  const aggregate = sha256(perFile.map((x) => `${x.path}:${x.sha256_norm}`).join('\n'));
  return { ok: true, missing: '', perFile, aggregate };
}

const run1 = runMegaProof();
const fp1 = run1.ec === 0 ? fingerprint() : { ok: false, missing: 'epoch:mega:proof(run1)', perFile: [] };
const run2 = runMegaProof();
const fp2 = run2.ec === 0 ? fingerprint() : { ok: false, missing: 'epoch:mega:proof(run2)', perFile: [] };

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'epoch:mega:proof x2 deterministic fingerprint match.';
let nd01_diff_hint_files = [];

if (run1.timed_out || run2.timed_out) {
  status = 'BLOCKED';
  reasonCode = 'TO01';
  message = 'epoch:mega:proof timed out in one or both runs.';
} else if (run1.ec !== 0 || run2.ec !== 0) {
  status = 'FAIL';
  reasonCode = 'ND01';
  message = 'epoch:mega:proof failed in one or both runs.';
} else if (!fp1.ok || !fp2.ok) {
  status = 'FAIL';
  reasonCode = 'ND01';
  message = `Missing fingerprint input file: ${fp1.missing || fp2.missing}.`;
} else if (fp1.aggregate !== fp2.aggregate) {
  status = 'FAIL';
  reasonCode = 'ND01';
  nd01_diff_hint_files = diffHint(fp1, fp2);
  message = 'Determinism mismatch: aggregate normalized fingerprints differ across x2 runs.';
}

writeMd(path.join(EXEC_DIR, 'MEGA_PROOF_X2.md'), `# MEGA_PROOF_X2.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n## Runs\n\n- run_1_ec: ${run1.ec}\n- run_2_ec: ${run2.ec}\n\n## Fingerprints\n\n- aggregate_run_1: ${fp1.aggregate || 'MISSING'}\n- aggregate_run_2: ${fp2.aggregate || 'MISSING'}\n\n## Inputs\n\n${(fp1.perFile || []).map((x) => `- run1 ${x.path} | sha256_norm=${x.sha256_norm}`).join('\n') || '- NONE'}\n${(fp2.perFile || []).map((x) => `- run2 ${x.path} | sha256_norm=${x.sha256_norm}`).join('\n') || '- NONE'}\n\n## ND01_DIFF_HINT_FILES\n\n${nd01_diff_hint_files.map((x)=>`- ${x}`).join('\n') || '- NONE'}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'mega_proof_x2.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  run_1_ec: run1.ec,
  run_2_ec: run2.ec,
  aggregate_run_1: fp1.aggregate || null,
  aggregate_run_2: fp2.aggregate || null,
  inputs_run_1: fp1.perFile || [],
  inputs_run_2: fp2.perFile || [],
  nd01_diff_hint_files,
});

console.log(`[${status}] executor_mega_proof_x2 — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
