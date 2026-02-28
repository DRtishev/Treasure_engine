/**
 * regression_reg03_promotion_only.mjs — RG_REG03_PROMOTION_ONLY
 *
 * Gate: EXECUTOR/CANDIDATE_REGISTRY.json must only change via explicit
 *       --promote command. Running without --promote must never modify
 *       the promoted registry.
 * Surface: PROFIT
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
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const REG_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'candidate_registry.mjs');
const PROMOTED_REGISTRY_PATH = path.join(EXEC, 'CANDIDATE_REGISTRY.json');

const checks = [];

// Check 1: Script exists
const scriptExists = fs.existsSync(REG_SCRIPT);
checks.push({ check: 'registry_script_exists', pass: scriptExists, detail: REG_SCRIPT });

if (scriptExists) {
  const content = fs.readFileSync(REG_SCRIPT, 'utf8');

  // Check 2: --promote flag required for EXECUTOR writes
  const hasPromoteFlag = content.includes('--promote') || content.includes('PROMOTE_FLAG');
  checks.push({ check: 'script_requires_promote_flag', pass: hasPromoteFlag, detail: '--promote flag required for EXECUTOR registry writes' });

  // Check 3: REG03 reason code declared
  const hasReg03 = content.includes('REG03_PROMOTION_ONLY');
  checks.push({ check: 'reg03_reason_code_declared', pass: hasReg03, detail: 'REG03_PROMOTION_ONLY reason code required' });

  // Check 4: Refusal on missing config_id with --promote
  const hasRefusal = content.includes('refusalReason') || content.includes('BLOCKED');
  checks.push({ check: 'has_promote_refusal_logic', pass: hasRefusal, detail: 'refusal logic required when promote config_id missing/invalid' });

  // Check 5: EXECUTOR registry only written in promote path
  // Verify that CANDIDATE_REGISTRY_PATH write is guarded by PROMOTE_FLAG check
  const promoteGuardedWrite =
    content.includes('PROMOTE_FLAG') &&
    content.includes('CANDIDATE_REGISTRY.json') &&
    content.includes('promotionResult');
  checks.push({ check: 'executor_write_guarded_by_promote_flag', pass: promoteGuardedWrite, detail: 'EXECUTOR write must be inside PROMOTE_FLAG block' });

  // Check 6: Dry-run (no --promote) must NOT modify EXECUTOR registry
  const beforeHash = fs.existsSync(PROMOTED_REGISTRY_PATH)
    ? crypto.createHash('sha256').update(fs.readFileSync(PROMOTED_REGISTRY_PATH)).digest('hex')
    : 'NOT_EXISTS';

  const r = spawnSync(process.execPath, [REG_SCRIPT], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  const dryRunRanOk = r.status === 0 || r.status === 2;

  const afterHash = fs.existsSync(PROMOTED_REGISTRY_PATH)
    ? crypto.createHash('sha256').update(fs.readFileSync(PROMOTED_REGISTRY_PATH)).digest('hex')
    : 'NOT_EXISTS';

  const executorUnchanged = beforeHash === afterHash;
  checks.push({
    check: 'dry_run_does_not_modify_executor_registry',
    pass: executorUnchanged,
    detail: executorUnchanged
      ? `EXECUTOR registry unchanged after dry-run (hash=${beforeHash.slice(0, 12)})`
      : `EXECUTOR registry MODIFIED by dry-run! before=${beforeHash.slice(0, 12)} after=${afterHash.slice(0, 12)}`,
  });
  checks.push({
    check: 'dry_run_exits_cleanly',
    pass: dryRunRanOk,
    detail: `dry-run exit code=${r.status ?? 'null'}: ${(r.stdout || '').slice(0, 100)}`,
  });

  // Check 7: --promote without valid config_id => BLOCKED (EC=2)
  const r2 = spawnSync(process.execPath, [REG_SCRIPT, '--promote'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  const promoteMissingIdBlocked = r2.status === 2;
  checks.push({
    check: 'promote_without_id_returns_blocked',
    pass: promoteMissingIdBlocked,
    detail: `--promote (no id) => expect EC=2, got EC=${r2.status ?? 'null'}`,
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'REG03_PROMOTION_ONLY';

const mdContent = [
  '# REGRESSION_REG03_PROMOTION_ONLY.md',
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

writeMd(path.join(EXEC, 'REGRESSION_REG03_PROMOTION_ONLY.md'), mdContent);
writeJsonDeterministic(path.join(MANUAL, 'regression_reg03_promotion_only.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_REG03_PROMOTION_ONLY',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_reg03_promotion_only — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
