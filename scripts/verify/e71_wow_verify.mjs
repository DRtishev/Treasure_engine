#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const LEDGER = path.resolve('docs/wow/WOW_LEDGER.md');
const TRICKS = path.resolve('docs/wow/tricks');
const REQUIRED = [
  'W-ID:',
  'Category:',
  'Problem:',
  'Solution:',
  'Contract (PASS commands):',
  'Minimal diff:',
  'Risks:',
  'Rollback:',
  'Where used:'
];

function normalize(text) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd() + '\n';
}

function parseLedgerRows(raw) {
  return raw.split(/\r?\n/)
    .filter((line) => /^\|\sW-\d{4}\s\|/.test(line))
    .map((line) => line.split('|').map((x) => x.trim()).filter(Boolean))
    .map((parts) => ({ wid: parts[0], file: parts[5] }));
}

export function computeWowFingerprint() {
  const files = fs.readdirSync(TRICKS)
    .filter((f) => /^W-\d{4}-.+\.md$/.test(f))
    .sort();
  if (files.length < 12) throw new Error('WOW requires at least 12 cards');

  const chunks = [];
  const ids = new Set();
  for (const file of files) {
    const abs = path.join(TRICKS, file);
    const raw = normalize(fs.readFileSync(abs, 'utf8'));
    for (const header of REQUIRED) {
      if (!raw.includes(`\n${header}`) && !raw.startsWith(`${header}`)) throw new Error(`missing ${header} in ${file}`);
    }
    const m = raw.match(/^W-ID:\s*(W-\d{4})$/m);
    if (!m) throw new Error(`W-ID missing in ${file}`);
    if (ids.has(m[1])) throw new Error(`duplicate W-ID ${m[1]}`);
    ids.add(m[1]);
    if (raw.match(/(^|\s)\//m)) {
      // no absolute paths
      if (/\n[^\n]*\/[A-Za-z0-9]/.test(raw)) throw new Error(`forbidden absolute path pattern in ${file}`);
    }
    chunks.push(`## ${m[1]}\n${raw}`);
  }

  const ledgerRaw = normalize(fs.readFileSync(LEDGER, 'utf8'));
  const rows = parseLedgerRows(ledgerRaw).sort((a, b) => a.wid.localeCompare(b.wid));
  if (rows.length !== files.length) throw new Error('ledger count mismatch');
  for (const r of rows) {
    if (!ids.has(r.wid)) throw new Error(`ledger id ${r.wid} missing card`);
    if (!fs.existsSync(path.resolve(r.file))) throw new Error(`ledger file missing ${r.file}`);
  }

  return crypto.createHash('sha256').update(chunks.join('\n\n') + `\n## LEDGER\n${ledgerRaw}`).digest('hex');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fp = computeWowFingerprint();
  console.log(`verify:wow PASSED wow_fingerprint=${fp}`);
}
