/**
 * regression_bus02_write_scope.mjs — RG_BUS02_WRITE_SCOPE
 *
 * Gate: EventBus writes ONLY to EPOCH-EVENTBUS-<run_id>/ dirs.
 *       Script must not write to EXECUTOR or artifacts directly.
 * Surface: OFFLINE_AUTHORITY
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
const BUS_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'eventbus_v1.mjs');

const checks = [];
checks.push({ check: 'eventbus_script_exists', pass: fs.existsSync(BUS_SCRIPT), detail: BUS_SCRIPT });

if (fs.existsSync(BUS_SCRIPT)) {
  const content = fs.readFileSync(BUS_SCRIPT, 'utf8');

  // Check: output path includes EPOCH-EVENTBUS-
  checks.push({ check: 'output_uses_epoch_eventbus_pattern', pass: content.includes('EPOCH-EVENTBUS-'), detail: 'output path must include EPOCH-EVENTBUS-' });

  // Check: no direct EXECUTOR writes
  const hasExecutorWrite = /path\.join\([^)]*EXECUTOR[^)]*\)\s*[,)]/.test(content) &&
    !/\/\/ .*EXECUTOR/.test(content);
  // More precise: look for writeFile/writeJson calls with EXECUTOR in path
  const execWrites = content.split('\n').filter((l) =>
    !l.trim().startsWith('//') &&
    (l.includes('writeFile') || l.includes('writeJson') || l.includes('writeMd')) &&
    l.includes('EXECUTOR')
  );
  checks.push({ check: 'no_executor_writes_in_bus', pass: execWrites.length === 0, detail: execWrites.length === 0 ? 'OK' : `EXECUTOR writes: ${execWrites[0].trim()}` });

  // Check: uses writeJsonDeterministic (schema lock)
  checks.push({ check: 'uses_write_json_deterministic', pass: content.includes('writeJsonDeterministic'), detail: 'deterministic JSON required' });

  // Check: no wall-clock time in output
  const nonComments = content.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const hasWallClock = /\bnew Date\b|\bDate\.now\b|\bperformance\.now\(|\bprocess\.hrtime\b/.test(nonComments);
  checks.push({ check: 'no_wall_clock_in_bus', pass: !hasWallClock, detail: hasWallClock ? 'FORBIDDEN: wall-clock detected' : 'OK' });

  // Check: tick is auto-incremented (no random/Math.random)
  const hasRandom = /Math\.random|crypto\.randomUUID|randomBytes/.test(nonComments);
  checks.push({ check: 'ticks_not_random', pass: !hasRandom, detail: hasRandom ? 'FORBIDDEN: random in tick generation' : 'tick counter is deterministic' });

  // Check: findLatestBusJsonl uses lexicographic sort not mtime
  // Strip comments before checking to avoid false positives
  const nonCommentFull = content.split('\n').filter((l) => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*'); }).join('\n');
  const usesSort = nonCommentFull.includes('localeCompare') || nonCommentFull.includes('.sort(');
  const usesMtime = nonCommentFull.includes('mtime') || nonCommentFull.includes('mtimeMs');
  checks.push({ check: 'latest_epoch_by_lex_not_mtime', pass: usesSort && !usesMtime, detail: usesMtime ? 'FORBIDDEN: mtime used in non-comment code' : 'lexicographic sort used' });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'CHURN01';

writeMd(path.join(EXEC, 'REGRESSION_BUS02_WRITE_SCOPE.md'), [
  '# REGRESSION_BUS02_WRITE_SCOPE.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED', failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));
writeJsonDeterministic(path.join(MANUAL, 'regression_bus02_write_scope.json'), {
  schema_version: '1.0.0', gate_id: 'RG_BUS02_WRITE_SCOPE',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, checks, failed_checks: failed.map((c) => c.check),
});
console.log(`[${status}] regression_bus02_write_scope — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
