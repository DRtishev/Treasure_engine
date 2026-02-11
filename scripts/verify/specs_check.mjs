#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const EPOCH_START = 17;
const EPOCH_END = 26;
const epochFiles = Array.from({ length: EPOCH_END - EPOCH_START + 1 }, (_, i) => `specs/epochs/EPOCH-${i + EPOCH_START}.md`);

const requiredFiles = [
  'specs/SSOT_INDEX.md',
  'specs/CONSTRAINTS.md',
  'specs/epochs/INDEX.md',
  'specs/epochs/TEMPLATE.md',
  'docs/SPECS_PLAYBOOK.md',
  'specs/epochs/LEDGER.json',
  ...epochFiles
];

const requiredHeadings = [
  '## REALITY SNAPSHOT',
  '## GOALS',
  '## NON-GOALS',
  '## CONSTRAINTS',
  '## DESIGN / CONTRACTS',
  '## PATCH PLAN',
  '## VERIFY',
  '## EVIDENCE REQUIREMENTS',
  '## STOP RULES',
  '## RISK REGISTER',
  '## ACCEPTANCE CRITERIA',
  '## NOTES'
];

const forbiddenPlaceholderRegex = /\b(TBD|TODO|TBA)\b/i;
const errors = [];

const read = (file) => fs.readFileSync(file, 'utf8');

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) errors.push(`Missing required file: ${file}`);
}

function sectionBody(text, heading, nextHeading) {
  const start = text.indexOf(heading);
  if (start === -1) return '';
  const from = start + heading.length;
  const to = nextHeading ? text.indexOf(nextHeading, from) : text.length;
  return text.slice(from, to === -1 ? text.length : to).trim();
}

for (const epochFile of epochFiles) {
  if (!fs.existsSync(epochFile)) continue;
  const text = read(epochFile);

  let last = -1;
  for (const heading of requiredHeadings) {
    const pos = text.indexOf(heading);
    if (pos === -1) {
      errors.push(`${epochFile} missing heading: ${heading}`);
      continue;
    }
    if (pos < last) errors.push(`${epochFile} heading order violation near: ${heading}`);
    last = Math.max(last, pos);
  }

  const verifyBody = sectionBody(text, '## VERIFY', '## EVIDENCE REQUIREMENTS');
  if (!/`npm run verify:[^`]+`/.test(verifyBody)) {
    errors.push(`${epochFile} VERIFY must include at least one npm verify command`);
  }

  const riskBody = sectionBody(text, '## RISK REGISTER', '## ACCEPTANCE CRITERIA');
  const riskCount = (riskBody.match(/^\s*-\s+/gm) || []).length;
  if (riskCount < 3) {
    errors.push(`${epochFile} RISK REGISTER must contain at least 3 bullet risks`);
  }

  const acceptanceBody = sectionBody(text, '## ACCEPTANCE CRITERIA', '## NOTES');
  const acceptanceCount = (acceptanceBody.match(/^\s*-\s+\[ \]/gm) || []).length;
  if (acceptanceCount < 5) {
    errors.push(`${epochFile} ACCEPTANCE CRITERIA must contain at least 5 unchecked checklist items`);
  }

  for (let i = 0; i < requiredHeadings.length; i += 1) {
    const heading = requiredHeadings[i];
    const next = requiredHeadings[i + 1];
    const body = sectionBody(text, heading, next);
    const allowTbd = /ALLOW_TBD:\s*YES/i.test(body);
    if (!allowTbd && forbiddenPlaceholderRegex.test(body)) {
      errors.push(`${epochFile} section ${heading} contains placeholder text without ALLOW_TBD: YES`);
    }
  }
}


if (fs.existsSync('specs/epochs/LEDGER.json')) {
  const ledger = JSON.parse(read('specs/epochs/LEDGER.json'));
  const validStatuses = new Set(['DONE', 'READY', 'BLOCKED']);
  for (let epoch = EPOCH_START; epoch <= EPOCH_END; epoch += 1) {
    const row = ledger.epochs?.[String(epoch)];
    if (!row) {
      errors.push(`LEDGER missing epoch entry: ${epoch}`);
      continue;
    }
    if (!validStatuses.has(row.status)) {
      errors.push(`LEDGER invalid status for epoch ${epoch}: ${row.status}`);
    }
    for (const k of ['last_commit_sha', 'last_evidence_path', 'last_gate_summary']) {
      if (!(k in row)) errors.push(`LEDGER epoch ${epoch} missing field: ${k}`);
    }
  }
}

if (fs.existsSync('specs/epochs/INDEX.md')) {
  const indexText = read('specs/epochs/INDEX.md');
  for (let epoch = EPOCH_START; epoch <= EPOCH_END; epoch += 1) {
    const marker = `specs/epochs/EPOCH-${epoch}.md`;
    if (!indexText.includes(marker)) errors.push(`INDEX missing epoch file mapping: ${marker}`);
  }
  if (!/Dependency chain|READY order/i.test(indexText)) {
    errors.push('INDEX missing dependency chain / READY order section');
  }
}

if (errors.length > 0) {
  console.error('verify:specs FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('verify:specs PASSED');
console.log(`Validated ${requiredFiles.length} required files in ${path.resolve('.')}`);
