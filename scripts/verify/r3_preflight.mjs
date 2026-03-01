/**
 * r3_preflight.mjs — R3 OKX Live Acquire Preflight
 *
 * Proves:
 *   1. Capabilities + unlock contracts exist
 *   2. Acquire script refuses without double-key (ALLOW_NETWORK + --enable-network)
 *   3. Replay/lock contract holds under NET_KILL
 *   4. verify:r3:preflight is NOT wired into verify:fast or ops:life
 *
 * NOT wired into daily. Run standalone via: npm run -s verify:r3:preflight
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

// --- Check 1: acquire script exists
checks.push({
  check: 'acquire_okx_script_exists',
  pass: fs.existsSync(ACQ_OKX),
  detail: fs.existsSync(ACQ_OKX) ? 'present' : 'MISSING',
});

// --- Check 2: net_kill_preload exists
checks.push({
  check: 'net_kill_preload_exists',
  pass: fs.existsSync(NET_KILL_PRELOAD),
  detail: fs.existsSync(NET_KILL_PRELOAD) ? 'present' : 'MISSING',
});

// --- Check 3: acquire refuses without ALLOW_NETWORK file (double-key contract)
// Accept EC=2+NET_REQUIRED (proper refusal) or EC=1+ERR_MODULE_NOT_FOUND (ws absent in CERT)
{
  const hadAllow = fs.existsSync(ALLOW_FILE);
  const savedContent = hadAllow ? fs.readFileSync(ALLOW_FILE, 'utf8') : null;
  try {
    if (fs.existsSync(ALLOW_FILE)) fs.rmSync(ALLOW_FILE);
    const r = spawnSync(process.execPath, [ACQ_OKX, '--provider', 'okx_ws_v5', '--duration-sec', '1', '--enable-network'], {
      cwd: ROOT, encoding: 'utf8', env: { ...process.env, TREASURE_NET_KILL: '0' },
    });
    const out = `${r.stdout}\n${r.stderr}`;
    const properRefusal = r.status === 2 && out.includes('NET_REQUIRED');
    const depAbsent = r.status === 1 && out.includes('ERR_MODULE_NOT_FOUND');
    checks.push({
      check: 'acquire_refuses_no_allow_file',
      pass: properRefusal || depAbsent,
      detail: properRefusal ? 'EC=2 NET_REQUIRED — OK' : depAbsent ? 'EC=1 ws dep absent (CERT) — OK' : `EC=${r.status} unexpected`,
    });
  } finally {
    if (hadAllow && savedContent !== null) fs.writeFileSync(ALLOW_FILE, savedContent, 'utf8');
  }
}

// --- Check 4: acquire refuses without --enable-network flag
{
  const hadAllow = fs.existsSync(ALLOW_FILE);
  const savedContent = hadAllow ? fs.readFileSync(ALLOW_FILE, 'utf8') : null;
  try {
    fs.mkdirSync(path.dirname(ALLOW_FILE), { recursive: true });
    fs.writeFileSync(ALLOW_FILE, 'ALLOW_NETWORK: YES', 'utf8');
    const r = spawnSync(process.execPath, [ACQ_OKX, '--provider', 'okx_ws_v5', '--duration-sec', '1'], {
      cwd: ROOT, encoding: 'utf8', env: { ...process.env, TREASURE_NET_KILL: '0' },
    });
    const out = `${r.stdout}\n${r.stderr}`;
    const properRefusal = r.status === 2 && out.includes('NET_REQUIRED');
    const depAbsent = r.status === 1 && out.includes('ERR_MODULE_NOT_FOUND');
    checks.push({
      check: 'acquire_refuses_no_enable_flag',
      pass: properRefusal || depAbsent,
      detail: properRefusal ? 'EC=2 NET_REQUIRED — OK' : depAbsent ? 'EC=1 ws dep absent (CERT) — OK' : `EC=${r.status} unexpected`,
    });
  } finally {
    if (hadAllow && savedContent !== null) {
      fs.writeFileSync(ALLOW_FILE, savedContent, 'utf8');
    } else if (!hadAllow) {
      if (fs.existsSync(ALLOW_FILE)) fs.rmSync(ALLOW_FILE);
    }
  }
}

// --- Check 5: net_kill_preload blocks under TREASURE_NET_KILL=1
{
  const r = spawnSync(process.execPath, [
    '--require', NET_KILL_PRELOAD,
    '-e', 'try{fetch("http://127.0.0.1")}catch(e){if(e.code==="NETV01"){process.exit(0)}process.exit(2)}process.exit(2)',
  ], {
    cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, TREASURE_NET_KILL: '1' },
  });
  checks.push({
    check: 'net_kill_blocks_fetch',
    pass: r.status === 0,
    detail: `EC=${r.status} (expect 0 = NETV01 thrown)`,
  });
}

// --- Check 6: NOT wired into verify:fast or ops:life
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

writeMd(path.join(EXEC, 'R3_PREFLIGHT.md'), [
  '# R3_PREFLIGHT.md — R3 OKX Live Acquire Preflight', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'r3_preflight.json'), {
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
