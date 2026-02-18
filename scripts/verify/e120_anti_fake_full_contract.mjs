#!/usr/bin/env node
import fs from 'node:fs';
const verdict = fs.readFileSync('reports/evidence/E120/VERDICT.md', 'utf8');
const run = fs.readFileSync('reports/evidence/E120/MICRO_LIVE_RUN.md', 'utf8');
const zr = fs.readFileSync('reports/evidence/E120/ZERO_WRITES_ON_FAIL.md', 'utf8');
const status = /status:\s*(\w+)/.exec(verdict)?.[1] || 'UNKNOWN';
const liveSuccess = Number(/live_success_count:\s*(\d+)/.exec(run)?.[1] || '0');
const fallbackRatio = Number(/fallback_ratio:\s*([0-9.]+)/.exec(zr)?.[1] || '1');
const freshnessOk = /freshness_ok:\s*true/.test(zr);
if (status === 'FULL' && (liveSuccess === 0 || fallbackRatio > 0 || !freshnessOk)) throw new Error('E120_ANTI_FAKE_FULL_FAIL');
