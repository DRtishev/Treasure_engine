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

const ci95Low = Number(e.ci95_low ?? NaN);
const psr0 = Number(e.psr0 ?? NaN);
const psrMin = Number(e.psr_min ?? NaN);
const minTrlTrades = Number(e.min_trl_trades ?? NaN);
const minTrl = Number(e.min_trl ?? NaN);
const pboEstimate = Number(p.pbo_estimate ?? NaN);
const pboThreshold = Number(process.env.EDGE_PBO_MAX ?? 0.3);
const mcddP95 = Number(r.drawdown_p95 ?? NaN);
const mcddThreshold = Number(process.env.EDGE_MCDD_P95_MAX ?? Number.POSITIVE_INFINITY);

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
const unifiedNextAction = status === 'PASS' ? 'npm run -s executor:run:chain' : 'npm run -s epoch:edge:profit:public:00:x2:node22';

writeMd(OUT, `# PROOF_ENVELOPE_INDEX.md

STATUS: ${status}
REASON_CODE: ${reasonCode}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${unifiedNextAction}

- profile: ${PROFILE || 'default'}

## Court Summary

- expectancy_ci95_low_gt_zero: ${Number.isFinite(ci95Low) ? ci95Low > 0 : false} (value=${Number.isFinite(ci95Low) ? ci95Low : 'NaN'})
- psr_gate: ${Number.isFinite(psr0) && Number.isFinite(psrMin) ? psr0 >= psrMin : false} (psr0=${Number.isFinite(psr0) ? psr0 : 'NaN'}, min=${Number.isFinite(psrMin) ? psrMin : 'NaN'})
- min_trl_gate: ${Number.isFinite(minTrlTrades) && Number.isFinite(minTrl) ? minTrlTrades >= minTrl : false} (value=${Number.isFinite(minTrlTrades) ? minTrlTrades : 'NaN'}, min=${Number.isFinite(minTrl) ? minTrl : 'NaN'})
- pbo_gate: ${Number.isFinite(pboEstimate) ? pboEstimate <= pboThreshold : false} (value=${Number.isFinite(pboEstimate) ? pboEstimate : 'NaN'}, max=${pboThreshold})
- mcdd_p95_gate: ${Number.isFinite(mcddP95) ? mcddP95 <= mcddThreshold : false} (value=${Number.isFinite(mcddP95) ? mcddP95 : 'NaN'}, max=${Number.isFinite(mcddThreshold) ? mcddThreshold : 'Infinity'})

| gate | status | reason_code | next_action |
|---|---|---|---|
| expectancy_proof | ${e.status} | ${e.reason_code} | ${e.next_action} |
| pbo_cpcv | ${p.status} | ${p.reason_code} | ${p.next_action} |
| risk_mcdd | ${r.status} | ${r.reason_code} | ${r.next_action} |
`);

console.log(`[${status}] edge_profit_02_proof_index — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
