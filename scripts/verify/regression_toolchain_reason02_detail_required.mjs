/**
 * regression_toolchain_reason02_detail_required.mjs — RG_TOOLCHAIN_REASON02_DETAIL_REQUIRED
 *
 * Gate: when node_toolchain_ensure status != PASS:
 *   - detail must be an object (not a string)
 *   - detail.kind required (non-empty string)
 *   - detail.message required (non-empty string)
 *   - detail.next_action required AND equals "npm run -s ops:node:toolchain:bootstrap"
 *
 * Verified by source-code inspection + live receipt check.
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
const ENSURE_SCRIPT = path.join(ROOT, 'scripts/ops/node_toolchain_ensure.mjs');
const BOOTSTRAP_CMD = 'npm run -s ops:node:toolchain:bootstrap';

const checks = [];

// ─────────────────────────────────────────────────────────────────────────
// Source inspection: detail must be structured object, not string
// ─────────────────────────────────────────────────────────────────────────
if (!fs.existsSync(ENSURE_SCRIPT)) {
  checks.push({ check: 'ensure_script_exists', pass: false, detail: 'node_toolchain_ensure.mjs missing' });
} else {
  const src = fs.readFileSync(ENSURE_SCRIPT, 'utf8');

  // detail must be object literal with kind, message, next_action
  const hasDetailObject = src.includes('detail = {') || src.includes('detail={');
  checks.push({
    check: 'detail_is_object',
    pass: hasDetailObject,
    detail: hasDetailObject ? 'detail assigned as object — OK' : 'FAIL: detail still a plain string',
  });

  // detail.kind present in all BLOCKED paths
  const hasKind = src.includes('kind:');
  checks.push({
    check: 'detail_has_kind_field',
    pass: hasKind,
    detail: hasKind ? 'detail.kind present — OK' : 'FAIL: detail.kind missing',
  });

  // detail.message present
  const hasMessage = src.includes('message:');
  checks.push({
    check: 'detail_has_message_field',
    pass: hasMessage,
    detail: hasMessage ? 'detail.message present — OK' : 'FAIL: detail.message missing',
  });

  // detail.next_action present and must equal bootstrap command
  const hasNextAction = src.includes('next_action:');
  checks.push({
    check: 'detail_has_next_action_field',
    pass: hasNextAction,
    detail: hasNextAction ? 'detail.next_action present — OK' : 'FAIL: detail.next_action missing',
  });

  const hasBootstrapCmd = src.includes(`'${BOOTSTRAP_CMD}'`) || src.includes(`"${BOOTSTRAP_CMD}"`);
  checks.push({
    check: 'detail_next_action_is_bootstrap',
    pass: hasBootstrapCmd,
    detail: hasBootstrapCmd
      ? `next_action references "${BOOTSTRAP_CMD}" — OK`
      : `FAIL: next_action does not reference "${BOOTSTRAP_CMD}"`,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Live receipt check (run by ensure before this gate)
// ─────────────────────────────────────────────────────────────────────────
const receiptPath = path.join(MANUAL, 'node_toolchain_ensure.json');
if (fs.existsSync(receiptPath)) {
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));

  if (receipt.status !== 'PASS') {
    const d = receipt.detail;

    // detail must be object
    const detailIsObject = d !== null && typeof d === 'object' && !Array.isArray(d);
    checks.push({
      check: 'receipt_detail_is_object',
      pass: detailIsObject,
      detail: detailIsObject ? 'receipt detail is object — OK' : `FAIL: receipt detail type=${typeof d}`,
    });

    if (detailIsObject) {
      // kind
      const kindOk = typeof d.kind === 'string' && d.kind.length > 0;
      checks.push({
        check: 'receipt_detail_kind_present',
        pass: kindOk,
        detail: kindOk ? `detail.kind=${d.kind} — OK` : 'FAIL: detail.kind missing or empty',
      });

      // message
      const msgOk = typeof d.message === 'string' && d.message.length > 0;
      checks.push({
        check: 'receipt_detail_message_present',
        pass: msgOk,
        detail: msgOk ? 'detail.message present — OK' : 'FAIL: detail.message missing or empty',
      });

      // next_action
      const naOk = d.next_action === BOOTSTRAP_CMD;
      checks.push({
        check: 'receipt_detail_next_action_is_bootstrap',
        pass: naOk,
        detail: naOk
          ? `detail.next_action="${d.next_action}" — OK`
          : `FAIL: detail.next_action="${d.next_action}" expected "${BOOTSTRAP_CMD}"`,
      });
    }
  } else {
    checks.push({ check: 'receipt_pass_no_detail_check_needed', pass: true, detail: 'status=PASS — OK' });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_TOOLCHAIN_REASON02_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_TOOLCHAIN_REASON02.md'), [
  '# REGRESSION_TOOLCHAIN_REASON02.md — Toolchain Detail Required', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_toolchain_reason02_detail_required.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_TOOLCHAIN_REASON02_DETAIL_REQUIRED',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_toolchain_reason02_detail_required — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
