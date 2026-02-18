#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const run = JSON.parse(fs.readFileSync(path.resolve('.foundation-seal/capsules/_work/graduation_run.json'), 'utf8'));
const reasons = [];
if (run.policy.cap > 100) reasons.push('CAP_GT_100');
if (run.policy.dailyRisk > 20) reasons.push('DAILY_RISK_GT_20');
if (run.policy.maxTrades <= 0) reasons.push('MAX_TRADES_MISSING');
if (run.kill_switch === undefined) reasons.push('KILL_SWITCH_MISSING');
const pass = reasons.length === 0;
if (!pass) throw new Error(`E112_LIVE_SAFETY_V2_FAIL:${reasons.join(',')}`);
console.log('e112_live_safety_v2: PASS');
