#!/usr/bin/env node
import { parseCadenceRows } from './e94_lib.mjs';

const rows=parseCadenceRows();
const sorted=[...rows].sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
if(JSON.stringify(rows)!==JSON.stringify(sorted)) throw new Error('cadence ledger ordering violation');
if(rows.some((r)=>r.windows!=='7/14/30')) throw new Error('cadence ledger format violation windows');
console.log('verify:e94:ordering:contract PASSED');
