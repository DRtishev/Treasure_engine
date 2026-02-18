#!/usr/bin/env node
import { writeMdAtomic } from './e113_lib.mjs';

const before = process.env.E113_FAILSTATE_BEFORE || '';
const after = process.env.E113_FAILSTATE_AFTER || '';
const pass = before && after && before === after;
writeMdAtomic('reports/evidence/E113/ZERO_WRITES_ON_FAIL.md', [
  '# E113 ZERO WRITES ON FAIL',
  `- protected_state_before: ${before || 'MISSING'}`,
  `- protected_state_after: ${after || 'MISSING'}`,
  `- status: ${pass ? 'PASS' : 'FAIL'}`
].join('\n'));
if (!pass) throw new Error('E113_ZERO_WRITES_FAIL');
console.log('e113_zero_writes_on_fail: PASS');
