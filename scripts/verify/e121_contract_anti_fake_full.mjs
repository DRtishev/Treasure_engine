#!/usr/bin/env node
import fs from 'node:fs';
const verdict = fs.readFileSync('reports/evidence/E121/VERDICT.md', 'utf8');
const run = fs.readFileSync('reports/evidence/E121/MICRO_LIVE_RUN.md', 'utf8');
const status = /status:\s*(\w+)/.exec(verdict)?.[1] || 'UNKNOWN';
const liveSuccess = Number(/live_success_count:\s*(\d+)/.exec(run)?.[1] || '0');
const fallback = /fallback_used:\s*true/.test(run);
if (status === 'FULL' && (liveSuccess === 0 || fallback)) throw new Error('E121_ANTI_FAKE_FULL_FAIL');
