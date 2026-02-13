#!/usr/bin/env node
import fs from 'node:fs';

const required = {
  'kb/00_GLOSSARY.md': ['# Glossary', '## Core terms'],
  'kb/01_SYSTEM_MAP.md': ['# System Map', '## Data layer', '## Edge layer', '## Execution layer', '## Risk layer', '## Canary layer', '## Governance layer'],
  'kb/02_DATA_TRUTH.md': ['# Data Truth', '## Tier model', '## Manifests and invariants', '## Quality engine'],
  'kb/03_EXECUTION_TRUTH.md': ['# Execution Truth', '## REAL vs PROXY', '## Calibration', '## Partial fills and freshness'],
  'kb/04_RISK_TRUTH.md': ['# Risk Truth', '## Risk Fortress', '## Hard stops', '## Pause and recover'],
  'kb/05_VERIFICATION_TRUTH.md': ['# Verification Truth', '## TruthStack', '## Phoenix and freeze', '## Evidence and release doctrine'],
  'kb/06_WOW_TO_PROFIT.md': ['# WOW to Profit', '## Acceptance as falsification', '## Kill criteria discipline', '## Passports as proof']
};

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scriptSet = new Set(Object.keys(pkg.scripts || {}));
const errors = [];

for (const [file, headings] of Object.entries(required)) {
  if (!fs.existsSync(file)) { errors.push(`Missing KB file: ${file}`); continue; }
  const text = fs.readFileSync(file, 'utf8');
  for (const h of headings) if (!text.includes(h)) errors.push(`${file} missing heading: ${h}`);

  const commandRefs = [...text.matchAll(/npm run\s+([a-z0-9:-]+)/gi)].map((m) => m[1]);
  for (const cmd of commandRefs) {
    if (/^(verify:|release:|truth:)/.test(cmd) && !scriptSet.has(cmd)) errors.push(`${file} references missing npm script: ${cmd}`);
  }

  const pathRefs = [...text.matchAll(/`((?:core|scripts|specs|reports|docs|kb)\/[\w./-]+)`/g)].map((m) => m[1]);
  for (const p of pathRefs) if (!fs.existsSync(p)) errors.push(`${file} references missing path: ${p}`);
}

if (errors.length) {
  console.error('verify:kb FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`verify:kb PASSED (${Object.keys(required).length} files)`);
