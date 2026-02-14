#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cacheRoot = path.resolve('.cache/phoenix');
const evidenceRoot = path.resolve('reports/evidence');
const errors = [];
if (fs.existsSync(cacheRoot)) {
  const stack = [cacheRoot];
  while (stack.length) {
    const cur = stack.pop();
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, ent.name);
      if (full.startsWith(evidenceRoot)) errors.push(`cache path inside evidence root: ${full}`);
      if (ent.isDirectory()) stack.push(full);
    }
  }
}
if (errors.length) {
  console.error('verify:cache:policy FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('verify:cache:policy PASSED');
