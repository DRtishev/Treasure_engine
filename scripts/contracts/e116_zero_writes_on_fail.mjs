#!/usr/bin/env node
import { writeMdAtomic } from '../verify/e116_lib.mjs';

const b = process.env.E116_FAILSTATE_BEFORE || 'UNKNOWN';
const a = process.env.E116_FAILSTATE_AFTER || 'UNKNOWN';
const ok = b === a;
writeMdAtomic('reports/evidence/E116/ZERO_WRITES_ON_FAIL.md', ['# E116 ZERO WRITES ON FAIL', `- protected_state_before: ${b}`, `- protected_state_after: ${a}`, `- status: ${ok ? 'PASS' : 'FAIL'}`].join('\n'));
if (!ok) throw new Error('E116_ZERO_WRITES_FAIL');
console.log('e116_zero_writes_on_fail: PASS');
