/**
 * regression_rg_net_unlock03_cert_refuses_with_allow_file.mjs — RG_NET_UNLOCK03
 *
 * Gate: if ALLOW_NETWORK is present, CERT entrypoints must refuse BEFORE doing work.
 *
 * "Forgot to lock" sabotage prevention: verifies that:
 *   1. verify:fast pipeline includes unlock01 check early (before heavy gates)
 *   2. regression_unlock01 explicitly checks for ALLOW_NETWORK and FAILs if present
 *   3. ops:life hard_stops on verify:fast failure (no CERT work with allow-file)
 *   4. ALLOW_NETWORK is absent right now (clean state)
 *
 * All verification is by source inspection — no network, no runtime execution.
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
const UNLOCK01_SCRIPT = path.join(ROOT, 'scripts/verify/regression_unlock01_no_incoming_unlock_files.mjs');
const LIFE_SCRIPT = path.join(ROOT, 'scripts/ops/life.mjs');
const PKG_PATH = path.join(ROOT, 'package.json');
const ALLOW_FILE = path.join(ROOT, 'artifacts/incoming/ALLOW_NETWORK');

const checks = [];

// ─────────────────────────────────────────────────────────────────────────
// 1. unlock01 regression gate exists and checks for ALLOW_NETWORK
// ─────────────────────────────────────────────────────────────────────────
if (!fs.existsSync(UNLOCK01_SCRIPT)) {
  checks.push({ check: 'unlock01_gate_exists', pass: false, detail: 'regression_unlock01 missing' });
} else {
  const src = fs.readFileSync(UNLOCK01_SCRIPT, 'utf8');
  const checksAllowNetwork = src.includes('ALLOW_NETWORK');
  checks.push({
    check: 'unlock01_checks_allow_network',
    pass: checksAllowNetwork,
    detail: checksAllowNetwork ? 'regression_unlock01 checks ALLOW_NETWORK — OK' : 'FAIL: ALLOW_NETWORK not checked',
  });

  const failsIfPresent = src.includes('UNLOCK_RESIDUE') || src.includes("'FAIL'") || src.includes('"FAIL"');
  checks.push({
    check: 'unlock01_fails_if_allow_present',
    pass: failsIfPresent,
    detail: failsIfPresent ? 'unlock01 fails if ALLOW_NETWORK present — OK' : 'FAIL: unlock01 does not fail on ALLOW_NETWORK',
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 2. verify:fast includes unlock01 BEFORE heavy certification gates
// ─────────────────────────────────────────────────────────────────────────
if (fs.existsSync(PKG_PATH)) {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const vfScript = pkg.scripts['verify:fast'] || '';

  // unlock01 must be present
  const hasUnlock01 = vfScript.includes('verify:regression:unlock01-no-incoming-unlock-files');
  checks.push({
    check: 'verify_fast_includes_unlock01',
    pass: hasUnlock01,
    detail: hasUnlock01 ? 'unlock01 in verify:fast — OK' : 'FAIL: unlock01 missing from verify:fast',
  });

  // unlock01 must come before heavy gates (byte-audit, netkill, pr01)
  if (hasUnlock01) {
    const unlock01Pos = vfScript.indexOf('unlock01-no-incoming-unlock-files');
    const byteAuditPos = vfScript.indexOf('byte-audit');
    const isEarly = unlock01Pos < byteAuditPos;
    checks.push({
      check: 'unlock01_before_heavy_gates',
      pass: isEarly,
      detail: isEarly ? 'unlock01 positioned before byte-audit — OK' : 'FAIL: unlock01 comes after heavy gates',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 3. ops:life hard_stops on verify:fast fail
// ─────────────────────────────────────────────────────────────────────────
if (!fs.existsSync(LIFE_SCRIPT)) {
  checks.push({ check: 'life_script_exists', pass: false, detail: 'life.mjs missing' });
} else {
  const src = fs.readFileSync(LIFE_SCRIPT, 'utf8');
  const hardStopOnFast = src.includes('hard_stop') && src.includes('verify_fast');
  checks.push({
    check: 'life_hard_stops_on_verify_fast_fail',
    pass: hardStopOnFast,
    detail: hardStopOnFast ? 'hard_stop on verify_fast in life.mjs — OK' : 'FAIL: no hard_stop on verify:fast fail',
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 4. ALLOW_NETWORK absent right now (clean CERT state)
// ─────────────────────────────────────────────────────────────────────────
const allowExists = fs.existsSync(ALLOW_FILE);
checks.push({
  check: 'allow_network_absent_in_cert',
  pass: !allowExists,
  detail: allowExists
    ? 'FAIL: ALLOW_NETWORK present — CERT is in unsafe state — run: npm run -s ops:net:lock'
    : 'ALLOW_NETWORK absent — CERT state clean — OK',
});

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_NET_UNLOCK03_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_NET_UNLOCK03.md'), [
  '# REGRESSION_RG_NET_UNLOCK03.md — CERT Refuses With Allow File', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_net_unlock03_cert_refuses_with_allow_file.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_NET_UNLOCK03_CERT_REFUSES_WITH_ALLOW_FILE',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_rg_net_unlock03_cert_refuses_with_allow_file — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
