/**
 * regression_data_locks01.mjs -- RG_DATA_LOCKS01
 *
 * Sprint 10 FAST gate:
 * 1. Calibration contract exists and has valid schema
 * 2. Acquire stubs fail-closed without ALLOW_NETWORK
 * 3. If lock files exist, validate schema (schema_version, lock_type, sha256, data)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_DATA_LOCKS01';
const NEXT_ACTION = 'npm run -s verify:fast';

const checks = [];

// Check 1: Calibration contract exists and has valid schema
const contractPath = path.join(ROOT, 'artifacts/contracts/CALIBRATION_CONTRACT_v1.json');
if (fs.existsSync(contractPath)) {
  try {
    const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    checks.push({
      check: 'calibration_contract_exists',
      pass: true,
      detail: `schema_version=${contract.schema_version}, status=${contract.calibration_status}`
    });

    const hasRequiredFields = contract.schema_version && contract.params && contract.calibration_status;
    checks.push({
      check: 'calibration_contract_schema_valid',
      pass: !!hasRequiredFields,
      detail: hasRequiredFields ? 'All required fields present' : 'MISSING required fields'
    });

    // All params must have value and source
    const paramKeys = Object.keys(contract.params || {});
    const allParamsValid = paramKeys.every(k => {
      const p = contract.params[k];
      return p && typeof p.value === 'number' && typeof p.source === 'string';
    });
    checks.push({
      check: 'calibration_params_valid',
      pass: allParamsValid && paramKeys.length > 0,
      detail: `${paramKeys.length} params, all have value+source`
    });
  } catch (e) {
    checks.push({ check: 'calibration_contract_parse', pass: false, detail: `Parse error: ${e.message}` });
  }
} else {
  checks.push({ check: 'calibration_contract_exists', pass: false, detail: 'File not found' });
}

// Check 2: Acquire stubs exist
const acquireScripts = [
  'scripts/acquire/acquire_fee_tiers.mjs',
  'scripts/acquire/acquire_funding_rates.mjs',
  'scripts/acquire/acquire_market_snapshot.mjs'
];

for (const script of acquireScripts) {
  const fullPath = path.join(ROOT, script);
  const basename = path.basename(script, '.mjs');
  checks.push({
    check: `acquire_stub_exists_${basename}`,
    pass: fs.existsSync(fullPath),
    detail: fs.existsSync(fullPath) ? 'exists' : 'MISSING'
  });
}

// Check 3: Acquire stubs fail-closed without ALLOW_NETWORK
const allowFile = path.join(ROOT, 'artifacts/incoming/ALLOW_NETWORK');
const networkAllowed = fs.existsSync(allowFile);

if (!networkAllowed) {
  // Verify each stub exits non-zero
  for (const script of acquireScripts) {
    const basename = path.basename(script, '.mjs');
    try {
      execFileSync(process.execPath, [path.join(ROOT, script)], {
        cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 5000
      });
      // If it succeeds without ALLOW_NETWORK, that's a fail
      checks.push({
        check: `acquire_failclosed_${basename}`,
        pass: false,
        detail: 'Acquire succeeded without ALLOW_NETWORK — FAIL'
      });
    } catch (e) {
      // Expected: should exit non-zero
      checks.push({
        check: `acquire_failclosed_${basename}`,
        pass: true,
        detail: 'Correctly blocked without ALLOW_NETWORK'
      });
    }
  }
}

// Check 4: Lock files validation (if any exist)
const locksDir = path.join(ROOT, 'artifacts/incoming/LOCKS');
if (fs.existsSync(locksDir)) {
  const lockFiles = fs.readdirSync(locksDir).filter(f => f.endsWith('.lock.json'));
  if (lockFiles.length > 0) {
    for (const lockFile of lockFiles) {
      try {
        const lock = JSON.parse(fs.readFileSync(path.join(locksDir, lockFile), 'utf8'));
        const hasSchema = lock.schema_version && lock.lock_type && lock.sha256 && lock.data;
        checks.push({
          check: `lock_schema_valid_${lockFile}`,
          pass: !!hasSchema,
          detail: hasSchema ? `type=${lock.lock_type}` : 'MISSING required fields'
        });
      } catch (e) {
        checks.push({ check: `lock_parse_${lockFile}`, pass: false, detail: `Parse error: ${e.message}` });
      }
    }
  } else {
    checks.push({
      check: 'locks_absent_ok',
      pass: true,
      detail: 'No lock files yet (BLOCKED NEEDS_DATA)'
    });
  }
} else {
  checks.push({
    check: 'locks_dir_absent_ok',
    pass: true,
    detail: 'LOCKS dir absent (BLOCKED NEEDS_DATA)'
  });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'DATA_LOCKS01_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_DATA_LOCKS01.md'), [
  '# REGRESSION_DATA_LOCKS01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_data_locks01.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_data_locks01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
