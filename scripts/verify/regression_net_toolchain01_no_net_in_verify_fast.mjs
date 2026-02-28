/**
 * regression_net_toolchain01_no_net_in_verify_fast.mjs — RG_NET_TOOLCHAIN01_NO_NET_IN_VERIFY_FAST
 *
 * Gate: verify:fast must run fully offline — node_toolchain_ensure must not
 *       invoke curl, wget, or any network acquire. Under TREASURE_NET_KILL=1,
 *       verify:fast must exit 0 (PASS) when toolchain is already present.
 *
 * Sabotage: #1 — verify:fast was calling ops:node:toolchain:acquire (uses curl).
 * Fix: verify:fast now calls ops:node:toolchain:ensure (no network).
 * Surface: OFFLINE_AUTHORITY
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const checks = [];

// Check 1: verify:fast script calls ensure, not acquire
const verifyFastScript = PKG.scripts['verify:fast'] || '';
const callsEnsure = verifyFastScript.includes('toolchain:ensure');
const callsAcquire = verifyFastScript.includes('toolchain:acquire');
checks.push({
  check: 'verify_fast_calls_ensure_not_acquire',
  pass: callsEnsure && !callsAcquire,
  detail: callsEnsure && !callsAcquire
    ? 'verify:fast calls toolchain:ensure (offline) — OK'
    : `verify:fast script: "${verifyFastScript.slice(0, 100)}"`,
});

// Check 2: ensure script exists
const ensureScript = path.join(ROOT, 'scripts/ops/node_toolchain_ensure.mjs');
checks.push({
  check: 'ensure_script_exists',
  pass: fs.existsSync(ensureScript),
  detail: ensureScript,
});

// Check 3: ensure script does not contain curl/wget/fetch
if (fs.existsSync(ensureScript)) {
  const content = fs.readFileSync(ensureScript, 'utf8');
  const nonComment = content.split('\n').filter((l) => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*');
  }).join('\n');
  const hasCurl = nonComment.includes("'curl'") || nonComment.includes('"curl"') || nonComment.includes('wget');
  const hasFetch = nonComment.includes('fetch(') || nonComment.includes('node:http') || nonComment.includes('node:https');
  checks.push({
    check: 'ensure_no_network_calls',
    pass: !hasCurl && !hasFetch,
    detail: !hasCurl && !hasFetch ? 'no curl/wget/fetch — OK' : 'FORBIDDEN: network call in ensure script',
  });
}

// Check 4: acquire script requires double-key unlock
const acquireScript = path.join(ROOT, 'scripts/ops/node_toolchain_acquire.mjs');
if (fs.existsSync(acquireScript)) {
  const content = fs.readFileSync(acquireScript, 'utf8');
  const hasDoubleKey = content.includes('--enable-network') && content.includes('ALLOW_NETWORK');
  checks.push({
    check: 'acquire_requires_double_key',
    pass: hasDoubleKey,
    detail: hasDoubleKey ? 'acquire enforces double-key unlock — OK' : 'FAIL: acquire missing double-key check',
  });
}

// Check 5: Run ensure under TREASURE_NET_KILL=1 — must exit 0 if toolchain present
const toolchainBin = path.join(ROOT, 'artifacts/toolchains/node/v22.22.0/linux-x64/node-v22.22.0-linux-x64/bin/node');
const toolchainPresent = fs.existsSync(toolchainBin);
checks.push({
  check: 'vendored_toolchain_binary_present',
  pass: toolchainPresent,
  detail: toolchainPresent ? toolchainBin : 'vendored node binary missing',
});

if (toolchainPresent) {
  const r = spawnSync(
    process.execPath,
    ['scripts/ops/node_toolchain_ensure.mjs'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, TREASURE_NET_KILL: '1' } },
  );
  checks.push({
    check: 'ensure_passes_under_netkill',
    pass: r.status === 0,
    detail: r.status === 0
      ? 'ensure exits 0 under TREASURE_NET_KILL=1 — OK'
      : `ensure exited ${r.status}: ${(r.stdout || r.stderr || '').trim().slice(0, 120)}`,
  });
}

// Check 6: acquire exits 2 (BLOCKED) without double-key
const rAcq = spawnSync(
  process.execPath,
  ['scripts/ops/node_toolchain_acquire.mjs'],
  { cwd: ROOT, encoding: 'utf8', env: { ...process.env, TREASURE_NET_KILL: '1' } },
);
const acqBlocked = rAcq.status === 2;
const acqHasReason = (rAcq.stdout || '').includes('ACQ_NET01') || (rAcq.stdout || '').includes('BLOCKED');
checks.push({
  check: 'acquire_blocked_without_double_key',
  pass: acqBlocked && acqHasReason,
  detail: acqBlocked && acqHasReason
    ? 'acquire exits 2 (BLOCKED) without double-key — OK'
    : `acquire exit=${rAcq.status} stdout="${(rAcq.stdout || '').trim().slice(0, 120)}"`,
});

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'NET_TOOLCHAIN01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_NET_TOOLCHAIN01.md'), [
  '# REGRESSION_NET_TOOLCHAIN01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_net_toolchain01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_NET_TOOLCHAIN01_NO_NET_IN_VERIFY_FAST',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_net_toolchain01_no_net_in_verify_fast — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
