#!/usr/bin/env node
import { writeMdAtomic } from './e115_lib.mjs';
const b=process.env.E115_FAILSTATE_BEFORE||''; const a=process.env.E115_FAILSTATE_AFTER||''; const pass=b&&a&&b===a;
writeMdAtomic('reports/evidence/E115/ZERO_WRITES_ON_FAIL.md',['# E115 ZERO WRITES ON FAIL',`- protected_state_before: ${b||'MISSING'}`,`- protected_state_after: ${a||'MISSING'}`,`- status: ${pass?'PASS':'FAIL'}`].join('\n'));
if(!pass) throw new Error('E115_ZERO_WRITES_FAIL');
console.log('e115_zero_writes_on_fail: PASS');
