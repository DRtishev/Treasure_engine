/**
 * regression_rg_r3_unlock01_refusal_contract.mjs — RG_R3_UNLOCK01_REFUSAL_CONTRACT
 *
 * Proves the OKX acquire double-key refusal contract by source analysis:
 *   Case 1: ALLOW_NETWORK file absent => guard refuses (R3_UNLOCK01)
 *   Case 2: ALLOW_NETWORK file wrong content => guard refuses (R3_UNLOCK02)
 *   Case 3: --enable-network flag absent => guard refuses (R3_UNLOCK03)
 *   Case 4: CERT lane (NET_KILL=1) blocks even with valid ALLOW_NETWORK (R3_UNLOCK04)
 *
 * All checks are ws-dep independent — they read source or test net_kill_preload.
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

const NEXT_ACTION = 'npm run -s verify:r3:preflight';
const ALLOW_FILE = path.join(ROOT, 'artifacts/incoming/ALLOW_NETWORK');
const ACQ_OKX = path.join(ROOT, 'scripts/edge/edge_liq_00_acquire_okx_ws_v5.mjs');
const NET_KILL_PRELOAD = path.join(ROOT, 'scripts/safety/net_kill_preload.cjs');

const checks = [];
const acqSrc = fs.existsSync(ACQ_OKX) ? fs.readFileSync(ACQ_OKX, 'utf8') : '';

// Case 1: R3_UNLOCK01 — guard references ALLOW_NETWORK + existsSync
{
  const hasRef = acqSrc.includes('ALLOW_NETWORK');
  const hasExistsCheck = acqSrc.includes('existsSync') && hasRef;
  const hasExitOnFail = acqSrc.includes('process.exit(2)') && acqSrc.includes('NET_REQUIRED');
  const fileAbsent = !fs.existsSync(ALLOW_FILE);
  checks.push({
    check: 'R3_UNLOCK01_missing_allow_file',
    pass: hasRef && hasExistsCheck && hasExitOnFail && fileAbsent,
    detail: `ref=${hasRef} exists=${hasExistsCheck} exit2=${hasExitOnFail} absent=${fileAbsent}`,
  });
}

// Case 2: R3_UNLOCK02 — guard validates exact content 'ALLOW_NETWORK: YES'
{
  const hasContentLiteral = acqSrc.includes("'ALLOW_NETWORK: YES'") || acqSrc.includes('"ALLOW_NETWORK: YES"');
  const hasReadFile = acqSrc.includes('readFileSync');
  checks.push({
    check: 'R3_UNLOCK02_bad_content',
    pass: hasContentLiteral && hasReadFile,
    detail: `content_literal=${hasContentLiteral} readfile=${hasReadFile}`,
  });
}

// Case 3: R3_UNLOCK03 — guard requires --enable-network in argv
{
  const hasFlagLiteral = acqSrc.includes("'--enable-network'") || acqSrc.includes('"--enable-network"');
  const hasArgvIncludes = acqSrc.includes(".includes('--enable-network')") || acqSrc.includes('.includes("--enable-network")');
  checks.push({
    check: 'R3_UNLOCK03_missing_flag',
    pass: hasFlagLiteral && hasArgvIncludes,
    detail: `flag=${hasFlagLiteral} argv_includes=${hasArgvIncludes}`,
  });
}

// Case 4: R3_UNLOCK04 — CERT net_kill blocks network even with ALLOW_NETWORK
{
  const hadAllow = fs.existsSync(ALLOW_FILE);
  const savedContent = hadAllow ? fs.readFileSync(ALLOW_FILE, 'utf8') : null;
  try {
    fs.mkdirSync(path.dirname(ALLOW_FILE), { recursive: true });
    fs.writeFileSync(ALLOW_FILE, 'ALLOW_NETWORK: YES', 'utf8');
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
      detail: `EC=${r.status} (expect 0 = NETV01 blocks)`,
    });
  } finally {
    if (hadAllow && savedContent !== null) {
      fs.writeFileSync(ALLOW_FILE, savedContent, 'utf8');
    } else {
      if (fs.existsSync(ALLOW_FILE)) fs.rmSync(ALLOW_FILE);
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_R3_UNLOCK01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_R3_UNLOCK01.md'), [
  '# REGRESSION_RG_R3_UNLOCK01 — Refusal Contract', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CASES',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_r3_unlock01_refusal_contract.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_R3_UNLOCK01_REFUSAL_CONTRACT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_rg_r3_unlock01_refusal_contract — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
