#!/usr/bin/env node
import fs from 'node:fs';
const v=fs.readFileSync('reports/evidence/E123/VERDICT.md','utf8');
const af=fs.readFileSync('reports/evidence/E123/ANTI_FAKE_FULL.md','utf8');
const status=/status:\s*(\w+)/.exec(v)?.[1]||'WARN';
const pass=/- status: PASS/.test(af);
if(status==='FULL'&&!pass) throw new Error('E123_ANTI_FAKE_FULL_V4_FAIL');
