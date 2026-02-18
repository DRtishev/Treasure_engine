#!/usr/bin/env node
import fs from 'node:fs';
if(!/- status: PASS/.test(fs.readFileSync('reports/evidence/E123/ZERO_WRITES_ON_FAIL.md','utf8'))) throw new Error('E123_ZERO_WRITES_FAIL');
