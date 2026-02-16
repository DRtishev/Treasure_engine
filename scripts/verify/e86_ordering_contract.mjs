#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const p=path.resolve('reports/evidence/E86/EXEC_RECON_DEMO_DAILY.md');
if(!fs.existsSync(p)){console.log('verify:e86:ordering:contract SKIP missing EXEC_RECON_DEMO_DAILY.md');process.exit(0);} 
const lines=fs.readFileSync(p,'utf8').split(/\r?\n/).filter((line)=>/^\|\s[A-Z0-9]+\s\|/.test(line));
const rows=lines.map((line)=>{const c=line.split('|').map((x)=>x.trim());return {symbol:c[1],window:Number(c[2])};});
const sorted=[...rows].sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.window-b.window);
if(JSON.stringify(rows)!==JSON.stringify(sorted)) throw new Error('E86 ordering contract violated: rows must be symbol asc, window asc');
console.log('verify:e86:ordering:contract PASSED');
