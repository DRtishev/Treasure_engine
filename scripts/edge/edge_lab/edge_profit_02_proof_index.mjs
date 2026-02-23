import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from './canon.mjs';
import { resolveProfit00EpochDir, resolveProfit00Profile } from './edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const PROFILE = resolveProfit00Profile(ROOT);
const EPOCH_DIR = resolveProfit00EpochDir(ROOT);
const MANUAL_DIR = path.join(EPOCH_DIR, 'gates', 'manual');
const OUT = path.join(EPOCH_DIR, 'PROOF_ENVELOPE_INDEX.md');

function readGate(name) {
  const p = path.join(MANUAL_DIR, `${name}.json`);
  if (!fs.existsSync(p)) return { status: 'BLOCKED', reason_code: 'ME01', next_action: 'npm run -s edge:profit:00' };
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const e = readGate('expectancy_proof');
const p = readGate('pbo_cpcv');
const r = readGate('risk_mcdd');

const status = [e, p, r].some((g) => g.status === 'FAIL' || g.status === 'BLOCKED')
  ? 'BLOCKED'
  : [e, p, r].some((g) => g.status === 'NEEDS_DATA')
    ? 'NEEDS_DATA'
    : 'PASS';
const reasonCode = status === 'PASS'
  ? 'NONE'
  : e.reason_code !== 'NONE'
    ? e.reason_code
    : p.reason_code !== 'NONE'
      ? p.reason_code
      : r.reason_code;
const nextAction = status === 'PASS' ? 'npm run -s executor:run:chain' : (e.next_action || p.next_action || r.next_action || 'npm run -s edge:profit:00');

writeMd(OUT, `# PROOF_ENVELOPE_INDEX.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n- profile: ${PROFILE || 'default'}\n\n| gate | status | reason_code | next_action |\n|---|---|---|---|\n| expectancy_proof | ${e.status} | ${e.reason_code} | ${e.next_action} |\n| pbo_cpcv | ${p.status} | ${p.reason_code} | ${p.next_action} |\n| risk_mcdd | ${r.status} | ${r.reason_code} | ${r.next_action} |\n`);

console.log(`[${status}] edge_profit_02_proof_index — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
