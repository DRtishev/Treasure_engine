#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tracked = spawnSync('git', ['ls-files'], { encoding: 'utf8' });
if (tracked.status !== 0) throw new Error(tracked.stderr || 'git ls-files failed');
const files = tracked.stdout.split(/\r?\n/).filter(Boolean);
const lowerMap = new Map();
const errors = [];
for (const rel of files) {
  const key = rel.toLowerCase();
  const prev = lowerMap.get(key);
  if (prev && prev !== rel) errors.push(`Case collision: ${prev} <-> ${rel}`);
  lowerMap.set(key, rel);
}

const ssotDocs = ['README.md', 'QUICK_START.md', 'docs/DEPLOYMENT_GUIDE.md', 'docs/API_DOCUMENTATION.md'];
const banned = [/NEURO-MEV/i, /specs\/epochs\/ directory was not found/i, /specs\/epochs missing/i];
for (const rel of ssotDocs) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const text = fs.readFileSync(abs, 'utf8');
  for (const pattern of banned) {
    if (pattern.test(text)) errors.push(`${rel} contains banned SSOT phrase ${pattern}`);
  }
}

if (process.env.ALLOW_STUB_EVIDENCE === '1') {
  errors.push('ALLOW_STUB_EVIDENCE must be unset in default sanity runs');
}

const offlinePaths = ['core/edge'];
const netPattern = /\b(fetch\s*\(|https?:\/\/|WebSocket\s*\()/;
for (const rel of files) {
  if (!offlinePaths.some((prefix) => rel.startsWith(prefix)) || !rel.endsWith('.mjs')) continue;
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  if (netPattern.test(text) && !/ENABLE_NETWORK_TESTS/.test(text)) {
    errors.push(`${rel} appears to use network primitives without ENABLE_NETWORK_TESTS gate`);
  }
}

if (errors.length) {
  console.error('verify:repo FAILED');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}
console.log('verify:repo PASSED');
