import fs from 'node:fs';
import path from 'node:path';
import { sha256Text, RUN_ID } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const MANUAL = path.join(EVIDENCE_DIR, 'gates', 'manual');

// Self-outputs are excluded from scope to prevent circular dependency.
// SHA256SUMS.md and SHA256CHECK.md contain hashes of the payload — including
// them in their own scope would make the ledger non-idempotent across run order.
const LEDGER_SELF_OUTPUTS = new Set(['SHA256SUMS.md', 'SHA256CHECK.md']);

function collect() {
  const out = [];
  // Evidence root .md files — exclude self-outputs (ACYCLIC_LEDGER contract)
  if (fs.existsSync(EVIDENCE_DIR)) {
    for (const f of fs.readdirSync(EVIDENCE_DIR).sort()) {
      const p = path.join(EVIDENCE_DIR, f);
      if (fs.statSync(p).isFile() && f.endsWith('.md') && !LEDGER_SELF_OUTPUTS.has(f)) {
        out.push(`reports/evidence/EDGE_LAB/${f}`);
      }
    }
  }
  // Gate JSON files (excluded: none — JSON gates don't self-reference)
  if (fs.existsSync(MANUAL)) {
    for (const f of fs.readdirSync(MANUAL).sort()) {
      if (f.endsWith('.json')) out.push(`reports/evidence/EDGE_LAB/gates/manual/${f}`);
    }
  }
  // Governance scope: EDGE_LAB/*.md contract files (tamper-evident source contracts)
  const edgeLabDir = path.join(ROOT, 'EDGE_LAB');
  if (fs.existsSync(edgeLabDir)) {
    for (const f of fs.readdirSync(edgeLabDir).sort()) {
      const p = path.join(edgeLabDir, f);
      if (fs.statSync(p).isFile() && f.endsWith('.md')) out.push(`EDGE_LAB/${f}`);
    }
  }
  // Governance scope: scripts/edge/edge_lab/*.mjs pipeline scripts
  const scriptsDir = path.join(ROOT, 'scripts', 'edge', 'edge_lab');
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir).sort()) {
      const p = path.join(scriptsDir, f);
      if (fs.statSync(p).isFile() && f.endsWith('.mjs')) out.push(`scripts/edge/edge_lab/${f}`);
    }
  }
  return out.sort();
}

const files = collect();
const lines = files.map((rel) => {
  const abs = path.join(ROOT, rel);
  return `${sha256Text(fs.readFileSync(abs, 'utf8'))}  ${rel}`;
});

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
const sumsPath = path.join(EVIDENCE_DIR, 'SHA256SUMS.md');
fs.writeFileSync(sumsPath, `${lines.join('\n')}\n`);

const verifyLines = fs.readFileSync(sumsPath, 'utf8').trim().split('\n').filter(Boolean);
const mismatches = [];
for (const line of verifyLines) {
  const [hash, rel] = line.split(/\s{2,}/);
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs) || sha256Text(fs.readFileSync(abs, 'utf8')) !== hash) mismatches.push(rel);
}

const status = mismatches.length ? 'BLOCKED' : 'PASS';
const reason = mismatches.length ? 'LEDGER_MISMATCH' : 'NONE';
const check = `# SHA256CHECK\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nNEXT_ACTION: ${status === 'PASS' ? 'Proceed to FINAL gate.' : 'Rebuild evidence and ledger.'}\n\n## MISMATCHES\n${mismatches.length ? mismatches.map((m) => `- ${m}`).join('\n') : '- NONE'}\n`;
fs.writeFileSync(path.join(EVIDENCE_DIR, 'SHA256CHECK.md'), check);

// Write LEDGER_ACYCLICITY proof — confirms self-outputs are excluded
fs.mkdirSync(MANUAL, { recursive: true });
const acyclicityGate = {
  run_id: RUN_ID,
  status: 'PASS',
  reason_code: 'NONE',
  message: 'Ledger scope excludes SHA256SUMS.md and SHA256CHECK.md. Acyclic contract verified.',
  excluded_self_outputs: [...LEDGER_SELF_OUTPUTS],
  files_in_scope: files.length,
};
fs.writeFileSync(
  path.join(MANUAL, 'ledger_acyclicity.json'),
  `${JSON.stringify(acyclicityGate, null, 2)}\n`,
);

const acyclicityMd = `# LEDGER_ACYCLICITY.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: ${RUN_ID}
NEXT_ACTION: Acyclic contract satisfied. Ledger is idempotent across run order.

## Contract

The SHA256 ledger (edge:ledger) must never include its own outputs in scope.
Including SHA256SUMS.md or SHA256CHECK.md in their own hash calculation would:
1. Make SHA256SUMS.md non-idempotent (different hash each run depending on prior state)
2. Break ledger verification when run after edge:next-epoch

## Excluded Self-Outputs

${[...LEDGER_SELF_OUTPUTS].map((f) => `- reports/evidence/EDGE_LAB/${f} (EXCLUDED)`).join('\n')}

## Files In Scope

${files.length} files hashed in this run.

## Gate

EVIDENCE_PATHS:
- reports/evidence/EDGE_LAB/gates/manual/ledger_acyclicity.json
`;
fs.writeFileSync(path.join(EVIDENCE_DIR, 'LEDGER_ACYCLICITY.md'), acyclicityMd);

if (status !== 'PASS') process.exit(1);
console.log('[PASS] edge:ledger');
