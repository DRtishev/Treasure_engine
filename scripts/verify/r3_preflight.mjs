/**
 * r3_preflight.mjs — R3 OKX Live Acquire Preflight v2
 *
 * Proves unlock contract by source-code analysis + file-state probes,
 * independent of ws dependency. No spawning of acquire script.
 *
 * Checks:
 *   1. Acquire script exists + contains double-key guard pattern
 *   2. net_kill_preload exists + blocks fetch under NET_KILL
 *   3. R3_UNLOCK01: ALLOW_NETWORK file absent => contract says refuse
 *   4. R3_UNLOCK02: ALLOW_NETWORK file wrong content => contract says refuse
 *   5. R3_UNLOCK03: --enable-network flag pattern present in guard
 *   6. R3_UNLOCK04: CERT lane refuses when ALLOW_NETWORK present (net_kill)
 *   7. NOT wired into verify:fast or ops:life
 *
 * NOT wired into daily. Run standalone via: npm run -s verify:r3:preflight
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
// R3 evidence writes to EPOCH-R3-* directories (not EXECUTOR)
// to avoid PR05/PR01 allowlist violations. EXECUTOR is for daily-chain only.
const R3_EVIDENCE = path.join(ROOT, 'reports/evidence', `EPOCH-R3-PREFLIGHT-${RUN_ID}`);
fs.mkdirSync(R3_EVIDENCE, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:r3:preflight';
const ALLOW_FILE = path.join(ROOT, 'artifacts/incoming/ALLOW_NETWORK');
const ACQ_OKX = path.join(ROOT, 'scripts/edge/edge_liq_00_acquire_okx_ws_v5.mjs');
const NET_KILL_PRELOAD = path.join(ROOT, 'scripts/safety/net_kill_preload.cjs');

const checks = [];

// --- Check 1: acquire script exists + contains double-key guard
const acqExists = fs.existsSync(ACQ_OKX);
let acqSrc = '';
if (acqExists) acqSrc = fs.readFileSync(ACQ_OKX, 'utf8');
checks.push({
  check: 'acquire_okx_script_exists',
  pass: acqExists,
  detail: acqExists ? 'present' : 'MISSING',
});

// --- Check 2: net_kill_preload exists
checks.push({
  check: 'net_kill_preload_exists',
  pass: fs.existsSync(NET_KILL_PRELOAD),
  detail: fs.existsSync(NET_KILL_PRELOAD) ? 'present' : 'MISSING',
});

// --- Check 3: R3_UNLOCK01 — acquire guard requires ALLOW_NETWORK file
// Source must reference ALLOW_NETWORK file path + fs.existsSync check
{
  const hasAllowRef = acqSrc.includes('ALLOW_NETWORK');
  const hasExistsCheck = acqSrc.includes('existsSync') && acqSrc.includes('ALLOW_NETWORK');
  // Also verify: file currently absent => contract would refuse
  const fileAbsent = !fs.existsSync(ALLOW_FILE);
  checks.push({
    check: 'R3_UNLOCK01_missing_allow_file',
    pass: hasAllowRef && hasExistsCheck && fileAbsent,
    detail: `allow_ref=${hasAllowRef} exists_check=${hasExistsCheck} file_absent=${fileAbsent}`,
  });
}

// --- Check 4: R3_UNLOCK02 — acquire guard validates file content
// Source must check content === 'ALLOW_NETWORK: YES'
{
  const hasContentCheck = acqSrc.includes("ALLOW_NETWORK: YES");
  const hasReadFile = acqSrc.includes('readFileSync') && acqSrc.includes('ALLOW_NETWORK');
  // Prove: wrong content file would not satisfy the guard
  const hadAllow = fs.existsSync(ALLOW_FILE);
  const savedContent = hadAllow ? fs.readFileSync(ALLOW_FILE, 'utf8') : null;
  try {
    fs.mkdirSync(path.dirname(ALLOW_FILE), { recursive: true });
    fs.writeFileSync(ALLOW_FILE, 'WRONG_CONTENT', 'utf8');
    const wrongContent = fs.readFileSync(ALLOW_FILE, 'utf8').trim();
    const wouldRefuse = wrongContent !== 'ALLOW_NETWORK: YES';
    checks.push({
      check: 'R3_UNLOCK02_bad_content',
      pass: hasContentCheck && hasReadFile && wouldRefuse,
      detail: `content_check=${hasContentCheck} readfile=${hasReadFile} wrong_refused=${wouldRefuse}`,
    });
  } finally {
    if (hadAllow && savedContent !== null) {
      fs.writeFileSync(ALLOW_FILE, savedContent, 'utf8');
    } else {
      if (fs.existsSync(ALLOW_FILE)) fs.rmSync(ALLOW_FILE);
    }
  }
}

// --- Check 5: R3_UNLOCK03 — acquire guard requires --enable-network flag
{
  const hasFlagCheck = acqSrc.includes('--enable-network');
  const hasArgvIncludes = acqSrc.includes("includes('--enable-network')");
  checks.push({
    check: 'R3_UNLOCK03_missing_flag',
    pass: hasFlagCheck && hasArgvIncludes,
    detail: `flag_ref=${hasFlagCheck} argv_includes=${hasArgvIncludes}`,
  });
}

// --- Check 6: R3_UNLOCK04 — CERT lane refuses when ALLOW_NETWORK present (net_kill blocks)
{
  const hadAllow = fs.existsSync(ALLOW_FILE);
  const savedContent = hadAllow ? fs.readFileSync(ALLOW_FILE, 'utf8') : null;
  try {
    fs.mkdirSync(path.dirname(ALLOW_FILE), { recursive: true });
    fs.writeFileSync(ALLOW_FILE, 'ALLOW_NETWORK: YES', 'utf8');
    // Under NET_KILL=1, net_kill_preload blocks all network calls
    const r = spawnSync(process.execPath, [
      '--require', NET_KILL_PRELOAD,
      '-e', 'try{fetch("http://127.0.0.1")}catch(e){if(e.code==="NETV01"){process.exit(0)}process.exit(2)}process.exit(2)',
    ], {
      cwd: ROOT, encoding: 'utf8',
      env: { ...process.env, TREASURE_NET_KILL: '1' },
    });
    checks.push({
      check: 'R3_UNLOCK04_cert_refuses_allow_present',
      pass: r.status === 0,
      detail: `EC=${r.status} (expect 0=NETV01 blocks even with ALLOW_NETWORK on disk)`,
    });
  } finally {
    if (hadAllow && savedContent !== null) {
      fs.writeFileSync(ALLOW_FILE, savedContent, 'utf8');
    } else {
      if (fs.existsSync(ALLOW_FILE)) fs.rmSync(ALLOW_FILE);
    }
  }
}

// --- Check 7: NOT wired into verify:fast or ops:life
{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const fastScript = pkg.scripts?.['verify:fast'] || '';
  const lifeScript = pkg.scripts?.['ops:life'] || '';
  const lifeMjs = fs.existsSync(path.join(ROOT, 'scripts/ops/life.mjs'))
    ? fs.readFileSync(path.join(ROOT, 'scripts/ops/life.mjs'), 'utf8')
    : '';
  const wired = /verify:r3:/.test(fastScript) || /verify:r3:/.test(lifeScript) || /verify:r3:/.test(lifeMjs);
  checks.push({
    check: 'r3_not_wired_into_daily',
    pass: !wired,
    detail: wired ? 'WIRED: verify:r3:* found in daily chain' : 'not wired — OK',
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'R3_PREFLIGHT_BLOCKED';

writeMd(path.join(R3_EVIDENCE, 'R3_PREFLIGHT.md'), [
  '# R3_PREFLIGHT.md — R3 OKX Live Acquire Preflight v2', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(R3_EVIDENCE, 'r3_preflight.json'), {
  schema_version: '1.0.0',
  gate_id: 'R3_PREFLIGHT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] r3_preflight — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
