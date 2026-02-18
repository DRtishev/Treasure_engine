#!/usr/bin/env node
import fs from 'node:fs';
import { INPUT_BINDING_PATH } from './e115_lib.mjs';
if (!fs.existsSync(INPUT_BINDING_PATH)) throw new Error('E115_INPUT_BINDING_MISSING');
const b=JSON.parse(fs.readFileSync(INPUT_BINDING_PATH,'utf8'));
for(const k of ['pinned_capsule_dir','provider_used','mode','stamp']) if(!b[k]) throw new Error(`E115_INPUT_BINDING_BAD:${k}`);
console.log('e115_input_binding_lock_contract: PASS');
