/**
 * regression_live04_telemetry_contract.mjs — RG_LIVE04
 *
 * Verifies that microlive_decision.json has a stable output field contract:
 *   - schema_version === 'microlive_decision.v2'
 *   - Required top-level fields: schema_version, verdict, kill_reasons, telemetry, thresholds
 *   - verdict ∈ {PROCEED, KILL_SWITCH, NEEDS_DATA}
 *   - kill_reasons is an array
 *   - telemetry has all required sub-fields
 *   - thresholds has all required sub-fields
 *   - Output is stable: same inputs → identical JSON output (x2)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const ML_SCRIPT = path.join(ROOT, 'scripts/edge/edge_microlive_00_scaffold.mjs');
const UNLOCK_FILE = path.join(ROOT, 'artifacts/incoming/MICROLIVE_UNLOCK');
const PAPER_LOCK = path.join(ROOT, 'artifacts/outgoing/paper_sim.lock.json');
const OUT_DIR = path.join(ROOT, 'artifacts/outgoing');
const DECISION_PATH = path.join(OUT_DIR, 'microlive_decision.json');

fs.mkdirSync(path.dirname(UNLOCK_FILE), { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const REQUIRED_TOP_FIELDS = ['schema_version', 'verdict', 'kill_reasons', 'telemetry', 'thresholds'];
const REQUIRED_TELEMETRY_FIELDS = [
  'total_pnl_net', 'win_rate', 'closed_n', 'decisions_n',
  'profit_factor', 'max_drawdown', 'avg_slippage_cost', 'total_fee_cost', 'wins_n', 'losses_n',
];
const REQUIRED_THRESHOLD_FIELDS = [
  'KILL_PNL_FLOOR', 'KILL_WIN_RATE', 'KILL_PF_FLOOR',
  'KILL_MAX_DD', 'KILL_SLIPPAGE_COST', 'MIN_TRADES',
];
const VALID_VERDICTS = new Set(['PROCEED', 'KILL_SWITCH', 'NEEDS_DATA']);

const BASE_LOCK = {
  schema_version: 'paper_sim.v2',
  total_pnl_net: 250, total_pnl_gross: 350, total_fee_cost: 100,
  win_rate: 0.60, profit_factor: 2.0, max_drawdown: 150,
  avg_slippage_cost: 20, wins_n: 12, losses_n: 8,
  closed_n: 20, decisions_n: 22,
};

const fails = [];

function withState(lockData, unlockContent, fn) {
  const hadLock = fs.existsSync(PAPER_LOCK);
  const origLock = hadLock ? fs.readFileSync(PAPER_LOCK, 'utf8') : null;
  const hadUnlock = fs.existsSync(UNLOCK_FILE);
  const origUnlock = hadUnlock ? fs.readFileSync(UNLOCK_FILE, 'utf8') : null;
  try {
    fs.writeFileSync(PAPER_LOCK, JSON.stringify(lockData, null, 2) + '\n');
    fs.writeFileSync(UNLOCK_FILE, unlockContent);
    return fn();
  } finally {
    if (hadLock) fs.writeFileSync(PAPER_LOCK, origLock);
    else if (fs.existsSync(PAPER_LOCK)) fs.unlinkSync(PAPER_LOCK);
    if (hadUnlock) fs.writeFileSync(UNLOCK_FILE, origUnlock);
    else if (fs.existsSync(UNLOCK_FILE)) fs.unlinkSync(UNLOCK_FILE);
  }
}

// Generate a PROCEED decision for schema inspection
let decisionContent = null;
withState(BASE_LOCK, 'MICROLIVE: UNLOCKED', () => {
  spawnSync(process.execPath, [ML_SCRIPT],
    { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, encoding: 'utf8', timeout: 10_000 });
  if (fs.existsSync(DECISION_PATH))
    decisionContent = fs.readFileSync(DECISION_PATH, 'utf8');
});

let decision = null;
if (!decisionContent) {
  fails.push('DECISION_FILE_MISSING: microlive_decision.json not generated');
} else {
  try { decision = JSON.parse(decisionContent); } catch { fails.push('DECISION_PARSE_ERROR'); }
}

if (decision) {
  if (decision.schema_version !== 'microlive_decision.v2')
    fails.push(`SCHEMA_VERSION: expected microlive_decision.v2, got ${decision.schema_version}`);

  for (const f of REQUIRED_TOP_FIELDS) {
    if (!(f in decision)) fails.push(`MISSING_TOP_FIELD: ${f}`);
  }
  if (!VALID_VERDICTS.has(decision.verdict))
    fails.push(`VERDICT_INVALID: ${decision.verdict}`);
  if (!Array.isArray(decision.kill_reasons))
    fails.push('KILL_REASONS_NOT_ARRAY');

  if (decision.telemetry && typeof decision.telemetry === 'object') {
    for (const f of REQUIRED_TELEMETRY_FIELDS) {
      if (!(f in decision.telemetry)) fails.push(`MISSING_TELEMETRY_FIELD: ${f}`);
    }
  } else {
    fails.push('TELEMETRY_MISSING_OR_WRONG_TYPE');
  }

  if (decision.thresholds && typeof decision.thresholds === 'object') {
    for (const f of REQUIRED_THRESHOLD_FIELDS) {
      if (!(f in decision.thresholds)) fails.push(`MISSING_THRESHOLD_FIELD: ${f}`);
      else if (typeof decision.thresholds[f] !== 'number') fails.push(`THRESHOLD_TYPE: ${f} must be number`);
    }
  } else {
    fails.push('THRESHOLDS_MISSING_OR_WRONG_TYPE');
  }
}

// Stability: run twice → identical JSON
let sha1 = null, sha2 = null;
withState(BASE_LOCK, 'MICROLIVE: UNLOCKED', () => {
  spawnSync(process.execPath, [ML_SCRIPT],
    { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, encoding: 'utf8', timeout: 10_000 });
  if (fs.existsSync(DECISION_PATH)) sha1 = sha(fs.readFileSync(DECISION_PATH, 'utf8'));
});
withState(BASE_LOCK, 'MICROLIVE: UNLOCKED', () => {
  spawnSync(process.execPath, [ML_SCRIPT],
    { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, encoding: 'utf8', timeout: 10_000 });
  if (fs.existsSync(DECISION_PATH)) sha2 = sha(fs.readFileSync(DECISION_PATH, 'utf8'));
});
if (!sha1 || !sha2) fails.push('STABILITY_MISSING_OUTPUT');
else if (sha1 !== sha2) fails.push(`STABILITY_NONDETERMINISTIC: sha1=${sha1.slice(0,16)} sha2=${sha2.slice(0,16)}`);

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_LIVE04';

writeMd(path.join(EXEC, 'REGRESSION_LIVE04_TELEMETRY_CONTRACT.md'),
  `# REGRESSION_LIVE04_TELEMETRY_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:live04-telemetry-contract\n\n## Decision schema\n\n- schema_version: ${decision?.schema_version}\n- verdict: ${decision?.verdict}\n- telemetry fields: ${Object.keys(decision?.telemetry ?? {}).join(', ')}\n- thresholds fields: ${Object.keys(decision?.thresholds ?? {}).join(', ')}\n\n## Stability\n\n- sha1: ${sha1?.slice(0, 16)}\n- sha2: ${sha2?.slice(0, 16)}\n- stable: ${sha1 === sha2}\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_live04_telemetry_contract.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID,
  decision_schema_version: decision?.schema_version ?? null,
  verdict: decision?.verdict ?? null,
  stable: sha1 === sha2,
  fails,
});

console.log(`[${status}] regression_live04_telemetry_contract — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
