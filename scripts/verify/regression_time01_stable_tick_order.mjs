/**
 * regression_time01_stable_tick_order.mjs — RG_TIME01_STABLE_TICK_ORDER
 *
 * Gate: timemachine_ledger.mjs must exist and declare a deterministic,
 *       monotonically-increasing tick sequence.
 * Surface: UX
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';

const tmPath = path.join(ROOT, 'scripts', 'ops', 'timemachine_ledger.mjs');
const checks = [];

// Check 1: Script exists
const scriptExists = fs.existsSync(tmPath);
checks.push({ check: 'timemachine_script_exists', pass: scriptExists, detail: tmPath });

if (scriptExists) {
  const content = fs.readFileSync(tmPath, 'utf8');

  // Check 2: Uses tick field (not timestamp)
  const hasTick = content.includes('tick:') || content.includes("'tick'");
  checks.push({ check: 'script_uses_tick_field', pass: hasTick, detail: 'tick field required for tick-only ordering' });

  // Check 3: Does NOT use Date, performance.now, or hrtime (no wall-clock time)
  // Strip comment lines before checking to avoid false positives from doc comments
  const nonCommentLines = content.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const hasDateUsage = /\bnew Date\b|\bDate\.now\b|\bperformance\.now\(|\bprocess\.hrtime\b/.test(nonCommentLines);
  checks.push({
    check: 'script_no_wall_clock_time',
    pass: !hasDateUsage,
    detail: hasDateUsage ? 'FORBIDDEN: Date/performance.now/hrtime detected in non-comment code' : 'no wall-clock time usage',
  });

  // Check 4: Has DECLARED_EVENTS array (deterministic order)
  const hasDeclaredEvents = content.includes('DECLARED_EVENTS');
  checks.push({ check: 'script_has_declared_events', pass: hasDeclaredEvents, detail: 'DECLARED_EVENTS required for stable tick order' });

  // Check 5: Writes TIMELINE.jsonl
  const writesTimeline = content.includes('TIMELINE.jsonl');
  checks.push({ check: 'script_writes_timeline_jsonl', pass: writesTimeline, detail: 'TIMELINE.jsonl output required' });

  // Check 6: Writes TIMELINE.md
  const writesTimelineMd = content.includes('TIMELINE.md');
  checks.push({ check: 'script_writes_timeline_md', pass: writesTimelineMd, detail: 'TIMELINE.md output required' });

  // Check 7: Output path under EPOCH-TIMEMACHINE-*
  const hasEpochDir = content.includes('EPOCH-TIMEMACHINE-');
  checks.push({ check: 'script_epoch_dir_pattern', pass: hasEpochDir, detail: 'output must be under EPOCH-TIMEMACHINE-<RUN_ID>' });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'TIME01_TICK_ORDER';

const mdContent = [
  '# REGRESSION_TIME01_STABLE_TICK_ORDER.md',
  '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
  '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n');

writeMd(path.join(EXEC, 'REGRESSION_TIME01_STABLE_TICK_ORDER.md'), mdContent);

writeJsonDeterministic(path.join(MANUAL, 'regression_time01_stable_tick_order.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_TIME01_STABLE_TICK_ORDER',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_time01_stable_tick_order — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
