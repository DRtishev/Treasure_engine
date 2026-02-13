#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const tracked = spawnSync('git', ['ls-files'], { encoding: 'utf8' });
const files = tracked.stdout.split(/\r?\n/).filter(Boolean);
const roots = ['core/edge', 'core/paper', 'core/canary', 'core/sys'];
const allow = new Set(['core/sys/clock.mjs', 'core/sys/rng.mjs']);
const targets = files.filter((f) => f.endsWith('.mjs') && roots.some((r) => f.startsWith(r)) && !allow.has(f));

const checks = [/\bMath\.random\s*\(/g, /\bDate\.now\s*\(/g, /\bnew\s+Date\s*\(\s*\)/g, /\bsetTimeout\s*\(/g];
const violations = [];
for (const rel of targets) {
  const text = fs.readFileSync(rel, 'utf8');
  for (const re of checks) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const line = text.slice(0, m.index).split(/\r?\n/).length;
      violations.push(`${rel}:${line} forbidden pattern ${re}`);
    }
    re.lastIndex = 0;
  }
}
if (violations.length) {
  console.error('verify:determinism:strict FAILED');
  for (const v of violations) console.error(`- ${v}`);
  process.exit(1);
}
console.log('verify:determinism:strict PASSED');
