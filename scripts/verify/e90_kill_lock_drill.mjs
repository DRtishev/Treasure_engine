#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E90_LOCK_PATH } from './e90_lib.mjs';
import { writeMd } from './e66_lib.mjs';

if(process.env.CI==='true') throw new Error('drill forbidden in CI');
if(process.env.DRILL_E90_KILL_LOCK!=='1') throw new Error('DRILL_E90_KILL_LOCK=1 required');
writeMd(E90_LOCK_PATH,['# E90 KILL LOCK','- reason: DRILL_EXPECTED_FAILURE','- drill: true'].join('\n'));
if(!fs.existsSync(E90_LOCK_PATH)) throw new Error('drill failed to arm lock');
console.log(`verify:e90:drill PASSED lock=${path.relative(process.cwd(),E90_LOCK_PATH)}`);
