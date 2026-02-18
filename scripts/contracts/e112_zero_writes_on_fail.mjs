#!/usr/bin/env node
import { writeMdAtomic } from '../verify/e112_lib.mjs';

const before = process.env.E112_FAILSTATE_BEFORE || '';
const after = process.env.E112_FAILSTATE_AFTER || '';
const pass = before && after && before === after;
writeMdAtomic('reports/evidence/E112/ZERO_WRITES_ON_FAIL.md', [
  '# E112 ZERO WRITES ON FAIL',
  `- protected_state_before: ${before || 'MISSING'}`,
  `- protected_state_after: ${after || 'MISSING'}`,
  `- status: ${pass ? 'PASS' : 'FAIL'}`
].join('\n'));
if (!pass) throw new Error('E112_ZERO_WRITES_ON_FAIL_FAIL');
console.log('e112_zero_writes_on_fail: PASS');
