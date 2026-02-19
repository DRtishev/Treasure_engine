#!/usr/bin/env node
// P0-F: Regression guard — offline, deterministic, md-only output.
// Validates that all P0 invariants hold without running the heavy pipeline.
// Usage: node scripts/verify/e142m_regression.mjs
import fs from 'node:fs';
import path from 'node:path';
import { FINAL_ROOT, REASONS, writeMd } from './e142m_lib.mjs';

const OUT = path.join(FINAL_ROOT, 'REGRESSION.md');
const fails = [];
const checks = [];

function check(id, desc, condition, detail = '') {
  const pass = Boolean(condition);
  checks.push({ id, pass, desc, detail });
  if (!pass) fails.push(`${id}: ${desc}${detail ? ` — ${detail}` : ''}`);
}

// ── P0-A: Clean-room guarantee ────────────────────────────────────────────────
// Verify contracts REQUIRED does not include post-phase files.
const contractsSrc = fs.readFileSync(new URL('./e142m_contracts.mjs', import.meta.url), 'utf8');
const POST_PHASE = ['CONTRACTS.md','SEAL_X2.md','VERDICT.md','SHA256SUMS.md'];
for (const f of POST_PHASE) {
  check(`P0-A-${f}`, `REQUIRED must not include post-phase file ${f}`,
    !new RegExp(`'${f}'`).test(contractsSrc.split('\n').filter(l => /const REQUIRED/.test(l)).join('')),
    `post-phase file found in REQUIRED`);
}

// ── P0-B: Self-dependency ────────────────────────────────────────────────────
// CONTRACTS.md must NOT appear in REQUIRED list inside contracts source.
const reqLine = contractsSrc.split('\n').find(l => /const REQUIRED\s*=/.test(l)) || '';
check('P0-B-no-self-ref', 'CONTRACTS.md not in REQUIRED', !reqLine.includes("'CONTRACTS.md'"));

// ── P0-C: Reason code completeness ───────────────────────────────────────────
// All REASONS keys used in WHY_TEXT must exist in e142m_lib.mjs REASONS.
const libSrc = fs.readFileSync(new URL('./e142m_lib.mjs', import.meta.url), 'utf8');
const docSrc = fs.readFileSync(new URL('./e142m_doctor.mjs', import.meta.url), 'utf8');
const reasonKeys = Object.keys(REASONS);
const whyBlock = docSrc.match(/const WHY_TEXT\s*=\s*\{([\s\S]*?)\};/)?.[1] || '';
const usedKeys = [...whyBlock.matchAll(/REASONS\.(\w+)/g)].map(m => m[1]);
for (const k of usedKeys) {
  check(`P0-C-${k}`, `WHY_TEXT key REASONS.${k} exists in REASONS`, reasonKeys.includes(k));
}

// ── P0-D: SNAPSHOT identity fields ───────────────────────────────────────────
// SNAPSHOT.md must include head_full and tree_state in its ## RAW section.
const snapPath = path.join(FINAL_ROOT, 'SNAPSHOT.md');
if (fs.existsSync(snapPath)) {
  const snap = fs.readFileSync(snapPath, 'utf8');
  check('P0-D-head_full', 'SNAPSHOT.md has head_full', /- head_full:/.test(snap));
  check('P0-D-tree_state', 'SNAPSHOT.md has tree_state', /- tree_state:/.test(snap));
  check('P0-D-no-HEAD_UNAVAILABLE-authoritative',
    'SNAPSHOT.md HEAD_UNAVAILABLE must not coexist with authoritative run',
    !(/- head_full: HEAD_UNAVAILABLE/.test(snap) && /- authoritative: true/.test(snap)));
} else {
  check('P0-D-snapshot-exists', 'SNAPSHOT.md present (run verify:mega first)', false, 'file missing');
}

// ── P0-E: Capsule reason granularity ─────────────────────────────────────────
// e142m_run.mjs must distinguish NEED_NODE_TARBALL vs FAIL_CAPSULE_INTEGRITY.
const runSrc = fs.readFileSync(new URL('./e142m_run.mjs', import.meta.url), 'utf8');
check('P0-E-NEED_NODE_TARBALL',   'run.mjs handles NEED_NODE_TARBALL',   runSrc.includes('NEED_NODE_TARBALL'));
check('P0-E-FAIL_CAPSULE',        'run.mjs handles FAIL_CAPSULE_INTEGRITY', runSrc.includes('FAIL_CAPSULE_INTEGRITY'));
check('P0-E-FAIL_PINNED_HEALTH',  'run.mjs handles FAIL_PINNED_NODE_HEALTH', runSrc.includes('FAIL_PINNED_NODE_HEALTH'));
check('P0-E-NEED_BOOTSTRAP',      'run.mjs handles NEED_BOOTSTRAP',      runSrc.includes('NEED_BOOTSTRAP'));

// ── P0-F: Doctor schema count matches contracts ───────────────────────────────
// Extract DOCTOR_FIELDS count from both doctor and contracts and assert they match.
const docFields = docSrc.match(/export function doctorText[\s\S]*?return \[([\s\S]*?)\]\.join/)?.[1] || '';
const docFieldCount = (docFields.match(/`\w+=/g) || []).length;
const conFields = contractsSrc.match(/const DOCTOR_FIELDS\s*=\s*\[([\s\S]*?)\]/)?.[1] || '';
const conFieldCount = (conFields.match(/'[\w_]+'/g) || []).length;
check('P0-F-schema-count-match',
  `doctor field count (${docFieldCount}) matches contracts DOCTOR_FIELDS (${conFieldCount})`,
  docFieldCount === conFieldCount && docFieldCount > 0,
  `doctor=${docFieldCount} contracts=${conFieldCount}`);

// ── Doctor fast-path: no heavy subprocess ────────────────────────────────────
check('P0-B-doctor-no-spawn',
  'e142m_doctor.mjs does not spawn heavy processes (no runAcquire/runBootstrap)',
  !docSrc.includes('runAcquire') && !docSrc.includes('runBootstrap') && !docSrc.includes('execWithPinned'));

// ── Write results ─────────────────────────────────────────────────────────────
const total = checks.length;
const passed = checks.filter(c => c.pass).length;
const status = fails.length === 0 ? 'PASS' : 'FAIL';

fs.mkdirSync(FINAL_ROOT, { recursive: true });
writeMd(OUT, [
  '# FINAL_MEGA REGRESSION',
  `- status: ${status}`,
  `- passed: ${passed}/${total}`,
  `- failed: ${fails.length}`,
  '## RAW',
  ...checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.id}: ${c.desc}${c.detail ? ` (${c.detail})` : ''}`),
  ...(fails.length ? ['## FAILURES', ...fails.map(f => `- ${f}`)] : []),
].join('\n'));

console.log(`REGRESSION status=${status} passed=${passed}/${total}`);
if (fails.length) {
  for (const f of fails) console.error(`  FAIL: ${f}`);
}
process.exit(fails.length > 0 ? 1 : 0);
