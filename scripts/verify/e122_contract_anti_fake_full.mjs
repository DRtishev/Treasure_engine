#!/usr/bin/env node
import fs from 'node:fs';
const verdict = fs.readFileSync('reports/evidence/E122/VERDICT.md', 'utf8');
const diag = fs.readFileSync('reports/evidence/E122/CONNECTIVITY_DIAG.md', 'utf8');
const proof = fs.readFileSync('reports/evidence/E122/LIVE_FILL_PROOF.md', 'utf8');
const gate = fs.readFileSync('reports/evidence/E122/LIVE_FILL_GATE.md', 'utf8');
const status = /status:\s*(\w+)/.exec(verdict)?.[1] || 'UNKNOWN';
const success = Number(/success:\s*(\d+)/.exec(diag)?.[1] || '0');
const proofStatus = /status:\s*(\w+)/.exec(proof)?.[1] || 'FAIL';
const gateStatus = /status:\s*(\w+)/.exec(gate)?.[1] || 'FAIL';
if (status === 'FULL' && (success <= 0 || proofStatus !== 'PASS' || gateStatus !== 'PASS')) throw new Error('E122_ANTI_FAKE_FULL_FAIL');
