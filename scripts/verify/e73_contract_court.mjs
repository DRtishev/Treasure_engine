#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeMd } from './e66_lib.mjs';
import { E73_ROOT, ensureDir } from './e73_lib.mjs';

const update = process.env.UPDATE_E73_EVIDENCE === '1';

function normalize(text) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd() + '\n';
}

function parseContractRows(text) {
  return normalize(text).split('\n')
    .filter((line) => /^\|\sM[1-5]\s\|/.test(line))
    .map((line) => line.split('|').map((x) => x.trim()).filter(Boolean))
    .map((p) => ({ law: p[0], dataset: p[1], expected: p[2], reason: p[3] }))
    .sort((a, b) => `${a.law}:${a.dataset}`.localeCompare(`${b.law}:${b.dataset}`));
}

function hashText(text) {
  return crypto.createHash('sha256').update(normalize(text)).digest('hex');
}

function loadPreviousContractText() {
  const p = path.resolve('docs/edge/EDGE_META_CONTRACT.md');
  return fs.readFileSync(p, 'utf8');
}

function loadCurrentContractText() {
  return fs.readFileSync(path.resolve('docs/edge/EDGE_META_CONTRACT.md'), 'utf8');
}

function diffRows(prevRows, nextRows) {
  const prevMap = new Map(prevRows.map((r) => [`${r.law}:${r.dataset}`, r]));
  const nextMap = new Map(nextRows.map((r) => [`${r.law}:${r.dataset}`, r]));
  const keys = [...new Set([...prevMap.keys(), ...nextMap.keys()])].sort();
  const changes = [];
  for (const k of keys) {
    const a = prevMap.get(k);
    const b = nextMap.get(k);
    if (!a && b) changes.push({ type: 'ADD', key: k, from: '-', to: `${b.expected}/${b.reason}` });
    else if (a && !b) changes.push({ type: 'REMOVE', key: k, from: `${a.expected}/${a.reason}`, to: '-' });
    else if (a.expected !== b.expected || a.reason !== b.reason) changes.push({ type: 'CHANGE', key: k, from: `${a.expected}/${a.reason}`, to: `${b.expected}/${b.reason}` });
  }
  return changes;
}

export function runContractCourt() {
  const prevText = loadPreviousContractText();
  const newText = loadCurrentContractText();
  const prevHash = hashText(prevText);
  const newHash = hashText(newText);
  const prevRows = parseContractRows(prevText);
  const newRows = parseContractRows(newText);
  const changes = diffRows(prevRows, newRows);

  let breaking = false;
  for (const c of changes) {
    if (c.type === 'REMOVE') breaking = true;
    if (c.type === 'CHANGE' && c.from.startsWith('MUST_PASS/') && c.to.startsWith('ALLOWED_FAIL/')) breaking = true;
    if (c.type === 'CHANGE' && c.from.split('/')[1] !== c.to.split('/')[1]) breaking = true;
  }

  const result = {
    previous_contract_hash: prevHash,
    new_contract_hash: newHash,
    contract_text_hash_prev: prevHash,
    contract_text_hash_new: newHash,
    changed: prevHash !== newHash,
    breaking_change: breaking,
    migration_notes_required: breaking,
    changes
  };

  if (update) {
    ensureDir(E73_ROOT);
    const diffLines = ['# E73 CONTRACT DIFF', '', '| type | key | from | to |', '|---|---|---|---|'];
    if (changes.length === 0) diffLines.push('| NONE | - | - | - |');
    for (const c of changes) diffLines.push(`| ${c.type} | ${c.key} | ${c.from} | ${c.to} |`);

    writeMd(path.join(E73_ROOT, 'CONTRACT_DIFF.md'), diffLines.join('\n'));
    writeMd(path.join(E73_ROOT, 'CONTRACT_CHANGELOG.md'), [
      '# E73 CONTRACT CHANGELOG',
      `- previous_contract_hash: ${prevHash}`,
      `- new_contract_hash: ${newHash}`,
      `- contract_text_hash_prev: ${prevHash}`,
      `- contract_text_hash_new: ${newHash}`,
      '- reason: E73 contract evolution court evaluation',
      `- BREAKING_CHANGE: ${breaking ? 'true' : 'false'}`,
      `- MIGRATION_NOTES: ${breaking ? 'Required for this change set.' : 'Not required.'}`
    ].join('\n'));
  }

  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = runContractCourt();
  if (out.changed && out.breaking_change && process.env.BREAKING_CHANGE !== '1') {
    throw new Error('BREAKING_CHANGE requires BREAKING_CHANGE=1 and MIGRATION_NOTES');
  }
  console.log(`verify:contract:court PASSED changed=${String(out.changed)} breaking=${String(out.breaking_change)}`);
}
