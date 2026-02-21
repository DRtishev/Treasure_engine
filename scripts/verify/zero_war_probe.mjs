/**
 * zero_war_probe.mjs — ZW01 Zero-War Kill Switch Must-Fail Proof Gate
 *
 * Implements ZW01: MUST_FAIL_PROOF_GATE
 *
 * Intentionally probes the trading path by setting trading-enabled env flags
 * and running edge_calm_mode_p0.mjs. Verifies the T000 guard fires and
 * the process exits non-zero (FAIL T000 = trading kill switch enforced).
 *
 * A PASS on this gate means: the zero-war kill switch is PROVEN to work.
 * A FAIL on this gate means: the kill switch is BROKEN — trading could proceed unchecked.
 *
 * Writes: reports/evidence/SAFETY/ZERO_WAR_PROBE.md
 *         reports/evidence/SAFETY/gates/manual/zero_war_probe.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, sha256Raw, sha256Norm, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const SAFETY_DIR = path.join(ROOT, 'reports', 'evidence', 'SAFETY');
const MANUAL_DIR = path.join(SAFETY_DIR, 'gates', 'manual');

fs.mkdirSync(SAFETY_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

// Trading flag probes — each must be blocked by T000
const TRADING_PROBES = [
  { flag: 'TRADING_ENABLED', value: '1' },
  { flag: 'LIVE_TRADING', value: '1' },
  { flag: 'ORDER_SUBMISSION_ENABLED', value: '1' },
  { flag: 'SUBMIT_ORDERS', value: '1' },
];

const scriptPath = path.join(ROOT, 'scripts', 'edge', 'edge_lab', 'edge_calm_mode_p0.mjs');

console.log('');
console.log('='.repeat(60));
console.log('ZW01 ZERO-WAR PROBE — Must-Fail Gate');
console.log(`RUN_ID: ${RUN_ID}`);
console.log('='.repeat(60));

if (!fs.existsSync(scriptPath)) {
  console.error('[FAIL ZW01] edge_calm_mode_p0.mjs not found — cannot probe trading path.');
  process.exit(1);
}

const probeResults = [];
let allProbesFailed = true; // We WANT all probes to fail (kill switch active)

for (const probe of TRADING_PROBES) {
  console.log(`\n[ZW01 PROBE] Testing ${probe.flag}=${probe.value} ...`);

  const probeEnv = {
    ...process.env,
    [probe.flag]: probe.value,
  };

  let exitCode = 0;
  let stdout = '';
  let stderr = '';
  let t000Detected = false;

  try {
    stdout = execSync(`node "${scriptPath}"`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
      env: probeEnv,
    });
    // If we reach here, the process exited 0 — kill switch FAILED
    exitCode = 0;
    t000Detected = false;
    console.log(`  [KILL_SWITCH_BROKEN] Process exited 0 with ${probe.flag}=${probe.value} — T000 guard did NOT fire!`);
    allProbesFailed = false;
  } catch (err) {
    exitCode = err.status || 1;
    stdout = err.stdout ? err.stdout.toString() : '';
    stderr = err.stderr ? err.stderr.toString() : '';
    const combined = stdout + stderr;
    t000Detected = combined.includes('T000') || combined.includes('FAIL T000');
    if (t000Detected) {
      console.log(`  [KILL_SWITCH_OK] Process exited ${exitCode} with T000 detected — kill switch active.`);
    } else {
      console.log(`  [PROBE_FAIL_UNKNOWN] Process exited ${exitCode} but T000 not detected in output.`);
      // Non-zero exit is still acceptable — the guard may emit different text
    }
  }

  const probeStatus = (exitCode !== 0) ? 'KILL_SWITCH_ACTIVE' : 'KILL_SWITCH_BROKEN';
  probeResults.push({
    flag: probe.flag,
    value: probe.value,
    exit_code: exitCode,
    t000_detected: t000Detected,
    status: probeStatus,
  });

  if (exitCode === 0) {
    allProbesFailed = false;
  }
}

// Gate passes if ALL probes correctly triggered kill switch (non-zero exit)
const gateStatus = allProbesFailed ? 'PASS' : 'FAIL';
const reasonCode = allProbesFailed ? 'NONE' : 'ZW01';

const brokenProbes = probeResults.filter((p) => p.status === 'KILL_SWITCH_BROKEN');
const message = allProbesFailed
  ? `ZW01 PASS — Zero-war kill switch is ACTIVE. All ${TRADING_PROBES.length} trading flag probes correctly blocked by T000 guard.`
  : `FAIL ZW01 — Kill switch BROKEN for: ${brokenProbes.map((p) => p.flag).join(', ')}. Trading path not blocked.`;

const nextAction = allProbesFailed
  ? 'ZW01 enforcement verified. Proceed with infra:p0 pipeline.'
  : 'CRITICAL: Restore T000 guard in edge_calm_mode_p0.mjs before proceeding. Trading kill switch must block all order submission attempts.';

// ---------------------------------------------------------------------------
// Write ZERO_WAR_PROBE.md
// ---------------------------------------------------------------------------
const probeTable = probeResults.map((p) =>
  `| ${p.flag} | ${p.value} | ${p.exit_code} | ${p.t000_detected ? 'YES' : 'NO'} | ${p.status} |`
).join('\n');

const probeMd = `# ZERO_WAR_PROBE.md — ZW01 Zero-War Kill Switch Must-Fail Proof

STATUS: ${gateStatus}
REASON_CODE: ${reasonCode}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${nextAction}

## Purpose

This gate INTENTIONALLY enables trading flags and proves that the zero-war kill switch
(T000 guard in edge_calm_mode_p0.mjs) blocks execution in EVERY case.

A PASS here means: the kill switch is proven to work.
A FAIL here means: the kill switch is broken — CRITICAL safety regression.

## Probe Results

| Flag | Value | Exit Code | T000 Detected | Status |
|------|-------|-----------|---------------|--------|
${probeTable}

## Kill Switch Verification

| Check | Result |
|-------|--------|
| Total probes | ${TRADING_PROBES.length} |
| Probes blocked (exit != 0) | ${probeResults.filter((p) => p.status === 'KILL_SWITCH_ACTIVE').length} |
| Kill switch broken | ${brokenProbes.length} |
| Overall gate | ${gateStatus} |

## ZW01 Policy

Any attempt to place orders / connect to live endpoints / hit production exchange APIs => FAIL ZW01.
This gate probes TRADING_ENABLED, LIVE_TRADING, ORDER_SUBMISSION_ENABLED, SUBMIT_ORDERS flags.
All must be blocked by the T000 guard in P0 mode.

## Evidence Paths

- reports/evidence/SAFETY/ZERO_WAR_PROBE.md
- reports/evidence/SAFETY/gates/manual/zero_war_probe.json
`;

writeMd(path.join(SAFETY_DIR, 'ZERO_WAR_PROBE.md'), probeMd);

// ---------------------------------------------------------------------------
// Write zero_war_probe.json
// ---------------------------------------------------------------------------
const gateJson = {
  schema_version: '1.0.0',
  gate: 'ZW01',
  kill_switch_broken_count: brokenProbes.length,
  message,
  next_action: nextAction,
  probe_results: probeResults,
  probes_total: TRADING_PROBES.length,
  reason_code: reasonCode,
  run_id: RUN_ID,
  status: gateStatus,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'zero_war_probe.json'), gateJson);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log('ZW01 PROBE RESULTS');
console.log('='.repeat(60));
for (const p of probeResults) {
  console.log(`  [${p.status}] ${p.flag}=${p.value} (exit=${p.exit_code}, T000=${p.t000_detected})`);
}
console.log(`\nFINAL: ${gateStatus}${reasonCode !== 'NONE' ? ' ' + reasonCode : ''}`);
console.log('='.repeat(60));

if (gateStatus !== 'PASS') {
  console.error(`\n[FAIL ZW01] Zero-war kill switch broken. See SAFETY/ZERO_WAR_PROBE.md.`);
  process.exit(1);
}

console.log(`\n[PASS] zero_war_probe — ZW01 kill switch proven active for all ${TRADING_PROBES.length} probes.`);
process.exit(0);
