/**
 * regression_evt01_schema_lock.mjs — RG_EVT01_SCHEMA_LOCK
 *
 * Gate: event_schema_v1.mjs exports the canonical schema and the
 *       SSOT_EVENT_SCHEMA_V1.md is present with matching version.
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { validate, canonicalize, makeEvent, EVENT_SCHEMA_VERSION, VALID_MODES, VALID_COMPONENTS } from '../ops/event_schema_v1.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });
const NEXT_ACTION = 'npm run -s verify:fast';

const checks = [];

// Check 1: SSOT doc exists
const ssotPath = path.join(ROOT, 'docs', 'SSOT_EVENT_SCHEMA_V1.md');
checks.push({ check: 'ssot_doc_exists', pass: fs.existsSync(ssotPath), detail: ssotPath });

if (fs.existsSync(ssotPath)) {
  const ssot = fs.readFileSync(ssotPath, 'utf8');
  checks.push({ check: 'ssot_has_version_1_0_0', pass: ssot.includes('1.0.0'), detail: 'SSOT must declare version 1.0.0' });
  checks.push({ check: 'ssot_has_forbidden_fields_section', pass: ssot.includes('FORBIDDEN'), detail: 'SSOT must document forbidden fields' });
  checks.push({ check: 'ssot_has_tick_field', pass: ssot.includes('tick'), detail: 'SSOT must declare tick field' });
}

// Check 2: Schema version exported correctly
checks.push({ check: 'schema_version_is_1_0_0', pass: EVENT_SCHEMA_VERSION === '1.0.0', detail: `EVENT_SCHEMA_VERSION=${EVENT_SCHEMA_VERSION}` });

// Check 3: Validator rejects missing fields
const badEvent = { tick: 1 };
const r1 = validate(badEvent);
checks.push({ check: 'validator_rejects_missing_fields', pass: !r1.ok, detail: r1.ok ? 'should have failed' : `errors: ${r1.errors.slice(0, 2).join('; ')}` });

// Check 4: Validator accepts a correct event
const goodEvent = {
  schema_version: '1.0.0', tick: 1, run_id: 'abc123', mode: 'CERT',
  component: 'TIMEMACHINE', event: 'HEARTBEAT', reason_code: 'NONE',
  surface: 'UX', evidence_paths: [], attrs: {},
};
const r2 = validate(goodEvent);
checks.push({ check: 'validator_accepts_correct_event', pass: r2.ok, detail: r2.ok ? 'OK' : r2.errors.join('; ') });

// Check 5: Canonicalize sorts evidence_paths and attrs keys
const unsorted = {
  ...goodEvent, tick: 2,
  evidence_paths: ['reports/b.md', 'reports/a.md'],
  attrs: { z: 1, a: 2 },
};
const canon = canonicalize(unsorted);
const pathsSorted = JSON.stringify(canon.evidence_paths) === JSON.stringify(['reports/a.md', 'reports/b.md']);
const attrsSorted = JSON.stringify(Object.keys(canon.attrs)) === JSON.stringify(['a', 'z']);
checks.push({ check: 'canonicalize_sorts_paths', pass: pathsSorted, detail: `got: ${JSON.stringify(canon.evidence_paths)}` });
checks.push({ check: 'canonicalize_sorts_attrs', pass: attrsSorted, detail: `got: ${JSON.stringify(Object.keys(canon.attrs))}` });

// Check 6: makeEvent factory works
let factoryOk = false;
try {
  const ev = makeEvent({ tick: 3, run_id: 'test123', component: 'EVENTBUS', event: 'BUS_INIT' });
  factoryOk = ev.schema_version === '1.0.0' && ev.tick === 3 && ev.component === 'EVENTBUS';
} catch {}
checks.push({ check: 'make_event_factory_works', pass: factoryOk, detail: factoryOk ? 'OK' : 'makeEvent threw or returned wrong shape' });

// Check 7: All valid modes declared
for (const m of ['CERT', 'CLOSE', 'AUDIT', 'RESEARCH', 'ACCEL', 'LIFE']) {
  checks.push({ check: `mode_${m}_declared`, pass: VALID_MODES.includes(m), detail: `mode ${m} in VALID_MODES` });
}

// Check 8: All valid components declared
for (const c of ['TIMEMACHINE', 'AUTOPILOT', 'COCKPIT', 'REGISTRY', 'EVENTBUS', 'LIFE']) {
  checks.push({ check: `component_${c}_declared`, pass: VALID_COMPONENTS.includes(c), detail: `component ${c} in VALID_COMPONENTS` });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'REG01_SCHEMA_MISMATCH';

writeMd(path.join(EXEC, 'REGRESSION_EVT01_SCHEMA_LOCK.md'), [
  '# REGRESSION_EVT01_SCHEMA_LOCK.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED', failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_evt01_schema_lock.json'), {
  schema_version: '1.0.0', gate_id: 'RG_EVT01_SCHEMA_LOCK',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_evt01_schema_lock — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
