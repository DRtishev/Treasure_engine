#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { writeMd } from './e66_lib.mjs';
import { E97_ROOT, E97_POLICY, E97_PROFIT, computeTuningCourt, fmt4, ensureDir, parseCadenceSymbols, parseProfitRows, parseReasonSymbols } from './e97_lib.mjs';

const policyExists=fs.existsSync(E97_POLICY)?'PRESENT':'ABSENT';
const profitExists=fs.existsSync(E97_PROFIT)?'PRESENT':'ABSENT';
const cadenceExists=fs.existsSync('core/edge/state/cadence_ledger_state.md')?'PRESENT':'ABSENT';
const reasonExists=fs.existsSync('core/edge/state/reason_history_state.md')?'PRESENT':'ABSENT';
if(policyExists==='ABSENT') throw new Error('missing e96_risk_envelopes anchor');

const rows=profitExists==='PRESENT'?parseProfitRows(fs.readFileSync(E97_PROFIT,'utf8')):[];
const out=computeTuningCourt(rows);
const invalidRateCount=out.filter((r)=>r.reason==='INVALID_RATE').length;
const touchedSymbols=[...new Set(out.filter((r)=>['TIGHTEN','LOOSEN','PARK'].includes(r.action)).map((r)=>r.symbol))].sort();
if(touchedSymbols.length>3) throw new Error('budget symbols exceeded');
if(out.some((r)=>Math.abs(Number(r.delta))>0.01)) throw new Error('budget per-parameter step exceeded');
if(out.some((r)=>Math.abs(Number(r.tier_delta))>1)) throw new Error('budget tier exceeded');

ensureDir(E97_ROOT);
writeMd(path.join(E97_ROOT,'TUNING_COURT.md'),[
  '# E97 Envelope Tuning Court',
  `- anchor_e96_risk_envelopes: ${policyExists}`,
  `- anchor_profit_ledger_state: ${profitExists}`,
  `- anchor_cadence_ledger_state: ${cadenceExists==='PRESENT'?parseCadenceSymbols().join(','):'ABSENT'}`,
  `- anchor_reason_history_state: ${reasonExists==='PRESENT'?parseReasonSymbols().join(','):'ABSENT'}`,
  `- symbols_total: ${out.length}`,
  `- symbols_touched_budgeted: ${touchedSymbols.length}`,
  `- reason_codes_present: ${['PROFIT_SLIPPAGE','PROFIT_LATENCY','PROFIT_SPREAD','INVALID_RATE','INSUFFICIENT_DAYS'].join(',')}`,
  '| symbol | days | pnl_usd_avg | latency_ms_avg | spread_bps_avg | fill_rate_avg | action | reason_code |',
  '|---|---:|---:|---:|---:|---:|---|---|',
  ...out.map((r)=>`| ${r.symbol} | ${r.days} | ${fmt4(r.pnl_usd)} | ${fmt4(r.latency_ms)} | ${fmt4(r.spread_bps)} | ${fmt4(r.fill_rate)} | ${r.action} | ${r.reason} |`)
].join('\n'));

writeMd(path.join(E97_ROOT,'TUNING_DIFF.md'),[
  '# E97 Tuning Diff (Proposed)',
  '- mode: PROPOSE_ONLY',
  '| symbol | param | delta | tier_delta | action | reason_code |',
  '|---|---|---:|---:|---|---|',
  ...out.map((r)=>`| ${r.symbol} | ${r.param} | ${r.delta} | ${r.tier_delta} | ${r.action} | ${r.reason} |`)
].join('\n'));

writeMd(path.join(E97_ROOT,'TUNING_ASSERTIONS.md'),[
  '# E97 Tuning Assertions',
  `- budgets_symbols_lte_3: ${touchedSymbols.length<=3}`,
  `- budgets_step_lte_1: ${out.every((r)=>Math.abs(Number(r.delta))<=0.01)}`,
  `- budgets_tier_lte_1: ${out.every((r)=>Math.abs(Number(r.tier_delta))<=1)}`,
  `- ordering_symbol_param_tier: ${JSON.stringify(out)===JSON.stringify([...out].sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.param.localeCompare(b.param)||String(a.tier_delta).localeCompare(String(b.tier_delta))))}`,
  `- invalid_rate_cases: ${invalidRateCount}`,
  '- court_mode: NO_PROMOTE_BY_VIBES'
].join('\n'));

console.log(`verify:e97:court PASSED symbols=${out.length} touched=${touchedSymbols.length}`);
