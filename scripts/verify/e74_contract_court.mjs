#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E74_ROOT, ensureDir } from './e74_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update = process.env.UPDATE_E74_EVIDENCE === '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E74_EVIDENCE=1 forbidden when CI=true');

function normalize(text) { return text.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd() + '\n'; }

function parseRows(text) {
  return normalize(text).split('\n')
    .filter((line) => /^\|\sM\d+\s\|/.test(line))
    .map((line) => line.split('|').map((x) => x.trim()).filter(Boolean))
    .map((p) => ({ law: p[0], dataset: p[1], expected: p[2], reason: p[3] }))
    .sort((a, b) => `${a.law}:${a.dataset}`.localeCompare(`${b.law}:${b.dataset}`));
}

function parseRegistry() {
  return new Set(normalize(fs.readFileSync(path.resolve('docs/edge/EDGE_REASON_CODES.md'), 'utf8')).split('\n')
    .filter((line) => /^\|\s[A-Z0-9_]+\s\|/.test(line))
    .map((line) => line.split('|').map((x) => x.trim()).filter(Boolean)[0]));
}

function parseBudgets() {
  const lines = normalize(fs.readFileSync(path.resolve('docs/edge/EDGE_META_CONTRACT.md'), 'utf8')).split('\n');
  const max_total = Number((lines.find((l) => /^max_total:/.test(l)) || 'max_total: 0').split(':')[1].trim());
  const per_law = {}; let mode = '';
  for (const line of lines) {
    if (/^per_law:/.test(line)) mode = 'law';
    else if (/^per_regime:/.test(line)) mode = '';
    else if (/^- /.test(line) && mode === 'law') {
      const [k, v] = line.slice(2).split(':').map((x) => x.trim());
      per_law[k] = Number(v);
    }
  }
  return { max_total, per_law };
}

function parseChangelog(raw) {
  return {
    breaking: /BREAKING_CHANGE:\s*true/i.test(raw),
    hasMigration: /MIGRATION_NOTES:\s*(?!\s*$).+/im.test(raw)
  };
}

function diffRows(prevRows, newRows) {
  const pm = new Map(prevRows.map((r) => [`${r.law}:${r.dataset}`, r]));
  const nm = new Map(newRows.map((r) => [`${r.law}:${r.dataset}`, r]));
  const keys = [...new Set([...pm.keys(), ...nm.keys()])].sort();
  const changes = [];
  for (const key of keys) {
    const a = pm.get(key); const b = nm.get(key);
    if (!a && b) changes.push({ type: 'ADD', key, from: '-', to: `${b.expected}/${b.reason}` });
    else if (a && !b) changes.push({ type: 'REMOVE', key, from: `${a.expected}/${a.reason}`, to: '-' });
    else if (a.expected !== b.expected || a.reason !== b.reason) changes.push({ type: 'CHANGE', key, from: `${a.expected}/${a.reason}`, to: `${b.expected}/${b.reason}` });
  }
  return changes;
}

function evaluateCourt(inputs) {
  const { prevRows, newRows, diffText, changelogText, registry, budgets } = inputs;
  const changes = diffRows(prevRows, newRows);
  const changed = changes.length > 0;
  const breakingByRows = changes.some((c) => c.type === 'CHANGE' && c.from.startsWith('MUST_PASS/') && c.to.startsWith('ALLOWED_FAIL/'));
  const declared = parseChangelog(changelogText);
  const failures = [];

  if (changed && (!diffText.trim() || !changelogText.trim())) failures.push('FAIL_DIFF_OR_CHANGELOG_MISSING');
  if (breakingByRows && !declared.breaking) failures.push('FAIL_BREAKING_CHANGE_REQUIRED');
  if (declared.breaking && !declared.hasMigration) failures.push('FAIL_MIGRATION_NOTES_REQUIRED');

  let allowedFailTotal = 0;
  const allowedPerLaw = {};
  for (const row of newRows) {
    if (row.expected === 'ALLOWED_FAIL') {
      allowedFailTotal += 1;
      allowedPerLaw[row.law] = (allowedPerLaw[row.law] || 0) + 1;
      if (!registry.has(row.reason)) failures.push(`FAIL_UNKNOWN_REASON_CODE:${row.reason}`);
    }
    if (row.expected === 'MUST_PASS' && row.reason !== 'NOT_APPLICABLE') failures.push(`FAIL_MUST_PASS_REASON:${row.law}:${row.dataset}`);
  }
  if (Number.isNaN(budgets.max_total) || budgets.max_total <= 0) failures.push('FAIL_BUDGETS_MISSING');
  if (allowedFailTotal > budgets.max_total) failures.push('FAIL_BUDGET_MAX_TOTAL_EXCEEDED');
  for (const [law, count] of Object.entries(allowedPerLaw)) {
    if (Object.prototype.hasOwnProperty.call(budgets.per_law, law) && budgets.per_law[law] < count) failures.push(`FAIL_BUDGET_PER_LAW_EXCEEDED:${law}`);
  }

  return { changed, breakingByRows, failures: [...new Set(failures)].sort(), changes, allowedFailTotal, allowedPerLaw };
}

function runSelftest(registry, budgets) {
  const prev = parseRows(fs.readFileSync(path.resolve('docs/edge/contract_fixtures/contract_prev_fixture.md'), 'utf8'));
  const newer = parseRows(fs.readFileSync(path.resolve('docs/edge/contract_fixtures/contract_new_breaking_fixture.md'), 'utf8'));

  const caseA = evaluateCourt({ prevRows: prev, newRows: newer, diffText: '# diff', changelogText: '- MIGRATION_NOTES: migration_notes_fixture.md', registry, budgets });
  const caseB = evaluateCourt({ prevRows: prev, newRows: newer, diffText: '# diff', changelogText: '- BREAKING_CHANGE: true', registry, budgets });
  const badNew = newer.map((r) => ({ ...r, reason: 'FAIL_NOT_IN_REGISTRY' }));
  const caseC = evaluateCourt({ prevRows: prev, newRows: badNew, diffText: '# diff', changelogText: '- BREAKING_CHANGE: true\n- MIGRATION_NOTES: migration_notes_fixture.md', registry, budgets });
  const changelogGood = fs.readFileSync(path.resolve('docs/edge/contract_fixtures/changelog_fixture.md'), 'utf8');
  const diffGood = '# fixture diff present';
  const caseDBudgets = { ...budgets, per_law: { ...budgets.per_law, M2: Math.max(1, budgets.per_law.M2 || 0) }, max_total: Math.max(1, budgets.max_total) };
  const caseD = evaluateCourt({ prevRows: prev, newRows: newer, diffText: diffGood, changelogText: changelogGood, registry, budgets: caseDBudgets });

  return [
    { id: 'A', expect: 'FAIL_BREAKING_CHANGE_REQUIRED', verdict: caseA.failures.includes('FAIL_BREAKING_CHANGE_REQUIRED') ? 'PASS' : 'FAIL', failures: caseA.failures },
    { id: 'B', expect: 'FAIL_MIGRATION_NOTES_REQUIRED', verdict: caseB.failures.includes('FAIL_MIGRATION_NOTES_REQUIRED') ? 'PASS' : 'FAIL', failures: caseB.failures },
    { id: 'C', expect: 'FAIL_UNKNOWN_REASON_CODE', verdict: caseC.failures.some((x) => x.startsWith('FAIL_UNKNOWN_REASON_CODE')) ? 'PASS' : 'FAIL', failures: caseC.failures },
    { id: 'D', expect: 'PASS', verdict: caseD.failures.length === 0 ? 'PASS' : 'FAIL', failures: caseD.failures }
  ];
}

export function runE74ContractCourt() {
  const req = ['CONTRACT_SNAPSHOT_PREV.md', 'CONTRACT_SNAPSHOT_NEW.md'];
  for (const f of req) if (!fs.existsSync(path.join(E74_ROOT, f))) throw new Error(`missing ${f}`);

  const prevRaw = fs.readFileSync(path.join(E74_ROOT, 'CONTRACT_SNAPSHOT_PREV.md'), 'utf8');
  const newRaw = fs.readFileSync(path.join(E74_ROOT, 'CONTRACT_SNAPSHOT_NEW.md'), 'utf8');
  const prevRows = parseRows(prevRaw);
  const newRows = parseRows(newRaw);
  const registry = parseRegistry();
  const budgets = parseBudgets();

  const diffLines = ['# E74 CONTRACT DIFF', '', '| type | key | from | to |', '|---|---|---|---|'];
  const changes = diffRows(prevRows, newRows);
  if (changes.length === 0) diffLines.push('| NONE | - | - | - |');
  for (const c of changes) diffLines.push(`| ${c.type} | ${c.key} | ${c.from} | ${c.to} |`);
  const diffMd = diffLines.join('\n');

  const defaultChangelog = [
    '# E74 CONTRACT CHANGELOG',
    `- previous_contract_hash: ${(prevRaw.match(/normalized_contract_hash:\s*([a-f0-9]{64})/) || [])[1] || 'N/A'}`,
    `- new_contract_hash: ${(newRaw.match(/normalized_contract_hash:\s*([a-f0-9]{64})/) || [])[1] || 'N/A'}`,
    '- BREAKING_CHANGE: true',
    '- MIGRATION_NOTES: docs/edge/contract_fixtures/migration_notes_fixture.md'
  ].join('\n');
  const changelogMd = fs.existsSync(path.resolve('docs/edge/contract_fixtures/changelog_fixture.md'))
    ? normalize(fs.readFileSync(path.resolve('docs/edge/contract_fixtures/changelog_fixture.md'), 'utf8')).trimEnd()
    : defaultChangelog;

  const verdict = evaluateCourt({ prevRows, newRows, diffText: diffMd, changelogText: changelogMd, registry, budgets });
  const selftest = runSelftest(registry, budgets);
  if (selftest.some((x) => x.verdict !== 'PASS')) throw new Error('selftest matrix failed');
  if (verdict.failures.length > 0) throw new Error(`contract court policy fail: ${verdict.failures.join(',')}`);

  const courtMd = [
    '# E74 CONTRACT COURT',
    `- changed: ${verdict.changed ? 'true' : 'false'}`,
    `- breaking_change: ${verdict.breakingByRows ? 'true' : 'false'}`,
    `- failures: ${verdict.failures.length === 0 ? 'NONE' : verdict.failures.join(',')}`,
    `- allowed_fail_total: ${verdict.allowedFailTotal}`,
    `- budgets_max_total: ${budgets.max_total}`
  ].join('\n');

  const selftestMd = [
    '# E74 CONTRACT COURT SELFTEST',
    ...selftest.map((x) => `- case_${x.id}: ${x.verdict} (${x.expect})`),
    ...selftest.flatMap((x) => x.failures.map((f) => `  - ${f}`))
  ].join('\n');

  if (update && process.env.CI !== 'true') {
    ensureDir(E74_ROOT);
    writeMd(path.join(E74_ROOT, 'CONTRACT_COURT.md'), courtMd);
    writeMd(path.join(E74_ROOT, 'CONTRACT_DIFF.md'), diffMd);
    writeMd(path.join(E74_ROOT, 'CONTRACT_CHANGELOG.md'), changelogMd);
    writeMd(path.join(E74_ROOT, 'CONTRACT_COURT_SELFTEST.md'), selftestMd);
  } else {
    for (const f of ['CONTRACT_COURT.md', 'CONTRACT_DIFF.md', 'CONTRACT_CHANGELOG.md', 'CONTRACT_COURT_SELFTEST.md']) {
      if (!fs.existsSync(path.join(E74_ROOT, f))) throw new Error(`missing ${f}`);
    }
    const selfRaw = fs.readFileSync(path.join(E74_ROOT, 'CONTRACT_COURT_SELFTEST.md'), 'utf8');
    if (!/case_D:\s*PASS\s*\(PASS\)/.test(selfRaw) || !/FAIL_BREAKING_CHANGE_REQUIRED/.test(selfRaw) || !/FAIL_MIGRATION_NOTES_REQUIRED/.test(selfRaw) || !/FAIL_UNKNOWN_REASON_CODE/.test(selfRaw)) {
      throw new Error('selftest proof missing');
    }
  }

  return { changed: verdict.changed, breaking: verdict.breakingByRows };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = runE74ContractCourt();
  console.log(`verify:contract:court:selftest PASSED changed=${String(out.changed)} breaking=${String(out.breaking)}`);
}
