#!/usr/bin/env node
import fs from 'node:fs';

const wowPath = 'specs/wow/WOW_LEDGER.json';
const rankOut = 'reports/truth/wow_rank.json';
const summaryOut = 'reports/truth/wow_rank_summary.json';

const ledger = JSON.parse(fs.readFileSync(wowPath, 'utf8'));
const ranked = [];
for (const item of ledger.items || []) {
  const s = item.scores;
  if (!s) continue;
  const priority = Number(((s.impact * s.confidence) / (s.complexity + s.verification_cost + s.risk)).toFixed(6));
  item.computed = { priority_score: priority };
  ranked.push({
    id: item.id,
    title: item.title,
    status: item.status,
    tier: item.tier,
    scores: s,
    priority_score: priority,
    doc_path: item.doc_path || null
  });
}
ranked.sort((a, b) => b.priority_score - a.priority_score || a.id.localeCompare(b.id));

fs.writeFileSync(wowPath, `${JSON.stringify(ledger, null, 2)}\n`);
fs.mkdirSync('reports/truth', { recursive: true });
fs.writeFileSync(rankOut, `${JSON.stringify({
  formula: 'priority_score = (impact * confidence) / (complexity + verification_cost + risk)',
  ranked
}, null, 2)}\n`);

const shippedStaged = ranked.filter((x) => ['SHIPPED', 'STAGED'].includes(x.status));
fs.writeFileSync(summaryOut, `${JSON.stringify({
  total_ranked: ranked.length,
  shipped_staged_ranked: shippedStaged.length,
  top10_ids: ranked.slice(0, 10).map((x) => x.id),
  top10_shipped_staged_ids: shippedStaged.slice(0, 10).map((x) => x.id)
}, null, 2)}\n`);

console.log(`truth:wow:rank wrote ${rankOut} and ${summaryOut}`);
