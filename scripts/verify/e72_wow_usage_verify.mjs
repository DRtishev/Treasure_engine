#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { computeWowFingerprint } from './e71_wow_verify.mjs';

const LEDGER = path.resolve('docs/wow/WOW_LEDGER.md');
const TRICKS = path.resolve('docs/wow/tricks');

function normalize(text) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd() + '\n';
}

function parseLedger(raw) {
  return raw.split(/\r?\n/)
    .filter((line) => /^\|\sW-\d{4}\s\|/.test(line))
    .map((line) => line.split('|').map((x) => x.trim()).filter(Boolean))
    .map((p) => ({ wid: p[0], status: p[3], file: p[5] }))
    .sort((a, b) => a.wid.localeCompare(b.wid));
}

export function computeWowUsageFingerprint(selectedIds = []) {
  const ledgerRaw = normalize(fs.readFileSync(LEDGER, 'utf8'));
  const rows = parseLedger(ledgerRaw);
  const active = rows.filter((x) => x.status === 'Active');

  for (const row of active) {
    const cardPath = path.resolve(row.file);
    if (!fs.existsSync(cardPath)) throw new Error(`Missing card ${row.file}`);
    const card = normalize(fs.readFileSync(cardPath, 'utf8'));
    const whereUsed = (card.match(/^Where used:\s*(.+)$/m) || [])[1] || '';
    const reserved = (card.match(/^status:\s*reserved$/im) || [])[0] || '';
    const reservedReason = (card.match(/^reason:\s*(.+)$/im) || [])[1] || '';
    if (!(whereUsed.trim() !== '' || (reserved && reservedReason.trim() !== ''))) {
      throw new Error(`Active card ${row.wid} missing usage or reserved reason`);
    }
  }

  const uniq = [...new Set(selectedIds)].sort();
  if (uniq.length < 3) throw new Error('WOW_USED must include at least 3 cards');
  for (const id of uniq) {
    if (!active.some((x) => x.wid === id)) throw new Error(`WOW_USED id not active/in-ledger: ${id}`);
  }

  const wowFingerprint = computeWowFingerprint();
  const payload = [
    `wow_fingerprint=${wowFingerprint}`,
    `selected=${uniq.join(',')}`,
    ...active.map((x) => `${x.wid}:${x.file}`)
  ].join('\n');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const selected = String(process.env.WOW_USED || 'W-0001,W-0004,W-0008').split(',').map((x) => x.trim()).filter(Boolean);
  const wowFp = computeWowFingerprint();
  const usageFp = computeWowUsageFingerprint(selected);
  console.log(`verify:wow:usage PASSED wow_fingerprint=${wowFp} wow_usage_fingerprint=${usageFp}`);
}
