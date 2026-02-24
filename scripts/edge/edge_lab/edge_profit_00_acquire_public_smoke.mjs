import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';
import { probeSelectProvider } from './real_public/real_public_provider_select.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';
const allowlistRaw = process.env.PROVIDER_ALLOWLIST || 'binance,bybit,okx,kraken';
const dryRun = String(process.env.REAL_PUBLIC_DRY_RUN || '0').match(/^(1|true)$/i) ? 1 : 0;
const probeEnabled = String(process.env.PUBLIC_SMOKE_PROBE || '0').match(/^(1|true)$/i) ? 1 : 0;
const probeTimeoutMs = 15000;
const probeSymbol = 'BTCUSDT';
const probeTf = '5m';
const netFamily = Number(process.env.NET_FAMILY || 0) || 0;

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function run(cmd) {
  const r = spawnSync('bash', ['-lc', cmd], { cwd: ROOT, encoding: 'utf8', env: process.env, maxBuffer: 64 * 1024 * 1024 });
  return { ec: Number.isInteger(r.status) ? r.status : 1, out: String(r.stdout || ''), err: String(r.stderr || '') };
}

const boot = run('npm run -s env:node22:bootstrap:gate');
const diag = run(`ENABLE_NETWORK=${process.env.ENABLE_NETWORK || '0'} PROVIDER_ALLOWLIST=${allowlistRaw} NET_FAMILY=${process.env.NET_FAMILY || ''} npm run -s edge:profit:00:acquire:public:diag`);

let probeOk = probeEnabled === 0;
let selected = 'NONE';
let probeReason = 'NONE';
if (probeEnabled === 1 && !dryRun && String(process.env.ENABLE_NETWORK || '0') === '1') {
  try {
    const p = await Promise.race([
      probeSelectProvider({ allowlistRaw, symbol: probeSymbol, tf: probeTf }),
      new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'SMK01' })), probeTimeoutMs)),
    ]);
    probeOk = Boolean(p?.selected);
    selected = p?.selected || 'NONE';
    if (!probeOk) probeReason = 'ACQ02';
  } catch (e) {
    probeReason = String(e?.code || 'SMK01');
  }
}

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Public smoke precheck passed.';
if (boot.ec !== 0) {
  status = 'BLOCKED';
  reasonCode = 'SMK01';
  message = 'Node bootstrap precheck failed.';
} else if (diag.ec !== 0) {
  status = 'NEEDS_DATA';
  reasonCode = 'ACQ02';
  message = 'Net diagnostics indicates no reachable providers.';
} else if (probeEnabled === 1 && !dryRun && String(process.env.ENABLE_NETWORK || '0') === '1' && !probeOk) {
  status = probeReason === 'ACQ02' ? 'NEEDS_DATA' : 'BLOCKED';
  reasonCode = probeReason === 'ACQ02' ? 'ACQ02' : 'SMK01';
  message = 'Provider tiny-probe failed in smoke stage.';
}

const diagJsonPath = path.join(REG_DIR, 'gates', 'manual', 'net_diag.json');
const diagRootCause = fs.existsSync(diagJsonPath) ? (JSON.parse(fs.readFileSync(diagJsonPath, 'utf8')).root_cause_code || 'NONE') : 'MISSING';

writeMd(path.join(REG_DIR, 'PUBLIC_SMOKE.md'), `# PUBLIC_SMOKE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- boot_ec: ${boot.ec}\n- diag_ec: ${diag.ec}\n- dry_run: ${dryRun}\n- probe_enabled: ${probeEnabled}\n- provider_selected: ${selected}\n- timeout_ms: ${probeTimeoutMs}\n- net_family: ${netFamily}\n- root_cause_code: ${diagRootCause}\n- tiny_probe_ok: ${probeOk}\n- probe_target: ${probeSymbol}:${probeTf}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'public_smoke.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  boot_ec: boot.ec,
  diag_ec: diag.ec,
  dry_run: dryRun,
  probe_enabled: probeEnabled,
  provider_selected: selected,
  timeout_ms: probeTimeoutMs,
  net_family: netFamily,
  selected_provider: selected,
  diag_root_cause_code: diagRootCause,
  root_cause_code: diagRootCause,
  tiny_probe_ok: probeOk,
});

console.log(`[${status}] edge_profit_00_acquire_public_smoke — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
