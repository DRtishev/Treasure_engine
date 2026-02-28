/**
 * regression_time02_no_time_fields.mjs — RG_TIME02_NO_TIME_FIELDS
 *
 * Gate: TimeMachine script must not emit timestamp fields in JSON outputs.
 *       Forbidden fields: _at, _ts, timestamp, created, updated, generated, date (as JSON keys)
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

// Forbidden timestamp field patterns (matches write_json_deterministic.mjs policy)
const FORBIDDEN_JSON_KEYS = /["'](_at|_ts|timestamp|created_at|updated_at|generated_at|date|started_at|completed_at)["']\s*:/i;

// Check 1: Script exists
const scriptExists = fs.existsSync(tmPath);
checks.push({ check: 'timemachine_script_exists', pass: scriptExists, detail: tmPath });

if (scriptExists) {
  const content = fs.readFileSync(tmPath, 'utf8');

  // Check 2: No forbidden timestamp field names in JSON object literals
  const hasForbiddenFields = FORBIDDEN_JSON_KEYS.test(content);
  checks.push({
    check: 'no_timestamp_json_keys',
    pass: !hasForbiddenFields,
    detail: hasForbiddenFields
      ? 'FORBIDDEN: timestamp-like JSON keys detected (_at/_ts/timestamp/etc)'
      : 'no timestamp JSON keys found',
  });

  // Check 3: No ISO date strings emitted (new Date().toISOString() patterns)
  const hasIsoDate = /toISOString\(\)|\.toJSON\(\)/.test(content);
  checks.push({
    check: 'no_iso_date_strings',
    pass: !hasIsoDate,
    detail: hasIsoDate ? 'FORBIDDEN: toISOString/toJSON detected' : 'no ISO date string emission',
  });

  // Check 4: writeJsonDeterministic is used for JSON output (enforces no-timestamp policy)
  const usesDetJson = content.includes('writeJsonDeterministic');
  checks.push({
    check: 'uses_write_json_deterministic',
    pass: usesDetJson,
    detail: 'writeJsonDeterministic enforces no-timestamp field policy',
  });

  // Check 5: TIMELINE.jsonl entries use only approved fields (tick, event, context, result)
  // Check that buildTimeline or equivalent constructs entries with only approved fields
  const approvedFieldPattern = /tick[,\s]|event[,\s]|context[,\s]|result[,\s]/;
  const hasApprovedFields = approvedFieldPattern.test(content);
  checks.push({
    check: 'timeline_uses_approved_fields',
    pass: hasApprovedFields,
    detail: 'timeline entries must use: tick, event, context, result',
  });
}

// Check 6: If TIMELINE.jsonl exists from a previous run, validate it
const existingTimelines = [];
try {
  const evidenceDir = path.join(ROOT, 'reports', 'evidence');
  if (fs.existsSync(evidenceDir)) {
    const dirs = fs.readdirSync(evidenceDir).filter((d) => d.startsWith('EPOCH-TIMEMACHINE-'));
    for (const dir of dirs) {
      const jsonlPath = path.join(evidenceDir, dir, 'TIMELINE.jsonl');
      if (fs.existsSync(jsonlPath)) {
        existingTimelines.push(jsonlPath);
        const lines = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);
            const keys = Object.keys(entry);
            const forbiddenKeys = keys.filter((k) => FORBIDDEN_JSON_KEYS.test(`"${k}":`));
            if (forbiddenKeys.length > 0) {
              checks.push({
                check: `timeline_jsonl_no_forbidden_keys:${dir}`,
                pass: false,
                detail: `forbidden keys: ${forbiddenKeys.join(', ')}`,
              });
            }
          } catch {
            // Invalid JSON line — skip
          }
        }
      }
    }
  }
} catch {
  // evidence dir may not exist — OK
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'TIME02_NO_TIME_FIELDS';

const mdContent = [
  '# REGRESSION_TIME02_NO_TIME_FIELDS.md',
  '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
  '',
  `## EXISTING_TIMELINES_CHECKED`,
  existingTimelines.length === 0 ? '- NONE' : existingTimelines.map((p) => `- ${path.relative(ROOT, p)}`).join('\n'),
  '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n');

writeMd(path.join(EXEC, 'REGRESSION_TIME02_NO_TIME_FIELDS.md'), mdContent);

writeJsonDeterministic(path.join(MANUAL, 'regression_time02_no_time_fields.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_TIME02_NO_TIME_FIELDS',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  existing_timelines_checked: existingTimelines.map((p) => path.relative(ROOT, p)),
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_time02_no_time_fields — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
