#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const EPOCH_START = 1;
const EPOCH_END = 55;
const epochFiles = Array.from({ length: EPOCH_END - EPOCH_START + 1 }, (_, i) => `specs/epochs/EPOCH-${String(i + EPOCH_START).padStart(2, '0')}.md`);

const requiredFiles = [
  'specs/SSOT_INDEX.md',
  'specs/CONSTRAINTS.md',
  'specs/epochs/INDEX.md',
  'specs/epochs/TEMPLATE.md',
  'docs/SPECS_PLAYBOOK.md',
  'specs/epochs/LEDGER.json',
  'agents.md',
  'AGENTS_NOTICE.md',
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
const tabCharacterRegex = /\t/;
const errors = [];

const read = (file) => fs.readFileSync(file, 'utf8');

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) errors.push(`Missing required file: ${file}`);
}

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) continue;
  const text = read(file);
  if (tabCharacterRegex.test(text)) {
    errors.push(`${file} contains tab characters; only spaces are allowed`);
  }
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
  const epochNumber = Number(path.basename(epochFile).match(/EPOCH-(\d+)/)?.[1] ?? 0);
  if (epochNumber >= 31 && epochNumber <= 40 && riskCount < 7) {
    errors.push(`${epochFile} RISK REGISTER must contain at least 7 bullet risks for EDGE epochs 31..40`);
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



if (fs.existsSync('agents.md')) {
  const agents = read('agents.md');
  const requiredAgentHeadings = [
    '# PURPOSE',
    '# SAFETY & OFFLINE POLICY',
    '# EVIDENCE PROTOCOL',
    '# ANTI-REGRESSION DOCTRINE',
    '# AUTONOMOUS EPOCH EXECUTION',
    '# OUTPUT STANDARD',
    '# STOP RULES'
  ];
  let lastPosition = -1;
  for (const h of requiredAgentHeadings) {
    const pos = agents.indexOf(h);
    if (pos === -1) {
      errors.push(`agents.md missing required heading: ${h}`);
      continue;
    }
    if (pos < lastPosition) {
      errors.push(`agents.md heading order violation near: ${h}`);
    }
    lastPosition = Math.max(lastPosition, pos);
  }
}

if (fs.existsSync('specs/epochs/LEDGER.json')) {
  const ledger = JSON.parse(read('specs/epochs/LEDGER.json'));
  const validStatuses = new Set(['DONE', 'READY', 'BLOCKED', 'LEGACY_DONE']);
  const requiredLedgerFields = ['id', 'title', 'status', 'type', 'depends_on', 'gate_owner', 'evidence_id', 'completed_at', 'commit_sha'];
  for (let epoch = EPOCH_START; epoch <= EPOCH_END; epoch += 1) {
    const row = ledger.epochs?.[String(epoch)];
    if (!row) {
      errors.push(`LEDGER missing epoch entry: ${epoch}`);
      continue;
    }
    if (!validStatuses.has(row.status)) {
      errors.push(`LEDGER invalid status for epoch ${epoch}: ${row.status}`);
    }
    for (const k of requiredLedgerFields) {
      if (!(k in row)) errors.push(`LEDGER epoch ${epoch} missing field: ${k}`);
    }
    if (epoch <= 16) {
      if (String(row.type).toLowerCase() !== 'legacy') {
        errors.push(`LEDGER epoch ${epoch} must be type=legacy`);
      }
      if (row.gate_owner !== 'docs') {
        errors.push(`LEDGER epoch ${epoch} must set gate_owner=docs`);
      }
      if (!['LEGACY_DONE', 'DONE', 'READY', 'BLOCKED'].includes(row.status)) {
        errors.push(`LEDGER epoch ${epoch} invalid legacy status: ${row.status}`);
      }
    }
  }
}

if (fs.existsSync('specs/epochs/INDEX.md')) {
  const indexText = read('specs/epochs/INDEX.md');
  for (let epoch = EPOCH_START; epoch <= EPOCH_END; epoch += 1) {
    const marker = `specs/epochs/EPOCH-${String(epoch).padStart(2, '0')}.md`;
    if (!indexText.includes(marker)) errors.push(`INDEX missing epoch file mapping: ${marker}`);
  }
  if (!/Dependency chain|READY order/i.test(indexText)) {
    errors.push('INDEX missing dependency chain / READY order section');
  }
}


const ssotDocs = ['README.md', 'QUICK_START.md', 'docs/DEPLOYMENT_GUIDE.md', 'docs/API_DOCUMENTATION.md'];
const forbiddenSsotClaims = [/NEURO-MEV/i, /specs\/epochs\/ directory was not found/i, /specs\/epochs missing/i];

for (const file of ssotDocs) {
  if (!fs.existsSync(file)) continue;
  const text = read(file);
  for (const pattern of forbiddenSsotClaims) {
    if (pattern.test(text)) errors.push(`${file} contains forbidden SSOT claim: ${pattern}`);
  }
}

for (const legacyTodo of ['specs/epochs/EPOCH-17_TODO.md','specs/epochs/EPOCH-18_TODO.md','specs/epochs/EPOCH-19_TODO.md','specs/epochs/EPOCH-20_TODO.md','specs/epochs/EPOCH-21_TODO.md']) {
  if (fs.existsSync(legacyTodo)) errors.push(`Legacy TODO file must be moved out of specs/epochs: ${legacyTodo}`);
}

if (errors.length > 0) {
  console.error('verify:specs FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('verify:specs PASSED');
console.log(`Validated ${requiredFiles.length} required files in ${path.resolve('.')}`);
