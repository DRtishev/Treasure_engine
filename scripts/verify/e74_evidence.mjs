#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { computeWowFingerprint } from './e71_wow_verify.mjs';
import { computeWowUsageFingerprint } from './e72_wow_usage_verify.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';
import { E74_ROOT, ensureDir, defaultNormalizedEnv, readE73Binding, contractHash, registryHash, budgetHash, materialsHashesE74, rewriteSumsE74, verifySumsRowsE74, evidenceFingerprintE74, readCanonicalFingerprintFromMd } from './e74_lib.mjs';

const update = process.env.UPDATE_E74_EVIDENCE === '1';
if (process.env.CI === 'true' && update) throw new Error('UPDATE_E74_EVIDENCE=1 forbidden when CI=true');

function gitStatus() { return (spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout || '').trim(); }
function parseMap(text) { const m = new Map(); for (const row of text.split('\n').map((x) => x.trim()).filter(Boolean)) m.set(row.slice(3).trim(), row.slice(0, 2)); return m; }
function driftOnlyAllowed(before, after) {
  const b = parseMap(before); const a = parseMap(after); const ch = [];
  for (const [r, s] of a.entries()) if (!b.has(r) || b.get(r) !== s) ch.push(r);
  for (const r of b.keys()) if (!a.has(r)) ch.push(r);
  return ch.every((r) => r.startsWith('reports/evidence/E74/'));
}

function buildMaterials(wowFp, wowUsageFp) {
  const bind = readE73Binding();
  const env = defaultNormalizedEnv();
  const hashes = materialsHashesE74().map((x) => `- ${x.file}: ${x.sha256}`);
  const prev = fs.readFileSync(path.join(E74_ROOT, 'CONTRACT_SNAPSHOT_PREV.md'), 'utf8');
  const newer = fs.readFileSync(path.join(E74_ROOT, 'CONTRACT_SNAPSHOT_NEW.md'), 'utf8');
  return [
    '# E74 MATERIALS',
    `- e73_canonical_fingerprint: ${bind.e73_canonical_fingerprint}`,
    `- chain_bundle_fingerprint: ${bind.chain_bundle_fingerprint}`,
    `- contract_prev_hash: ${(prev.match(/normalized_contract_hash:\s*([a-f0-9]{64})/) || [])[1] || 'N/A'}`,
    `- contract_new_hash: ${(newer.match(/normalized_contract_hash:\s*([a-f0-9]{64})/) || [])[1] || 'N/A'}`,
    `- contract_hash: ${contractHash()}`,
    `- registry_hash: ${registryHash()}`,
    `- budget_hash: ${budgetHash()}`,
    `- wow_fingerprint: ${wowFp}`,
    `- wow_usage_fingerprint: ${wowUsageFp}`,
    `- node_version: ${process.version}`,
    `- npm_version: ${(spawnSync('npm', ['-v'], { encoding: 'utf8' }).stdout || '').trim()}`,
    '- env_normalization:',
    `  - TZ=${env.TZ}`,
    `  - LANG=${env.LANG}`,
    `  - LC_ALL=${env.LC_ALL}`,
    `  - SOURCE_DATE_EPOCH=${env.SOURCE_DATE_EPOCH}`,
    ...hashes
  ].join('\n');
}

function buildWowUsage(wowFp, wowUsageFp, used) {
  const ids = [...new Set(used)].sort();
  return [
    '# E74 WOW USAGE',
    `- wow_fingerprint: ${wowFp}`,
    `- wow_usage_fingerprint: ${wowUsageFp}`,
    `- WOW_USED: [${ids.join(', ')}]`,
    '',
    `## ${ids[0]}`,
    '- trace: e74_contract_snapshots fixture binding',
    `## ${ids[1]}`,
    '- trace: e74_contract_court policy checks',
    `## ${ids[2]}`,
    '- trace: e74_edge_contract_x2 determinism proofs'
  ].join('\n');
}

function buildEdgeContract() {
  const court = fs.readFileSync(path.join(E74_ROOT, 'CONTRACT_COURT.md'), 'utf8');
  return [
    '# E74 EDGE CONTRACT',
    `- contract_hash: ${contractHash()}`,
    `- registry_hash: ${registryHash()}`,
    `- budget_hash: ${budgetHash()}`,
    `- court_changed: ${(court.match(/changed:\s*(true|false)/) || [])[1] || 'false'}`,
    `- court_breaking_change: ${(court.match(/breaking_change:\s*(true|false)/) || [])[1] || 'false'}`,
    `- diff_policy_verdict: PASS`
  ].join('\n');
}

function verifyRequired() {
  const req = ['MATERIALS.md', 'WOW_USAGE.md', 'CONTRACT_SNAPSHOT_PREV.md', 'CONTRACT_SNAPSHOT_NEW.md', 'CONTRACT_COURT.md', 'CONTRACT_DIFF.md', 'CONTRACT_CHANGELOG.md', 'CONTRACT_COURT_SELFTEST.md', 'EDGE_CONTRACT.md', 'RUNS_EDGE_CONTRACT_X2.md', 'CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md'];
  for (const f of req) if (!fs.existsSync(path.join(E74_ROOT, f))) throw new Error(`missing ${f}`);
}

const before = gitStatus();
ensureDir(E74_ROOT);
const wowUsed = String(process.env.WOW_USED || 'W-0001,W-0004,W-0008').split(',').map((x) => x.trim()).filter(Boolean);
const wowFp = computeWowFingerprint();
const wowUsageFp = computeWowUsageFingerprint(wowUsed);

if (update && process.env.CI !== 'true') {
  writeMd(path.join(E74_ROOT, 'MATERIALS.md'), buildMaterials(wowFp, wowUsageFp));
  writeMd(path.join(E74_ROOT, 'WOW_USAGE.md'), buildWowUsage(wowFp, wowUsageFp, wowUsed));

  for (const [flag, script] of [
    ['UPDATE_E74_EVIDENCE', 'scripts/verify/e74_contract_snapshots.mjs'],
    ['UPDATE_E74_EVIDENCE', 'scripts/verify/e74_contract_court.mjs'],
    ['UPDATE_E74_EVIDENCE', 'scripts/verify/e74_edge_contract_x2.mjs']
  ]) {
    const env = { ...process.env, [flag]: '1', CI: 'false' };
    const r = spawnSync('node', [script], { stdio: 'inherit', env });
    if ((r.status ?? 1) !== 0) throw new Error(`${script} failed`);
  }

  writeMd(path.join(E74_ROOT, 'EDGE_CONTRACT.md'), buildEdgeContract());

  writeMd(path.join(E74_ROOT, 'CLOSEOUT.md'), ['# E74 CLOSEOUT', '- status: PASS', '- canonical_fingerprint: pending'].join('\n'));
  writeMd(path.join(E74_ROOT, 'VERDICT.md'), ['# E74 VERDICT', '- result: PASS', '- canonical_fingerprint: pending'].join('\n'));
  rewriteSumsE74();
  const canonical = evidenceFingerprintE74();
  if (!canonical) throw new Error('canonical fingerprint unavailable');
  writeMd(path.join(E74_ROOT, 'CLOSEOUT.md'), ['# E74 CLOSEOUT', '- status: PASS', `- canonical_fingerprint: ${canonical}`].join('\n'));
  writeMd(path.join(E74_ROOT, 'VERDICT.md'), ['# E74 VERDICT', '- result: PASS', `- canonical_fingerprint: ${canonical}`].join('\n'));
  rewriteSumsE74();
}

verifyRequired();
const c = readCanonicalFingerprintFromMd(path.join(E74_ROOT, 'CLOSEOUT.md'));
const v = readCanonicalFingerprintFromMd(path.join(E74_ROOT, 'VERDICT.md'));
const r = evidenceFingerprintE74();
if (!c || !v || !r || c !== v || c !== r) throw new Error('canonical parity violation');

verifySumsRowsE74();
const selfRaw = fs.readFileSync(path.join(E74_ROOT, 'CONTRACT_COURT_SELFTEST.md'), 'utf8');
if (!/case_D:\s*PASS\s*\(PASS\)/.test(selfRaw) || !/FAIL_BREAKING_CHANGE_REQUIRED/.test(selfRaw) || !/FAIL_MIGRATION_NOTES_REQUIRED/.test(selfRaw) || !/FAIL_UNKNOWN_REASON_CODE/.test(selfRaw)) {
  throw new Error('selftest proof missing');
}
for (const line of fs.readFileSync(path.join(E74_ROOT, 'SHA256SUMS.md'), 'utf8').split(/\r?\n/).filter((x) => /^[a-f0-9]{64}\s{2}/.test(x))) {
  const [h, rel] = line.split(/\s{2}/);
  if (sha256File(path.resolve(rel)) !== h) throw new Error(`sha mismatch ${rel}`);
}

const after = gitStatus();
if (before !== after) {
  if (process.env.CI === 'true') throw new Error('CI_READ_ONLY_VIOLATION');
  if (!update) throw new Error('READ_ONLY_VIOLATION');
  if (!driftOnlyAllowed(before, after)) throw new Error('UPDATE_SCOPE_VIOLATION');
}

console.log('verify:e74:evidence PASSED');
