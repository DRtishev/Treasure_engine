#!/usr/bin/env node
import fs from 'node:fs';
const q = fs.readFileSync('reports/evidence/E119/QUORUM_SCORE.md', 'utf8');
for (const k of ['score_full_threshold', 'window_scores', 'overall_score', 'status']) {
  if (!new RegExp(`- ${k}:`).test(q)) throw new Error(`E119_SCORE_MISSING:${k}`);
}
console.log('e119_quorum_score_contract: PASS');
