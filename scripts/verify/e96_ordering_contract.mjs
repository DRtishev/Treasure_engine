#!/usr/bin/env node
import { parseReasonFix, parseCadFix } from './e96_lib.mjs';
const r=parseReasonFix(); const c=parseCadFix();
const rs=[...r].sort((a,b)=>a.case_id.localeCompare(b.case_id)||a.symbol.localeCompare(b.symbol));
const cs=[...c].sort((a,b)=>a.case_id.localeCompare(b.case_id)||a.symbol.localeCompare(b.symbol));
if(JSON.stringify(r)!==JSON.stringify(rs)) throw new Error('E96 reason fixture ordering violation');
if(JSON.stringify(c)!==JSON.stringify(cs)) throw new Error('E96 cadence fixture ordering violation');
console.log('verify:e96:ordering:contract PASSED');
