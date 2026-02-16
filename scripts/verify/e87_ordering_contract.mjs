#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const p=path.resolve('reports/evidence/E87/MICROFILL_LEDGER.md');
if(!fs.existsSync(p)){console.log('verify:e87:ordering:contract SKIP missing MICROFILL_LEDGER.md');process.exit(0);} 
const lines=fs.readFileSync(p,'utf8').split(/\r?\n/).filter((line)=>/^\|\s\d{4}-\d{2}-\d{2}\s\|/.test(line));
const rows=lines.map((line)=>{const c=line.split('|').map((x)=>x.trim());return {date:c[1],symbol:c[2]};});
const sorted=[...rows].sort((a,b)=>a.date.localeCompare(b.date)||a.symbol.localeCompare(b.symbol));
if(JSON.stringify(rows)!==JSON.stringify(sorted)) throw new Error('E87 ordering contract violated: date asc, symbol asc required');
console.log('verify:e87:ordering:contract PASSED');
