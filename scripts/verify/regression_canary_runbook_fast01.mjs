/**
 * regression_canary_runbook_fast01.mjs -- RG_CANARY_RUNBOOK_FAST01
 *
 * Sprint 12 FAST gate:
 * 1. RUNBOOK.md has MICRO-LIVE OPERATING PROCEDURES section
 * 2. RUNBOOK.md documents canary actions (PAUSE, FLATTEN)
 * 3. Session receipt format documented in RUNBOOK
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_CANARY_RUNBOOK_FAST01';
const NEXT_ACTION = 'npm run -s verify:fast';
const checks = [];

const runbookPath = path.join(ROOT, 'RUNBOOK.md');
const runbook = fs.readFileSync(runbookPath, 'utf8');

// Check 1: RUNBOOK has micro_live section
checks.push({
  check: 'runbook_has_micro_live_section',
  pass: runbook.includes('MICRO-LIVE OPERATING PROCEDURES'),
  detail: runbook.includes('MICRO-LIVE OPERATING PROCEDURES') ? 'Present' : 'MISSING'
});

// Check 2: RUNBOOK documents canary actions
const hasCanaryActions = runbook.includes('PAUSE') && runbook.includes('FLATTEN') && runbook.includes('REDUCE');
checks.push({
  check: 'runbook_documents_canary_actions',
  pass: hasCanaryActions,
  detail: hasCanaryActions ? 'PAUSE, FLATTEN, REDUCE documented' : 'MISSING canary action docs'
});

// Check 3: Session receipt format documented
const hasReceiptFormat = runbook.includes('SESSION_RECEIPT') && runbook.includes('Per-Session Receipts');
checks.push({
  check: 'runbook_documents_session_receipts',
  pass: hasReceiptFormat,
  detail: hasReceiptFormat ? 'Session receipt format documented' : 'MISSING session receipt docs'
});

// Check 4: Emergency procedures documented
const hasEmergency = runbook.includes('Emergency Procedures');
checks.push({
  check: 'runbook_has_emergency_procedures',
  pass: hasEmergency,
  detail: hasEmergency ? 'Present' : 'MISSING'
});

// Check 5: Canary limits documented
const hasLimits = runbook.includes('max_exposure_usd') && runbook.includes('max_daily_loss_usd');
checks.push({
  check: 'runbook_documents_canary_limits',
  pass: hasLimits,
  detail: hasLimits ? 'Canary limits documented' : 'MISSING canary limit docs'
});

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'CANARY_RUNBOOK_FAST01_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_CANARY_RUNBOOK_FAST01.md'), [
  '# REGRESSION_CANARY_RUNBOOK_FAST01.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_canary_runbook_fast01.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_canary_runbook_fast01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
