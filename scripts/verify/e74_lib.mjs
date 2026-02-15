#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { sha256File, sha256Text, writeMd } from './e66_lib.mjs';

export const E74_ROOT = path.resolve('reports/evidence/E74');
export const E74_LOCK_PATH = path.resolve('.foundation-seal/E74_KILL_LOCK.md');

export function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

export function defaultNormalizedEnv() {
  return {
    TZ: 'UTC', LANG: 'C', LC_ALL: 'C',
    SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000',
    SEED: String(process.env.SEED || '12345')
  };
}

export function readCanonicalFingerprintFromMd(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const m = fs.readFileSync(filePath, 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/i);
  return m ? m[1] : '';
}

export function readE73Binding() {
  const closeout = path.resolve('reports/evidence/E73/CLOSEOUT.md');
  const verdict = path.resolve('reports/evidence/E73/VERDICT.md');
  const materials = path.resolve('reports/evidence/E73/MATERIALS.md');
  const a = readCanonicalFingerprintFromMd(closeout);
  const b = readCanonicalFingerprintFromMd(verdict);
  if (!a || !b || a !== b) throw new Error('E73 canonical mismatch');
  const raw = fs.readFileSync(materials, 'utf8');
  const chain = (raw.match(/chain_bundle_fingerprint:\s*([a-f0-9]{64})/) || [])[1] || '';
  if (!chain) throw new Error('E73 chain_bundle_fingerprint missing');
  return { e73_canonical_fingerprint: a, chain_bundle_fingerprint: chain };
}

function normalize(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd() + '\n';
}

export function contractHash() { return crypto.createHash('sha256').update(normalize(path.resolve('docs/edge/EDGE_META_CONTRACT.md'))).digest('hex'); }
export function registryHash() { return crypto.createHash('sha256').update(normalize(path.resolve('docs/edge/EDGE_REASON_CODES.md'))).digest('hex'); }
export function budgetHash() { const t=normalize(path.resolve('docs/edge/EDGE_META_CONTRACT.md')); return crypto.createHash('sha256').update((t.split('## Allowed Fail Budget')[1]||'')).digest('hex'); }

export function materialsHashesE74() {
  const files = [
    'docs/edge/EDGE_META_CONTRACT.md', 'docs/edge/EDGE_REASON_CODES.md',
    'docs/edge/contract_fixtures/contract_prev_fixture.md',
    'docs/edge/contract_fixtures/contract_new_breaking_fixture.md',
    'docs/edge/contract_fixtures/migration_notes_fixture.md',
    'docs/edge/contract_fixtures/changelog_fixture.md',
    'scripts/verify/e74_lib.mjs', 'scripts/verify/e74_contract_snapshots.mjs',
    'scripts/verify/e74_contract_court.mjs', 'scripts/verify/e74_edge_contract_x2.mjs',
    'scripts/verify/e74_evidence.mjs', 'scripts/verify/e74_run.mjs',
    'scripts/verify/e72_wow_usage_verify.mjs', 'package-lock.json'
  ].filter((f)=>fs.existsSync(f));
  return files.sort().map((f)=>({file:f,sha256:sha256File(path.resolve(f))}));
}

export function readSumsCoreTextE74() {
  const p = path.join(E74_ROOT, 'SHA256SUMS.md');
  if (!fs.existsSync(p)) return '';
  const raw = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter((line)=>{
    if (!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    if (line.endsWith(' reports/evidence/E74/CLOSEOUT.md')) return false;
    if (line.endsWith(' reports/evidence/E74/VERDICT.md')) return false;
    if (line.endsWith(' reports/evidence/E74/SHA256SUMS.md')) return false;
    return true;
  });
  return `${lines.join('\n').replace(/\s+$/g,'')}\n`;
}

export function evidenceFingerprintE74() {
  const bind = readE73Binding();
  const req = ['MATERIALS.md','WOW_USAGE.md','CONTRACT_SNAPSHOT_PREV.md','CONTRACT_SNAPSHOT_NEW.md','CONTRACT_COURT.md','CONTRACT_DIFF.md','CONTRACT_CHANGELOG.md','CONTRACT_COURT_SELFTEST.md','EDGE_CONTRACT.md','RUNS_EDGE_CONTRACT_X2.md'];
  if (req.some((f)=>!fs.existsSync(path.join(E74_ROOT,f)))) return '';
  const materials = fs.readFileSync(path.join(E74_ROOT,'MATERIALS.md'),'utf8');
  const runs = fs.readFileSync(path.join(E74_ROOT,'RUNS_EDGE_CONTRACT_X2.md'),'utf8');
  const prevHash = (materials.match(/contract_prev_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  const newHash = (materials.match(/contract_new_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  const wowFp = (materials.match(/wow_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const wowUsageFp = (materials.match(/wow_usage_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const run1=(runs.match(/run1_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const run2=(runs.match(/run2_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
  const det=(runs.match(/deterministic_match:\s*(true|false)/)||[])[1]||'false';
  if(!prevHash||!newHash||!wowFp||!wowUsageFp||!run1||!run2) return '';
  return sha256Text([
    `## E73_BINDING\n${JSON.stringify(bind)}\n`,
    `## SCALARS\ncontract_prev_hash=${prevHash}\ncontract_new_hash=${newHash}\nregistry_hash=${registryHash()}\nbudget_hash=${budgetHash()}\ncontract_hash=${contractHash()}\nwow=${wowFp}\nwow_usage=${wowUsageFp}\nrun1=${run1}\nrun2=${run2}\ndeterministic_match=${det}\n`,
    `## MATERIALS\n${materials}`,
    `## WOW_USAGE\n${fs.readFileSync(path.join(E74_ROOT,'WOW_USAGE.md'),'utf8')}`,
    `## CONTRACT_COURT\n${fs.readFileSync(path.join(E74_ROOT,'CONTRACT_COURT.md'),'utf8')}`,
    `## CONTRACT_DIFF\n${fs.readFileSync(path.join(E74_ROOT,'CONTRACT_DIFF.md'),'utf8')}`,
    `## CONTRACT_CHANGELOG\n${fs.readFileSync(path.join(E74_ROOT,'CONTRACT_CHANGELOG.md'),'utf8')}`,
    `## CONTRACT_COURT_SELFTEST\n${fs.readFileSync(path.join(E74_ROOT,'CONTRACT_COURT_SELFTEST.md'),'utf8')}`,
    `## EDGE_CONTRACT\n${fs.readFileSync(path.join(E74_ROOT,'EDGE_CONTRACT.md'),'utf8')}`,
    `## SUMS_CORE\n${readSumsCoreTextE74()}`
  ].join('\n'));
}

export function rewriteSumsE74() {
  const lines=fs.readdirSync(E74_ROOT).filter((f)=>f.endsWith('.md')&&f!=='SHA256SUMS.md').sort().map((f)=>{const abs=path.join(E74_ROOT,f);const rel=path.relative(process.cwd(),abs).split(path.sep).join('/');return `${sha256File(abs)}  ${rel}`;});
  writeMd(path.join(E74_ROOT,'SHA256SUMS.md'),`# E74 SHA256SUMS\n\n${lines.join('\n')}`);
}

export function verifySumsRowsE74() {
  const raw=fs.readFileSync(path.join(E74_ROOT,'SHA256SUMS.md'),'utf8');
  if(!/\sreports\/evidence\/E74\/CLOSEOUT\.md$/m.test(raw)||!/\sreports\/evidence\/E74\/VERDICT\.md$/m.test(raw)) throw new Error('SHA rows missing closeout/verdict');
  if(/\sreports\/evidence\/E74\/SHA256SUMS\.md$/m.test(raw)) throw new Error('self-row forbidden');
  for(const line of raw.split(/\r?\n/).filter((x)=>/^[a-f0-9]{64}\s{2}/.test(x))){const [h,rel]=line.split(/\s{2}/);if(sha256File(path.resolve(rel))!==h) throw new Error(`SHA mismatch ${rel}`);} 
}
