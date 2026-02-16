#!/usr/bin/env node
import fs from 'node:fs';
import { E88_STATE_PATH } from './e88_lib.mjs';

if(!fs.existsSync(E88_STATE_PATH)) throw new Error('missing reason_history_state.md');
const rows=[...fs.readFileSync(E88_STATE_PATH,'utf8').matchAll(/^\|\s(\d{4}-\d{2}-\d{2})\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([a-f0-9]{64})\s\|\s([a-f0-9]{64})\s\|$/gm)].map((m)=>({date_utc:m[1],symbol:m[2].trim(),stage:m[3].trim(),verdict:m[4].trim(),reason:m[5].trim(),metrics:m[6],anchors:m[7]}));
const sorted=[...rows].sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
if(JSON.stringify(rows)!==JSON.stringify(sorted)) throw new Error('reason_history_state ordering violation');
if(rows.some((r)=>!/^[A-Z0-9_,]+$/.test(r.reason))) throw new Error('reason_codes formatting violation');
console.log('verify:e88:ordering:contract PASSED');
