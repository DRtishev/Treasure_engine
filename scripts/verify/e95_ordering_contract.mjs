#!/usr/bin/env node
import { parseFixtureReason, parseFixtureCadence } from './e95_lib.mjs';

const r=parseFixtureReason();
const c=parseFixtureCadence();
const rs=[...r].sort((a,b)=>a.case_id.localeCompare(b.case_id)||a.symbol.localeCompare(b.symbol));
const cs=[...c].sort((a,b)=>a.case_id.localeCompare(b.case_id)||a.symbol.localeCompare(b.symbol));
if(JSON.stringify(r)!==JSON.stringify(rs)) throw new Error('fixture reason ordering violation');
if(JSON.stringify(c)!==JSON.stringify(cs)) throw new Error('fixture cadence ordering violation');
console.log('verify:e95:ordering:contract PASSED');
