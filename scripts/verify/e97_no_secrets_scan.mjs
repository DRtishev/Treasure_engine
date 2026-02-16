#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E97_ROOT } from './e97_lib.mjs';

const pats=[/AKIA[0-9A-Z]{16}/,/(?:sk|pk)_(?:live|test)_[0-9a-zA-Z]{16,}/,/-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/];
for(const f of fs.readdirSync(E97_ROOT).filter((x)=>x.endsWith('.md'))){
  const p=path.join(E97_ROOT,f);const t=fs.readFileSync(p,'utf8');
  for(const re of pats) if(re.test(t)) throw new Error(`secret-like pattern found in ${p}`);
}
console.log('verify:e97:no-secrets PASSED');
