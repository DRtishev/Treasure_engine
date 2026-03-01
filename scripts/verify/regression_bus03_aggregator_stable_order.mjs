/**
 * regression_bus03_aggregator_stable_order.mjs — RG_BUS03_AGGREGATOR_STABLE_ORDER
 *
 * Gate: ops:cockpit must produce byte-identical HUD.json when run twice
 *       in the same evidence tree (no mtime drift, stable event merge order).
 *
 * Fix: findAllBusJsonls uses repo-relative POSIX canonSort;
 *      mergeAndSortEvents sorts by tick, component, event, run_id.
 *
 * On failure: ND01_SEM01 + diff_paths[] evidence.
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const COCKPIT_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'cockpit.mjs');
const checks = [];

checks.push({ check: 'cockpit_script_exists', pass: fs.existsSync(COCKPIT_SCRIPT), detail: COCKPIT_SCRIPT });

// Normalize HUD.json for comparison — strip run_id and epoch names that include RUN_ID
function normalizeHud(content) {
  return content
    .replace(/"run_id"\s*:\s*"[^"]*"/g, '"run_id":"NORMALIZED"')
    .replace(/EPOCH-COCKPIT-[^\/\\"]+/g, 'EPOCH-COCKPIT-NORMALIZED')
    .replace(/EPOCH-EVENTBUS-[^\/\\"]+/g, 'EPOCH-EVENTBUS-NORMALIZED')
    .replace(/EPOCH-TIMEMACHINE-[^\/\\"]+/g, 'EPOCH-TIMEMACHINE-NORMALIZED')
    .replace(/EPOCH-AUTOPILOTV2-[^\/\\"]+/g, 'EPOCH-AUTOPILOTV2-NORMALIZED')
    .replace(/EPOCH-REGISTRY-[^\/\\"]+/g, 'EPOCH-REGISTRY-NORMALIZED')
    .replace(/EPOCH-LIFE-[^\/\\"]+/g, 'EPOCH-LIFE-NORMALIZED');
}

function runCockpit() {
  const r = spawnSync(process.execPath, [COCKPIT_SCRIPT], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env },
  });
  if (r.status !== 0) return { ok: false, hash: null, content: '', path: null };

  // Find the HUD.json just written (latest EPOCH-COCKPIT-* dir lex sort)
  const dirs = fs.existsSync(EVIDENCE_DIR)
    ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-COCKPIT-')).sort()
    : [];
  if (!dirs.length) return { ok: false, hash: null, content: '', path: null };
  const hudPath = path.join(EVIDENCE_DIR, dirs[dirs.length - 1], 'HUD.json');
  if (!fs.existsSync(hudPath)) return { ok: false, hash: null, content: '', path: null };

  const raw = fs.readFileSync(hudPath, 'utf8');
  const norm = normalizeHud(raw);
  return {
    ok: true,
    hash: crypto.createHash('sha256').update(norm).digest('hex'),
    content: norm,
    path: path.relative(ROOT, hudPath),
  };
}

if (fs.existsSync(COCKPIT_SCRIPT)) {
  const r1 = runCockpit();
  const r2 = runCockpit();

  checks.push({ check: 'cockpit_run1_ok', pass: r1.ok, detail: r1.ok ? `path=${r1.path}` : 'cockpit failed to run' });
  checks.push({ check: 'cockpit_run2_ok', pass: r2.ok, detail: r2.ok ? `path=${r2.path}` : 'cockpit failed to run' });

  if (r1.ok && r2.ok) {
    const stable = r1.hash === r2.hash;
    checks.push({
      check: 'hud_json_byte_identical_x2',
      pass: stable,
      detail: stable
        ? `hash=${r1.hash.slice(0, 16)}… — OK`
        : `DRIFT! r1=${r1.hash.slice(0, 16)} r2=${r2.hash.slice(0, 16)}`,
    });

    if (!stable) {
      // Compute diff_paths for evidence
      const lines1 = r1.content.split('\n');
      const lines2 = r2.content.split('\n');
      const diffLines = lines1
        .map((l, i) => (l !== (lines2[i] ?? '') ? `L${i + 1}: ${l.trim().slice(0, 80)}` : null))
        .filter(Boolean)
        .slice(0, 20);
      checks.push({ check: 'drift_diff_paths', pass: false, detail: `ND01_SEM01: ${diffLines.join(' | ')}` });
    }
  }

  // Also verify cockpit exports mergeAndSortEvents usage
  const busScript = path.join(ROOT, 'scripts', 'ops', 'eventbus_v1.mjs');
  if (fs.existsSync(busScript)) {
    const busContent = fs.readFileSync(busScript, 'utf8');
    checks.push({
      check: 'eventbus_exports_mergeAndSortEvents',
      pass: busContent.includes('mergeAndSortEvents'),
      detail: 'mergeAndSortEvents export required for BUS03',
    });
    // Check only non-comment, non-string lines for actual mtime API calls
    const busCodeLines = busContent.split('\n')
      .filter((l) => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*'); });
    const busCodeNonComment = busCodeLines.join('\n');
    const hasMtimeCall = busCodeNonComment.includes('.mtime') || busCodeNonComment.includes('fs.stat(') || busCodeNonComment.includes('fs.statSync(');
    checks.push({
      check: 'findAllBusJsonls_no_mtime',
      pass: !hasMtimeCall,
      detail: hasMtimeCall
        ? 'FAIL: mtime API call detected in eventbus_v1.mjs'
        : 'no mtime API calls in eventbus_v1.mjs — OK',
    });
  }

  const cockpitContent = fs.readFileSync(COCKPIT_SCRIPT, 'utf8');
  checks.push({
    check: 'cockpit_uses_mergeAndSortEvents',
    pass: cockpitContent.includes('mergeAndSortEvents'),
    detail: cockpitContent.includes('mergeAndSortEvents')
      ? 'cockpit uses mergeAndSortEvents — OK'
      : 'FAIL: cockpit still uses flatMap without sort',
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'ND01_SEM01';

writeMd(path.join(EXEC, 'REGRESSION_BUS03.md'), [
  '# REGRESSION_BUS03.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_bus03.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_BUS03_AGGREGATOR_STABLE_ORDER',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_bus03_aggregator_stable_order — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
