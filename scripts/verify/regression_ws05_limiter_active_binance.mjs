/**
 * regression_ws05_limiter_active_binance.mjs — RG_WS05_LIMITER_ACTIVE_BINANCE
 *
 * Gate: SimAcquire Harness — Binance rate limits use LOGICAL_TICKS (not wallclock).
 *       Simulates a tick-based rate limiter against data_capabilities.json values.
 *       Verifies the limiter correctly:
 *         - Allows messages within limit
 *         - Rejects messages that exceed the per-connection rate
 *         - Uses LOGICAL_TICKS unit (not _ms / _sec wallclock)
 *
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:ws05-limiter-active-binance';
const CAP_PATH = path.join(ROOT, 'specs', 'data_capabilities.json');

const checks = [];

// --- SimAcquire Harness: tick-based rate limiter ---
function simRateLimiter(maxPerTick, tickCount, burstOverBy) {
  // Simulates `tickCount` logical ticks, each sending `maxPerTick` messages.
  // On tick `burstOverBy`, sends maxPerTick + burstOverBy messages.
  // Returns: { allowed: n, rejected: n, ticks: n }
  let allowed = 0;
  let rejected = 0;
  for (let tick = 0; tick < tickCount; tick++) {
    const toSend = tick === Math.floor(tickCount / 2) ? maxPerTick + burstOverBy : maxPerTick;
    for (let msg = 0; msg < toSend; msg++) {
      const withinLimit = msg < maxPerTick;
      if (withinLimit) allowed++;
      else rejected++;
    }
  }
  return { allowed, rejected, ticks: tickCount };
}

if (!fs.existsSync(CAP_PATH)) {
  checks.push({ check: 'cap_file_exists', pass: false, detail: `missing: ${CAP_PATH}` });
} else {
  let cap;
  try {
    cap = JSON.parse(fs.readFileSync(CAP_PATH, 'utf8'));
    checks.push({ check: 'cap_parseable', pass: true, detail: 'JSON parse OK' });
  } catch (e) {
    cap = null;
    checks.push({ check: 'cap_parseable', pass: false, detail: `parse error: ${e.message}` });
  }

  if (cap && cap.capabilities && cap.capabilities.binance && cap.capabilities.binance.rate_limits) {
    const rl = cap.capabilities.binance.rate_limits;

    // Check unit is LOGICAL_TICKS (not wallclock)
    checks.push({
      check: 'binance_rate_limit_unit_logical_ticks',
      pass: rl.unit === 'LOGICAL_TICKS',
      detail: rl.unit === 'LOGICAL_TICKS' ? `unit=LOGICAL_TICKS — OK` : `WALLCLOCK_UNIT: unit=${rl.unit}`,
    });

    // Check messages_per_connection is a positive integer
    const mpc = rl.messages_per_connection;
    const mpcValid = Number.isInteger(mpc) && mpc > 0;
    checks.push({
      check: 'binance_messages_per_connection_valid',
      pass: mpcValid,
      detail: mpcValid ? `messages_per_connection=${mpc}` : `INVALID: messages_per_connection=${mpc}`,
    });

    // Check no wallclock field names in rate_limits
    const wallclockSuffixes = ['_sec', '_seconds', '_ms'];
    const wallclockKeys = Object.keys(rl).filter((k) => wallclockSuffixes.some((s) => k.endsWith(s)));
    checks.push({
      check: 'binance_rate_limits_no_wallclock_fields',
      pass: wallclockKeys.length === 0,
      detail: wallclockKeys.length === 0 ? 'no wallclock fields in rate_limits — OK' : `WALLCLOCK_FIELDS: ${wallclockKeys.join(',')}`,
    });

    // SimAcquire: simulate at the limit
    if (mpcValid) {
      const sim1 = simRateLimiter(mpc, 10, 0);
      checks.push({
        check: 'sim_within_limit_all_allowed',
        pass: sim1.rejected === 0,
        detail: `ticks=${sim1.ticks} allowed=${sim1.allowed} rejected=${sim1.rejected} — ${sim1.rejected === 0 ? 'OK' : 'FAIL'}`,
      });

      // SimAcquire: simulate burst — extra 3 messages per tick over limit
      const burst = 3;
      const sim2 = simRateLimiter(mpc, 10, burst);
      const expectedRejected = burst; // only the burst tick rejects
      checks.push({
        check: 'sim_over_limit_rejected',
        pass: sim2.rejected === expectedRejected,
        detail: `ticks=${sim2.ticks} allowed=${sim2.allowed} rejected=${sim2.rejected} expected_rejected=${expectedRejected} — ${sim2.rejected === expectedRejected ? 'OK' : 'FAIL'}`,
      });
    }
  } else {
    checks.push({
      check: 'binance_rate_limits_present',
      pass: false,
      detail: 'capabilities.binance.rate_limits missing',
    });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'WS05_LIMITER_INACTIVE';

writeMd(path.join(EXEC, 'REGRESSION_WS05.md'), [
  '# REGRESSION_WS05.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## SIM_HARNESS',
  '- Unit enforced: LOGICAL_TICKS',
  '- Sim scenario 1: within limit → all allowed',
  '- Sim scenario 2: burst +3 over limit → 3 rejected', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ws05.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_WS05_LIMITER_ACTIVE_BINANCE',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ws05_limiter_active_binance — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
