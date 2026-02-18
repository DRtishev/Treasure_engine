#!/usr/bin/env node
import { writeMdAtomic } from './e114_lib.mjs';
const b=process.env.E114_FAILSTATE_BEFORE||''; const a=process.env.E114_FAILSTATE_AFTER||''; const pass=b&&a&&b===a;
writeMdAtomic('reports/evidence/E114/ZERO_WRITES_ON_FAIL.md',['# E114 ZERO WRITES ON FAIL',`- protected_state_before: ${b||'MISSING'}`,`- protected_state_after: ${a||'MISSING'}`,`- status: ${pass?'PASS':'FAIL'}`].join('\n'));
if(!pass) throw new Error('E114_ZERO_WRITES_FAIL');
console.log('e114_zero_writes_on_fail: PASS');
