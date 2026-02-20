import fs from 'node:fs';
import path from 'node:path';
import { sha256Text } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const MANUAL = path.join(EVIDENCE_DIR, 'gates', 'manual');

function collect() {
  const out = [];
  // Evidence root .md files (includes GOVERNANCE_FINGERPRINT.md)
  if (fs.existsSync(EVIDENCE_DIR)) {
    for (const f of fs.readdirSync(EVIDENCE_DIR).sort()) {
      const p = path.join(EVIDENCE_DIR, f);
      if (fs.statSync(p).isFile() && f.endsWith('.md')) out.push(`reports/evidence/EDGE_LAB/${f}`);
    }
  }
  // Gate JSON files
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

if (status !== 'PASS') process.exit(1);
console.log('[PASS] edge:ledger');
