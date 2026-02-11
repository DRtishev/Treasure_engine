#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const requiredHeadings = [
  '## REALITY SNAPSHOT',
  '## GOALS / NON-GOALS',
  '## CONSTRAINTS',
  '## DESIGN (contracts + interfaces + invariants)',
  '## PATCH PLAN (file list, minimal diffs policy)',
  '## VERIFY (gates, commands, expected outputs, anti-flake rules)',
  '## EVIDENCE REQUIREMENTS (paths, logs, manifests)',
  '## STOP RULES (PASS/FAIL criteria)',
  '## RISK REGISTER (incl. meta-risks)',
  '## ROLLBACK PLAN',
  '## ACCEPTANCE CRITERIA (checkbox list)',
  '## NOTES (compatibility concerns)'
];

const requiredFiles = [
  'specs/SSOT_INDEX.md',
  'specs/CONSTRAINTS.md',
  'specs/epochs/INDEX.md',
  'specs/epochs/TEMPLATE.md',
  ...Array.from({ length: 10 }, (_, i) => `specs/epochs/EPOCH-${i + 17}.md`)
];

const fail = [];
function checkFile(file) {
  if (!fs.existsSync(file)) fail.push(`Missing required file: ${file}`);
}

for (const file of requiredFiles) checkFile(file);

for (const epochFile of requiredFiles.filter((f) => /EPOCH-\d+\.md$/.test(f))) {
  if (!fs.existsSync(epochFile)) continue;
  const text = fs.readFileSync(epochFile, 'utf8');
  for (const heading of requiredHeadings) {
    if (!text.includes(heading)) {
      fail.push(`${epochFile} missing heading: ${heading}`);
    }
  }
}

const indexPath = 'specs/epochs/INDEX.md';
if (fs.existsSync(indexPath)) {
  const indexText = fs.readFileSync(indexPath, 'utf8');
  for (let epoch = 17; epoch <= 26; epoch += 1) {
    const marker = `EPOCH-${epoch}`;
    if (!indexText.includes(marker)) fail.push(`INDEX missing reference: ${marker}`);
  }
  if (!/depends on|Dependency chain/i.test(indexText)) {
    fail.push('INDEX missing dependency declaration section');
  }
}

if (fail.length) {
  console.error('verify:specs FAILED');
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}

console.log('verify:specs PASSED');
console.log(`Validated ${requiredFiles.length} required files in ${path.resolve('.')}`);
