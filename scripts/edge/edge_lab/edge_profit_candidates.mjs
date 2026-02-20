import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');
const CANDIDATES_FILE = path.join(ROOT, 'EDGE_LAB', 'PROFIT_CANDIDATES_V1.md');
const PROXY_VALIDATION_FILE = path.join(ROOT, 'EDGE_LAB', 'PROXY_VALIDATION.md');
const OUTPUT_MD = path.join(EVIDENCE_DIR, 'PROFIT_CANDIDATES_COURT.md');
const OUTPUT_JSON = path.join(MANUAL_DIR, 'profit_candidates_court.json');

const REQUIRED_FIELDS_ORDERED = [
  'NAME', 'HYPOTHESIS', 'REGIMES', 'FAILURE_MODES',
  'REQUIRED_GUARDS', 'DATA_REQUIREMENTS', 'EXECUTION_RISKS',
  'RISK_LIMITS', 'STATUS'
];
const VALID_STATUSES = ['NEEDS_DATA', 'ELIGIBLE_FOR_PAPER', 'ELIGIBLE_FOR_MICRO_LIVE', 'BLOCKED'];
const PROXY_TRIGGER_TERMS = ['proxy', 'approx', 'estimated'];
const MIN_CANDIDATES = 3;
const MAX_CANDIDATES = 5;

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

function blocked(reason_code, message, extra = {}) {
  return { status: 'BLOCKED', reason_code, message, ...extra };
}
function pass(message, extra = {}) {
  return { status: 'PASS', reason_code: 'NONE', message, ...extra };
}

// --- Read candidates file ---
if (!fs.existsSync(CANDIDATES_FILE)) {
  const result = blocked('MISSING_CANDIDATES_FILE', 'PROFIT_CANDIDATES_V1.md not found');
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(result, null, 2)}\n`);
  console.error('[BLOCKED] edge:profit:candidates — PROFIT_CANDIDATES_V1.md not found');
  process.exit(1);
}

const raw = fs.readFileSync(CANDIDATES_FILE, 'utf8');

// --- Parse candidate sections ---
const candidatePattern = /^## CANDIDATE:\s*([A-Z0-9_]+)/gm;
const sections = [];
let match;
const anchors = [];
while ((match = candidatePattern.exec(raw)) !== null) {
  anchors.push({ name: match[1], offset: match.index });
}

for (let i = 0; i < anchors.length; i++) {
  const start = anchors[i].offset;
  const end = i + 1 < anchors.length ? anchors[i + 1].offset : raw.length;
  sections.push({ name: anchors[i].name, body: raw.slice(start, end) });
}

if (sections.length < MIN_CANDIDATES || sections.length > MAX_CANDIDATES) {
  const result = blocked(
    'CANDIDATE_COUNT_INVALID',
    `Expected ${MIN_CANDIDATES}–${MAX_CANDIDATES} candidates, found ${sections.length}`
  );
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(result, null, 2)}\n`);
  console.error(`[BLOCKED] edge:profit:candidates — candidate count ${sections.length} out of range`);
  process.exit(1);
}

// --- Extract field from table row ---
function extractField(body, fieldName) {
  const re = new RegExp(`\\|\\s*${fieldName}\\s*\\|\\s*([^|\\n]+)\\s*\\|`, 'i');
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

// --- Validate each candidate ---
const candidateResults = [];
const errors = [];

for (const sec of sections) {
  const fields = {};
  const secErrors = [];

  for (const field of REQUIRED_FIELDS_ORDERED) {
    const val = extractField(sec.body, field);
    if (!val || val.length === 0) {
      secErrors.push(`Missing or empty field: ${field}`);
    } else {
      fields[field] = val;
    }
  }

  // Validate STATUS value
  if (fields.STATUS && !VALID_STATUSES.includes(fields.STATUS)) {
    secErrors.push(`Invalid STATUS value: "${fields.STATUS}". Allowed: ${VALID_STATUSES.join(', ')}`);
  }

  // Validate NAME matches section header
  if (fields.NAME && fields.NAME !== sec.name) {
    secErrors.push(`NAME field "${fields.NAME}" does not match section header "${sec.name}"`);
  }

  candidateResults.push({
    name: sec.name,
    fields,
    errors: secErrors,
    compliant: secErrors.length === 0
  });

  if (secErrors.length > 0) errors.push(...secErrors.map(e => `${sec.name}: ${e}`));
}

// --- Sort check (alphabetical by NAME) ---
const names = sections.map(s => s.name);
const sortedNames = [...names].sort();
const sortViolations = [];
for (let i = 0; i < names.length; i++) {
  if (names[i] !== sortedNames[i]) {
    sortViolations.push(`Position ${i + 1}: found "${names[i]}", expected "${sortedNames[i]}"`);
  }
}
if (sortViolations.length > 0) {
  errors.push(`Candidates not sorted alphabetically by NAME: ${sortViolations.join('; ')}`);
}

// --- Proxy term check ---
const proxyViolations = [];
const proxyValidationExists = fs.existsSync(PROXY_VALIDATION_FILE);
const proxyValidationContent = proxyValidationExists
  ? fs.readFileSync(PROXY_VALIDATION_FILE, 'utf8').toLowerCase()
  : '';
const proxyValidationPass = /^STATUS:\s*PASS/m.test(
  proxyValidationExists ? fs.readFileSync(PROXY_VALIDATION_FILE, 'utf8') : ''
);

for (const sec of sections) {
  for (const field of REQUIRED_FIELDS_ORDERED) {
    const val = extractField(sec.body, field);
    if (!val) continue;
    // Check for PROXY: prefix marker (explicit proxy declaration)
    if (/\bPROXY:/i.test(val)) {
      if (!proxyValidationExists) {
        proxyViolations.push(`${sec.name}.${field}: PROXY: marker without PROXY_VALIDATION.md`);
      } else if (!proxyValidationPass) {
        proxyViolations.push(`${sec.name}.${field}: PROXY: marker but PROXY_VALIDATION.md STATUS != PASS`);
      }
    }
  }
}
if (proxyViolations.length > 0) {
  errors.push(...proxyViolations.map(v => `PROXY_GUARD: ${v}`));
}

// --- Build result ---
const now = new Date().toISOString();
const totalCompliant = candidateResults.filter(r => r.compliant).length;
const overallStatus = errors.length === 0 ? 'PASS' : 'BLOCKED';
const reason_code = errors.length === 0 ? 'NONE' : 'CANDIDATE_VALIDATION_FAILED';

const courtResult = overallStatus === 'PASS'
  ? pass(`All ${sections.length} profit candidates validated. Schema compliant: ${totalCompliant}/${sections.length}.`, {
      candidate_count: sections.length,
      candidates: candidateResults.map(r => ({ name: r.name, status: r.fields.STATUS, compliant: r.compliant }))
    })
  : blocked(reason_code, `${errors.length} validation error(s) found.`, {
      candidate_count: sections.length,
      errors,
      candidates: candidateResults.map(r => ({ name: r.name, compliant: r.compliant, errors: r.errors }))
    });

// --- Write JSON gate ---
fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify({ generated_at: now, script: 'edge_profit_candidates.mjs', ...courtResult }, null, 2)}\n`);

// --- Write markdown court ---
const complianceRows = candidateResults.map(r => {
  const statusVal = r.fields.STATUS || 'MISSING';
  const ok = r.compliant ? 'OK' : 'FAIL';
  const issueStr = r.errors.length > 0 ? r.errors.join('; ') : 'None';
  return `| ${r.name} | ${statusVal} | ${ok} | ${issueStr} |`;
}).join('\n');

const errorBlock = errors.length > 0
  ? errors.map(e => `- ${e}`).join('\n')
  : '- NONE';

const mdContent = `# PROFIT_CANDIDATES_COURT.md — Profit Candidate Set v1 Validation
generated_at: ${now}
script: edge_profit_candidates.mjs

## STATUS: ${overallStatus}

## Summary
| Metric | Value |
|--------|-------|
| Candidates found | ${sections.length} |
| Range valid (${MIN_CANDIDATES}–${MAX_CANDIDATES}) | ${sections.length >= MIN_CANDIDATES && sections.length <= MAX_CANDIDATES ? 'YES' : 'NO'} |
| Schema compliant | ${totalCompliant} / ${sections.length} |
| Sort order correct | ${sortViolations.length === 0 ? 'YES' : 'NO'} |
| Proxy guard | ${proxyViolations.length === 0 ? 'PASS' : 'BLOCKED'} |
| Source file | EDGE_LAB/PROFIT_CANDIDATES_V1.md |

## Candidate Compliance
| Candidate | STATUS | Schema | Issues |
|-----------|--------|--------|--------|
${complianceRows}

## Validation Errors
${errorBlock}

## Verdict
${overallStatus === 'PASS'
    ? `All ${sections.length} candidates validated. Format compliance confirmed. STATUS=NEEDS_DATA for all candidates pending paper trading evidence.`
    : `BLOCKED: ${errors.length} error(s) found. Fix all violations before proceeding.`
  }
`;

fs.writeFileSync(OUTPUT_MD, mdContent);

if (overallStatus !== 'PASS') {
  console.error(`[BLOCKED] edge:profit:candidates — ${errors.length} error(s): ${errors[0]}`);
  process.exit(1);
}
console.log(`[PASS] edge:profit:candidates — ${sections.length} candidates validated, ${totalCompliant}/${sections.length} compliant, STATUS=${overallStatus}`);
process.exit(0);
