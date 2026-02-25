import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd, stableEvidenceNormalize } from '../edge/edge_lab/canon.mjs';
import { runBounded } from './spawn_bounded.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const MANUAL_DIR = path.join(EXEC_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';
export const NOISY_CODEBLOCK_TARGETS = new Set(['reports/evidence/EXECUTOR/COMMANDS_RUN.md']);

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
  return { ec: run.ec, timed_out: run.timedOut };
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function normalizeRel(relPath) {
  return relPath.replace(/\\/g, '/');
}

export function normalizeForMega(content, rel, mode) {
  const relNorm = normalizeRel(rel);
  const base = stableEvidenceNormalize(content, { assertD005: false });
  const maybeCode = mode === 'noise' && NOISY_CODEBLOCK_TARGETS.has(relNorm)
    ? base.replace(/```[\s\S]*?```/g, '```<BLOCK>```')
    : base;
  return maybeCode
    .split(/\r?\n/)
    .filter((line) => !/^(STARTED_AT|COMPLETED_AT):\s*/.test(line.trim()))
    .filter((line) => !/^(STARTED_AT_MS|COMPLETED_AT_MS|ELAPSED_MS):\s*/.test(line.trim()))
    .filter((line) => !/^RUN_ID:\s*/.test(line.trim()))
    .filter((line) => !/^SHA256=/.test(line.trim()))
    .filter((line) => !/\b(STARTED_AT|COMPLETED_AT|RUN_ID):\s*/.test(line))
    .filter((line) => !/\b(STARTED_AT_MS|COMPLETED_AT_MS|ELAPSED_MS):\s*/.test(line))
    .filter((line) => !/sha256=/.test(line))
    .filter((line) => !/\bRUN_ID=/.test(line))
    .join('\n');
}

function diffHint(a, b) {
  const mapA = new Map((a?.perFile || []).map((x) => [x.path, x.sha256_norm]));
  const mapB = new Map((b?.perFile || []).map((x) => [x.path, x.sha256_norm]));
  return [...new Set([...mapA.keys(), ...mapB.keys()])]
    .sort((x, y) => x.localeCompare(y))
    .filter((k) => mapA.get(k) !== mapB.get(k));
}

function firstDiffPair(a, b, files) {
  for (const f of files) {
    const aa = (a.perFile || []).find((x) => x.path === f);
    const bb = (b.perFile || []).find((x) => x.path === f);
    if (aa && bb && aa.sha256_norm !== bb.sha256_norm) {
      return { path: f, sha256_norm_run1: aa.sha256_norm, sha256_norm_run2: bb.sha256_norm };
    }
  }
  return null;
}

function fingerprint(mode) {
  const perFile = [];
  for (const rel of TARGETS) {
    const relNorm = normalizeRel(rel);
    const abs = path.join(ROOT, relNorm);
    if (!fs.existsSync(abs)) return { ok: false, missing: relNorm, perFile: [] };
    const raw = fs.readFileSync(abs, 'utf8');
    const norm = normalizeForMega(raw, relNorm, mode);
    perFile.push({ path: relNorm, sha256_norm: sha256(norm) });
  }
  perFile.sort((a, b) => a.path.localeCompare(b.path));
  const aggregate = sha256(perFile.map((x) => `${x.path}:${x.sha256_norm}`).join('\n'));
  return { ok: true, missing: '', perFile, aggregate };
}

const run1 = runMegaProof();
const fp1_noise = run1.ec === 0 ? fingerprint('noise') : { ok: false, missing: 'epoch:mega:proof(run1)', perFile: [] };
const fp1_semantic = run1.ec === 0 ? fingerprint('semantic') : { ok: false, missing: 'epoch:mega:proof(run1)', perFile: [] };
const run2 = runMegaProof();
const fp2_noise = run2.ec === 0 ? fingerprint('noise') : { ok: false, missing: 'epoch:mega:proof(run2)', perFile: [] };
const fp2_semantic = run2.ec === 0 ? fingerprint('semantic') : { ok: false, missing: 'epoch:mega:proof(run2)', perFile: [] };

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'epoch:mega:proof x2 deterministic fingerprint match.';
let mismatch_mode = 'NONE';
let nd01_diff_hint_files = [];
let semantic_mismatch_files = [];
let first_semantic_diff_pair = null;

if (run1.timed_out || run2.timed_out) {
  status = 'BLOCKED';
  reasonCode = 'TO01';
  message = 'epoch:mega:proof timed out in one or both runs.';
} else if (run1.ec !== 0 || run2.ec !== 0) {
  status = 'BLOCKED';
  reasonCode = 'EC01';
  mismatch_mode = 'NONE';
  message = `epoch:mega:proof failed in one or both runs (run_1_ec=${run1.ec}, run_2_ec=${run2.ec}).`;
} else if (!fp1_noise.ok || !fp2_noise.ok || !fp1_semantic.ok || !fp2_semantic.ok) {
  status = 'FAIL';
  reasonCode = 'ND01';
  mismatch_mode = 'NOISE';
  message = `Missing fingerprint input file: ${fp1_noise.missing || fp2_noise.missing || fp1_semantic.missing || fp2_semantic.missing}.`;
} else if (fp1_noise.aggregate !== fp2_noise.aggregate) {
  status = 'FAIL';
  reasonCode = 'ND01';
  mismatch_mode = 'NOISE';
  nd01_diff_hint_files = diffHint(fp1_noise, fp2_noise);
  message = 'Determinism mismatch: noise-stripped aggregate differs across x2 runs.';
} else if (fp1_semantic.aggregate !== fp2_semantic.aggregate) {
  status = 'FAIL';
  reasonCode = 'ND01_SEM01';
  mismatch_mode = 'SEMANTIC';
  nd01_diff_hint_files = diffHint(fp1_semantic, fp2_semantic);
  semantic_mismatch_files = nd01_diff_hint_files.slice();
  first_semantic_diff_pair = firstDiffPair(fp1_semantic, fp2_semantic, semantic_mismatch_files);
  message = 'Determinism mismatch: semantic aggregate differs across x2 runs.';
}

writeMd(path.join(EXEC_DIR, 'MEGA_PROOF_X2.md'), `# MEGA_PROOF_X2.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n## Runs\n\n- run_1_ec: ${run1.ec}\n- run_2_ec: ${run2.ec}\n- mismatch_mode: ${mismatch_mode}\n\n## Fingerprints\n\n- aggregate_noise_run1: ${fp1_noise.aggregate || 'MISSING'}\n- aggregate_noise_run2: ${fp2_noise.aggregate || 'MISSING'}\n- aggregate_semantic_run1: ${fp1_semantic.aggregate || 'MISSING'}\n- aggregate_semantic_run2: ${fp2_semantic.aggregate || 'MISSING'}\n\n## ND01_DIFF_HINT_FILES\n\n${nd01_diff_hint_files.map((x)=>`- ${x}`).join('\n') || '- NONE'}\n\n## SEMANTIC_MISMATCH_FILES\n\n${semantic_mismatch_files.map((x)=>`- ${x}`).join('\n') || '- NONE'}\n\n- first_semantic_diff_pair: ${first_semantic_diff_pair ? `${first_semantic_diff_pair.path} ${first_semantic_diff_pair.sha256_norm_run1} ${first_semantic_diff_pair.sha256_norm_run2}` : 'NONE'}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'mega_proof_x2.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  run_1_ec: run1.ec,
  run_2_ec: run2.ec,
  aggregate_noise_run1: fp1_noise.aggregate || null,
  aggregate_noise_run2: fp2_noise.aggregate || null,
  aggregate_semantic_run1: fp1_semantic.aggregate || null,
  aggregate_semantic_run2: fp2_semantic.aggregate || null,
  mismatch_mode,
  noisy_targets: [...NOISY_CODEBLOCK_TARGETS].sort((a, b) => a.localeCompare(b)),
  normalized_paths_used: true,
  inputs_noise_run1: fp1_noise.perFile || [],
  inputs_noise_run2: fp2_noise.perFile || [],
  inputs_semantic_run1: fp1_semantic.perFile || [],
  inputs_semantic_run2: fp2_semantic.perFile || [],
  nd01_diff_hint_files,
  semantic_mismatch_files,
  first_semantic_diff_pair,
});

console.log(`[${status}] executor_mega_proof_x2 — ${reasonCode}`);

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  process.exit(status === 'PASS' ? 0 : 1);
}
