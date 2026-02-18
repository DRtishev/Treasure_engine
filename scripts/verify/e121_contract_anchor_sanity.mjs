#!/usr/bin/env node
import { readCanonicalAnchored, writeMdAtomic } from './e121_lib.mjs';

const mode = process.env.UPDATE_E121_EVIDENCE === '1' ? 'update' : 'verify';
const anchored = readCanonicalAnchored('reports/evidence/E119/VERDICT.md');
const broadText = anchored.status === 'ABSENT' ? '' : (await import('node:fs')).readFileSync('reports/evidence/E119/VERDICT.md', 'utf8');
const broad = /canonical_fingerprint:\s*([a-f0-9]{64})/.exec(broadText)?.[1] || 'NOT_FOUND';
const mismatch = anchored.status !== 'OK' || anchored.value !== broad;
const status = mismatch ? (mode === 'update' ? 'FAIL' : 'WARN') : 'PASS';
const reason = mismatch ? 'E121_ANCHOR_MISMATCH_OR_MISSING' : 'ANCHOR_OK';

writeMdAtomic('reports/evidence/E121/ANCHOR_SANITY.md', [
  '# E121 ANCHOR SANITY',
  `- status: ${status}`,
  `- reason_code: ${reason}`,
  `- anchor_regex: /^- canonical_fingerprint:\\s*([a-f0-9]{64})/m`,
  `- anchored_value: ${anchored.value}`,
  `- broad_value: ${broad}`
].join('\n'));

if (status === 'FAIL') process.exit(1);
