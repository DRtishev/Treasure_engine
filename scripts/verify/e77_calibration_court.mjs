#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeMd } from './e66_lib.mjs';

const CAL = path.resolve('core/edge/calibration/execution_envelope_calibration.md');
const PREV = path.resolve('reports/evidence/E76/MATERIALS.md');
const E77 = path.resolve('reports/evidence/E77');

function normalize(t) { return t.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').trimEnd() + '\n'; }
function hashFile(p) { return crypto.createHash('sha256').update(normalize(fs.readFileSync(p, 'utf8'))).digest('hex'); }

function parseCal(raw) {
  const syms = [...raw.matchAll(/^\|\s*([A-Z0-9]+USDT)\s*\|/gm)].map((m) => m[1]).sort();
  const rounding = (raw.match(/- rounding_policy:\s*([A-Z_]+)/) || [])[1] || 'UNKNOWN';
  const migration = (raw.match(/- migration_notes:\s*(.+)/) || [])[1] || '';
  const budgets = {
    spread: Number((raw.match(/- spread_floor_delta_max:\s*([0-9.]+)/) || [])[1] || 0),
    latency: Number((raw.match(/- latency_stage_delta_max_ms:\s*([0-9.]+)/) || [])[1] || 0),
    fee: Number((raw.match(/- fee_delta_max_bps:\s*([0-9.]+)/) || [])[1] || 0),
    slippage: Number((raw.match(/- slippage_delta_max_bps:\s*([0-9.]+)/) || [])[1] || 0)
  };
  return { syms, rounding, migration, budgets };
}

export function evaluateCalibrationCourt() {
  const raw = fs.readFileSync(CAL, 'utf8');
  const parsed = parseCal(raw);
  const previousCalHash = fs.existsSync(PREV)
    ? ((fs.readFileSync(PREV, 'utf8').match(/calibration_hash:\s*([a-f0-9]{64})/) || [])[1] || 'N/A')
    : 'N/A';
  const newCalHash = hashFile(CAL);

  let breaking = false;
  const reasons = [];
  if (previousCalHash !== 'N/A' && previousCalHash !== newCalHash) {
    if (parsed.rounding !== 'HALF_UP') { breaking = true; reasons.push('ROUNDING_POLICY_CHANGED'); }
    if (parsed.syms.length < 3) { breaking = true; reasons.push('SYMBOL_TABLE_CHANGED_MATERIAL'); }
    if (parsed.budgets.spread < 0.2 || parsed.budgets.fee < 0.2) { breaking = true; reasons.push('BUDGET_TIGHTENED'); }
  }
  if (breaking && (!parsed.migration || parsed.migration === 'N/A')) reasons.push('FAIL_MIGRATION_NOTES_REQUIRED');
  const status = reasons.some((r) => r.startsWith('FAIL_')) ? 'FAIL' : 'PASS';

  return { status, previous_cal_hash: previousCalHash, new_cal_hash: newCalHash, breaking_change: breaking, reasons: reasons.length ? reasons : ['NONE'], parsed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const update = process.env.UPDATE_E77_EVIDENCE === '1';
  const allowCal = process.env.UPDATE_E77_CALIBRATION === '1';
  if (process.env.CI === 'true' && (update || allowCal)) throw new Error('UPDATE_E77 flags forbidden when CI=true');
  const r = evaluateCalibrationCourt();
  if (update && process.env.CI !== 'true') {
    if (!allowCal) throw new Error('UPDATE_E77_CALIBRATION=1 required in update mode');
    fs.mkdirSync(E77, { recursive: true });
    writeMd(path.join(E77, 'CALIBRATION_COURT.md'), [
      '# E77 CALIBRATION COURT',
      `- status: ${r.status}`,
      `- previous_cal_hash: ${r.previous_cal_hash}`,
      `- new_cal_hash: ${r.new_cal_hash}`,
      `- breaking_change: ${String(r.breaking_change)}`,
      `- reason_codes: ${r.reasons.join(', ')}`
    ].join('\n'));
    writeMd(path.join(E77, 'CALIBRATION_DIFF.md'), [
      '# E77 CALIBRATION DIFF',
      `- previous_cal_hash: ${r.previous_cal_hash}`,
      `- new_cal_hash: ${r.new_cal_hash}`,
      '- deterministic_diff_summary:',
      `  - symbols_count: ${r.parsed.syms.length}`,
      `  - rounding_policy: ${r.parsed.rounding}`,
      `  - budgets: spread=${r.parsed.budgets.spread},latency=${r.parsed.budgets.latency},fee=${r.parsed.budgets.fee},slippage=${r.parsed.budgets.slippage}`
    ].join('\n'));
    writeMd(path.join(E77, 'CALIBRATION_CHANGELOG.md'), [
      '# E77 CALIBRATION CHANGELOG',
      '- entry: e77-cal-v1 baseline active',
      `- hash: ${r.new_cal_hash}`
    ].join('\n'));
  }
  if (r.status !== 'PASS') throw new Error(`e77 calibration court failed: ${r.reasons.join(',')}`);
  console.log(`verify:e77:calibration:court PASSED hash=${r.new_cal_hash}`);
}
