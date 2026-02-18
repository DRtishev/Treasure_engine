#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { modeE114 } from './e114_lib.mjs';

const mode=modeE114();
const t=fs.readFileSync(path.resolve('reports/evidence/E114/PROMOTION_REPORT.md'),'utf8');
if (mode==='ONLINE_REQUIRED' && /promoted:\s*no/.test(t)) throw new Error('E114_PROMOTION_REQUIRED_FAIL');
if (!/old_snapshot: <REPO_ROOT>\/.foundation-seal\/capsules\//.test(t)) throw new Error('E114_PROMOTION_PATH_INVALID');
console.log('e114_promotion_contract: PASS');
