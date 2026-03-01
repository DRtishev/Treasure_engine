/**
 * regression_pr05_executor_ssot_stable_set.mjs — RG_PR05_EXECUTOR_SSOT_STABLE_SET
 *
 * Hardens reports/evidence/EXECUTOR against evidence-bloat and runtime-snapshot drift.
 *
 * ALLOWLIST (new commits may only add these):
 *   reports/evidence/EXECUTOR/REGRESSION_*.md
 *   reports/evidence/EXECUTOR/gates/manual/*.json
 *   reports/evidence/EXECUTOR/MERGE_PLAN.md
 *
 * FORBIDDEN anywhere inside EXECUTOR (fail-closed, static scan):
 *   *.log  *.zip  *.tar.gz  *.tar.xz
 *   Any file added via git diff origin/main that is NOT in the allowlist above.
 *
 * Gate ID : RG_PR05_EXECUTOR_SSOT_STABLE_SET
 * Wired   : verify:fast
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_PR05_EXECUTOR_SSOT_STABLE_SET';
const NEXT_ACTION = 'npm run -s verify:fast';

// --- Forbidden-extension static scan (any file in EXECUTOR tree) ---
const FORBIDDEN_EXTS = ['.log', '.zip', '.tar.gz', '.tar.xz', '.tar.bz2'];

function walkForbidden(dir) {
  const hits = [];
  if (!fs.existsSync(dir)) return hits;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hits.push(...walkForbidden(full));
    } else {
      const lower = entry.name.toLowerCase();
      if (FORBIDDEN_EXTS.some((ext) => lower.endsWith(ext))) {
        hits.push(path.relative(ROOT, full));
      }
    }
  }
  return hits;
}

// --- Allowlist check for files newly added since origin/main ---
//
// ALLOWED relative patterns (relative to ROOT):
//   reports/evidence/EXECUTOR/REGRESSION_*.md
//   reports/evidence/EXECUTOR/gates/manual/*.json
//   reports/evidence/EXECUTOR/MERGE_PLAN.md
//
// Everything else newly added under EXECUTOR is a violation.

function isAllowlisted(relPath) {
  const execPrefix = 'reports/evidence/EXECUTOR/';
  if (!relPath.startsWith(execPrefix)) return true; // outside EXECUTOR — not our concern here
  const tail = relPath.slice(execPrefix.length);

  if (/^REGRESSION_[^/]+\.md$/.test(tail)) return true;
  if (/^gates\/manual\/[^/]+\.json$/.test(tail)) return true;
  if (tail === 'MERGE_PLAN.md') return true;
  // Directories themselves (no extension) are not file entries — skip
  return false;
}

const hasOriginMain = spawnSync(
  'git', ['show-ref', '--verify', '--quiet', 'refs/remotes/origin/main']
).status === 0;

let newNonAllowlisted = [];
if (hasOriginMain) {
  const diff = spawnSync(
    'git',
    ['diff', '--name-only', '--diff-filter=A', 'refs/remotes/origin/main...HEAD', '--',
      'reports/evidence/EXECUTOR'],
    { encoding: 'utf8' }
  );
  const added = String(diff.stdout || '').split('\n').map((x) => x.trim()).filter(Boolean);
  newNonAllowlisted = added.filter((f) => !isAllowlisted(f)).sort((a, b) => a.localeCompare(b));
}

// --- Combine results ---
const forbiddenExtHits = walkForbidden(EXEC);
const checks = {
  forbidden_ext_files_n: forbiddenExtHits.length,
  new_non_allowlisted_n: newNonAllowlisted.length,
  origin_main_present: hasOriginMain,
};

const ok = forbiddenExtHits.length === 0 && newNonAllowlisted.length === 0;
const status = ok ? 'PASS' : 'FAIL';
let reason_code = 'NONE';
if (!ok) {
  if (forbiddenExtHits.length > 0) reason_code = 'RG_PR05_FORBIDDEN_EXT';
  else reason_code = 'RG_PR05_NON_ALLOWLIST_ADDED';
}

const offenders = [...forbiddenExtHits.map((f) => `EXT:${f}`),
  ...newNonAllowlisted.map((f) => `NEW:${f}`)];

writeMd(path.join(EXEC, 'REGRESSION_PR05_EXECUTOR_SSOT_STABLE_SET.md'), [
  '# REGRESSION_PR05_EXECUTOR_SSOT_STABLE_SET.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## ALLOWLIST',
  '- REGRESSION_*.md',
  '- gates/manual/*.json',
  '- MERGE_PLAN.md', '',
  '## FORBIDDEN (static scan)',
  FORBIDDEN_EXTS.map((e) => `- *${e}`).join('\n'), '',
  `## CHECKS`,
  `- origin_main_present: ${hasOriginMain}`,
  `- forbidden_ext_files_n: ${forbiddenExtHits.length}`,
  `- new_non_allowlisted_n: ${newNonAllowlisted.length}`, '',
  '## OFFENDERS',
  offenders.length > 0 ? offenders.map((o) => `- ${o}`).join('\n') : '- NONE',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_pr05_executor_ssot_stable_set.json'), {
  schema_version: '1.0.0',
  gate_id: GATE_ID,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  offenders,
});

console.log(`[${status}] regression_pr05_executor_ssot_stable_set — ${reason_code}`);
process.exit(ok ? 0 : 1);
