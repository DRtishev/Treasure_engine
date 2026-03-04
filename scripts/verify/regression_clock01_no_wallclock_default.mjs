/**
 * regression_clock01_no_wallclock_default.mjs
 *
 * MINE-05: Verify DeterministicClock rejects undefined initialTime.
 * Gate: RG_CLOCK01_NO_WALLCLOCK_DEFAULT
 */

import { DeterministicClock, SystemClock } from '../../core/sys/clock.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { writeMd } from '../edge/edge_lab/canon.mjs';
import path from 'node:path';

const ROOT = process.cwd();
const checks = [];

function check(id, desc, fn) {
  try {
    const pass = fn();
    checks.push({ id, desc, pass, reason: pass ? 'OK' : 'FAIL' });
  } catch (e) {
    checks.push({ id, desc, pass: false, reason: e.message });
  }
}

// 1. DeterministicClock() with no args must throw
check('CLOCK01_NO_ARGS', 'DeterministicClock() throws without initialTime', () => {
  try {
    new DeterministicClock();
    return false; // Should have thrown
  } catch (e) {
    return e.message.includes('requires explicit initialTime');
  }
});

// 2. DeterministicClock(null) must throw
check('CLOCK01_NULL', 'DeterministicClock(null) throws', () => {
  try {
    new DeterministicClock(null);
    return false;
  } catch (e) {
    return e.message.includes('requires explicit initialTime');
  }
});

// 3. DeterministicClock(undefined) must throw
check('CLOCK01_UNDEFINED', 'DeterministicClock(undefined) throws', () => {
  try {
    new DeterministicClock(undefined);
    return false;
  } catch (e) {
    return e.message.includes('requires explicit initialTime');
  }
});

// 4. DeterministicClock(1000) must succeed
check('CLOCK01_VALID', 'DeterministicClock(1000) succeeds', () => {
  const clock = new DeterministicClock(1000);
  return clock.now() === 1000;
});

// 5. DeterministicClock(0) must succeed (zero is valid)
check('CLOCK01_ZERO', 'DeterministicClock(0) succeeds', () => {
  const clock = new DeterministicClock(0);
  return clock.now() === 0;
});

// 6. SystemClock does not throw (it's the production clock)
check('CLOCK01_SYSCLOCK', 'SystemClock works without args', () => {
  const clock = new SystemClock();
  return typeof clock.now() === 'number' && clock.now() > 0;
});

const allPass = checks.every((c) => c.pass);
const failed = checks.filter((c) => !c.pass);

for (const c of checks) {
  console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.id}: ${c.desc}`);
}

const result = {
  schema_version: '1.0.0',
  gate_id: 'RG_CLOCK01_NO_WALLCLOCK_DEFAULT',
  status: allPass ? 'PASS' : 'FAIL',
  reason_code: allPass ? 'NONE' : `FAILED: ${failed.map((c) => c.id).join(', ')}`,
  checks,
};

const outDir = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'gates', 'manual');
writeJsonDeterministic(path.join(outDir, 'regression_clock01.json'), result);

const md = [
  '# RG_CLOCK01_NO_WALLCLOCK_DEFAULT',
  '',
  `Status: **${result.status}**`,
  '',
  '| Check | Result |',
  '|-------|--------|',
  ...checks.map((c) => `| ${c.id} | ${c.pass ? 'PASS' : 'FAIL'} — ${c.reason} |`),
].join('\n');
writeMd(path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'REGRESSION_CLOCK01.md'), md);

console.log(`[${result.status}] ${result.gate_id} — ${result.reason_code}`);
process.exit(allPass ? 0 : 1);
