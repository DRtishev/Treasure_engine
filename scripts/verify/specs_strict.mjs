#!/usr/bin/env node
import fs from 'node:fs';

const EPOCH_START = 31;
const EPOCH_END = 40;
const epochFiles = Array.from({ length: EPOCH_END - EPOCH_START + 1 }, (_, i) => `specs/epochs/EPOCH-${String(i + EPOCH_START).padStart(2, '0')}.md`);
const ssotDocs = [
  'docs/EDGE_RESEARCH/GLOSSARY.md',
  'docs/EDGE_RESEARCH/DETERMINISM_POLICY.md',
  'docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md'
];

const bannedDomains = ['reddit.com', 'quora.com', 'medium.com', 'substack.com'];
const errors = [];

const read = (file) => fs.readFileSync(file, 'utf8');

for (const file of [...epochFiles, 'specs/epochs/INDEX.md', 'specs/epochs/LEDGER.json', ...ssotDocs]) {
  if (!fs.existsSync(file)) errors.push(`Missing required file: ${file}`);
}

function requireContains(text, token, file, label) {
  if (!text.toLowerCase().includes(token.toLowerCase())) {
    errors.push(`${file} missing required heading/topic: ${label}`);
  }
}

for (const epochFile of epochFiles) {
  if (!fs.existsSync(epochFile)) continue;
  const text = read(epochFile);

  // a) placeholder scan
  const lines = text.split('\n');
  lines.forEach((line, idx) => {
    const m = line.match(/\b(TBD|TODO|TBA)\b/i);
    if (!m) return;
    const lower = line.toLowerCase();
    if (lower.includes('spec quality bar')) return;
    errors.push(`${epochFile}:${idx + 1} contains forbidden placeholder: ${m[1]}`);
  });

  // b) required headings/topics
  requireContains(text, '## goals', epochFile, 'GOALS');
  requireContains(text, '## non-goals', epochFile, 'NON-GOALS');
  requireContains(text, '## constraints', epochFile, 'CONSTRAINTS');
  requireContains(text, 'dependencies', epochFile, 'Dependencies');
  requireContains(text, 'contracts', epochFile, 'Contracts');
  requireContains(text, 'pass conditions', epochFile, 'PASS conditions');
  requireContains(text, 'fail conditions', epochFile, 'FAIL conditions');
  requireContains(text, '## evidence requirements', epochFile, 'Evidence');
  requireContains(text, 'blocked', epochFile, 'BLOCKED');
  requireContains(text, 'rollback', epochFile, 'ROLLBACK');
  requireContains(text, '## risk register', epochFile, 'Risks');
  requireContains(text, 'traps', epochFile, 'Traps');

  // c) JSON fenced example
  if (!/```json[\s\S]*?```/i.test(text)) {
    errors.push(`${epochFile} must include at least one fenced JSON example`);
  }

  // e) SSOT refs in each epoch
  for (const ssot of ssotDocs) {
    if (!text.includes(ssot)) {
      errors.push(`${epochFile} missing SSOT reference: ${ssot}`);
    }
  }

  // f) source hygiene in epoch text
  const lower = text.toLowerCase();
  for (const domain of bannedDomains) {
    let pos = lower.indexOf(domain);
    while (pos !== -1) {
      const start = Math.max(0, pos - 120);
      const end = Math.min(lower.length, pos + domain.length + 120);
      const ctx = lower.slice(start, end);
      if (!ctx.includes('lead')) {
        errors.push(`${epochFile} has banned proof source domain without LEAD label: ${domain}`);
      }
      pos = lower.indexOf(domain, pos + domain.length);
    }
  }
}

// d) dependency consistency index vs ledger for 31..40
if (fs.existsSync('specs/epochs/INDEX.md') && fs.existsSync('specs/epochs/LEDGER.json')) {
  const indexText = read('specs/epochs/INDEX.md');
  const ledger = JSON.parse(read('specs/epochs/LEDGER.json'));

  const depRegex = /EPOCH-(\d{2}) depends on EPOCH-(\d{2})/g;
  const depsFromIndex = new Map();
  let m;
  while ((m = depRegex.exec(indexText)) !== null) {
    depsFromIndex.set(Number(m[1]), `EPOCH-${m[2]}`);
  }

  for (let epoch = EPOCH_START; epoch <= EPOCH_END; epoch += 1) {
    const row = ledger.epochs?.[String(epoch)];
    if (!row) {
      errors.push(`LEDGER missing epoch ${epoch}`);
      continue;
    }
    const ledgerDep = Array.isArray(row.depends_on) && row.depends_on.length > 0 ? String(row.depends_on[0]) : '';
    const indexDep = depsFromIndex.get(epoch) || '';
    if (!indexDep) errors.push(`INDEX missing dependency note for EPOCH-${String(epoch).padStart(2, '0')}`);
    if (ledgerDep !== indexDep) {
      errors.push(`Dependency mismatch for EPOCH-${String(epoch).padStart(2, '0')}: INDEX=${indexDep || 'NONE'} LEDGER=${ledgerDep || 'NONE'}`);
    }
  }
}

// f) source hygiene scan on core EDGE docs
const hygieneFiles = [
  'docs/EDGE_RESEARCH/SOURCES.md',
  'docs/EDGE_RESEARCH/DECISION_MATRIX.md',
  'docs/EDGE_RESEARCH/RECOMMENDED_STACK.md',
  'docs/EDGE_RESEARCH/AI_MODULE.md',
  'docs/EDGE_RESEARCH/ANTI_PATTERNS.md',
  'docs/SDD_EDGE_EPOCHS_31_40.md'
];
for (const file of hygieneFiles) {
  if (!fs.existsSync(file)) continue;
  const lower = read(file).toLowerCase();
  for (const domain of bannedDomains) {
    let pos = lower.indexOf(domain);
    while (pos !== -1) {
      const start = Math.max(0, pos - 120);
      const end = Math.min(lower.length, pos + domain.length + 120);
      const ctx = lower.slice(start, end);
      if (!ctx.includes('lead')) {
        errors.push(`${file} has banned proof source domain without LEAD label: ${domain}`);
      }
      pos = lower.indexOf(domain, pos + domain.length);
    }
  }
}

if (errors.length > 0) {
  console.error('verify:specs:strict FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('verify:specs:strict PASSED');
console.log('Validated EDGE strict quality for epochs 31..40');
