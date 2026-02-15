#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E74_ROOT, ensureDir, readE73Binding } from './e74_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update = process.env.UPDATE_E74_EVIDENCE === '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E74_EVIDENCE=1 forbidden when CI=true');

function normalize(text) { return text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd() + '\n'; }
function hashText(text) { return crypto.createHash('sha256').update(normalize(text)).digest('hex'); }
function loadFixture(name) { return fs.readFileSync(path.resolve(`docs/edge/contract_fixtures/${name}`), 'utf8'); }

function parseRows(text) {
  return normalize(text).split('\n')
    .filter((line) => /^\|\sM\d+\s\|/.test(line))
    .map((line) => line.split('|').map((x) => x.trim()).filter(Boolean))
    .map((p) => ({ law: p[0], dataset: p[1], expected_status: p[2], reason_code_if_not_must_pass: p[3] }))
    .sort((a, b) => `${a.law}:${a.dataset}`.localeCompare(`${b.law}:${b.dataset}`));
}

function canonicalFixture(label, rows) {
  const title = label === 'PREV' ? '# Contract Fixture PREV' : '# Contract Fixture NEW BREAKING';
  return [
    title,
    '',
    '| law | dataset | expected_status | reason_code_if_not_must_pass |',
    '|---|---|---|---|',
    ...rows.map((r) => `| ${r.law} | ${r.dataset} | ${r.expected_status} | ${r.reason_code_if_not_must_pass} |`)
  ].join('\n');
}

function toSnapshot(label, fixturePath, fixtureHash, chain, rows) {
  return [
    `# E74 CONTRACT SNAPSHOT ${label}`,
    `- source_fixture: ${fixturePath}`,
    `- e73_canonical_fingerprint: ${chain.e73_canonical_fingerprint}`,
    `- chain_bundle_fingerprint: ${chain.chain_bundle_fingerprint}`,
    `- normalized_contract_hash: ${fixtureHash}`,
    '',
    '| law | dataset | expected_status | reason_code_if_not_must_pass |',
    '|---|---|---|---|',
    ...rows.map((r) => `| ${r.law} | ${r.dataset} | ${r.expected_status} | ${r.reason_code_if_not_must_pass} |`)
  ].join('\n');
}

export function runE74ContractSnapshots() {
  const chain = readE73Binding();
  const prevFixturePath = 'docs/edge/contract_fixtures/contract_prev_fixture.md';
  const newFixturePath = 'docs/edge/contract_fixtures/contract_new_breaking_fixture.md';
  const prevFixture = loadFixture('contract_prev_fixture.md');
  const newFixture = loadFixture('contract_new_breaking_fixture.md');
  const prevRows = parseRows(prevFixture);
  const newRows = parseRows(newFixture);
  const prevHash = hashText(canonicalFixture('PREV', prevRows));
  const newHash = hashText(canonicalFixture('NEW', newRows));

  if (update && process.env.CI !== 'true') {
    ensureDir(E74_ROOT);
    writeMd(path.join(E74_ROOT, 'CONTRACT_SNAPSHOT_PREV.md'), toSnapshot('PREV', prevFixturePath, prevHash, chain, prevRows));
    writeMd(path.join(E74_ROOT, 'CONTRACT_SNAPSHOT_NEW.md'), toSnapshot('NEW', newFixturePath, newHash, chain, newRows));
  }

  const specs = [
    { file: 'CONTRACT_SNAPSHOT_PREV.md', label: 'PREV', expectedHash: prevHash },
    { file: 'CONTRACT_SNAPSHOT_NEW.md', label: 'NEW', expectedHash: newHash }
  ];
  for (const spec of specs) {
    const p = path.join(E74_ROOT, spec.file);
    if (!fs.existsSync(p)) throw new Error(`missing ${spec.file}`);
    const raw = fs.readFileSync(p, 'utf8');
    const embedded = (raw.match(/normalized_contract_hash:\s*([a-f0-9]{64})/) || [])[1] || '';
    const rows = parseRows(raw);
    const rehash = hashText(canonicalFixture(spec.label, rows));
    if (!embedded) throw new Error(`normalized_contract_hash missing in ${spec.file}`);
    if (embedded !== rehash || embedded !== spec.expectedHash) throw new Error(`snapshot hash mismatch in ${spec.file}`);
    if (!new RegExp(`chain_bundle_fingerprint:\\s*${chain.chain_bundle_fingerprint}`).test(raw)) throw new Error(`E73 binding missing in ${spec.file}`);
  }

  return { prevHash, newHash, changed: prevHash !== newHash };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = runE74ContractSnapshots();
  console.log(`verify:contract:snapshots PASSED changed=${String(out.changed)} prev=${out.prevHash} new=${out.newHash}`);
}
