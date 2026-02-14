#!/usr/bin/env node
import fs from 'node:fs';

const errors = [];
const placeholder = /\b(TBD|TODO|TBA)\b/i;
const requiredCardHeadings = [
  '## Mechanism',
  '## Profit Hook',
  '## Integration',
  '## Verification',
  '## Evidence Outputs',
  '## Self-Deception Risks',
  '## Kill Criteria',
  '## Monitoring',
  '## Next Iterations'
];

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

const wowFile = 'specs/wow/WOW_LEDGER.json';
if (!fs.existsSync(wowFile)) {
  console.error(`verify:wow FAILED\n- missing ${wowFile}`);
  process.exit(1);
}

const pkg = readJson('package.json');
const scripts = new Set(Object.keys(pkg.scripts || {}));
const ledger = readJson('specs/epochs/LEDGER.json');
const wow = readJson(wowFile);
const rankPath = 'reports/truth/wow_rank.json';
const ids = new Set();
const validStatuses = new Set(['PROPOSED', 'LAB', 'STAGED', 'SHIPPED', 'ARCHIVED']);
const validTiers = new Set(['P0', 'P1', 'P2']);
const validLayers = new Set(['DATA', 'EDGE', 'EXECUTION', 'RISK', 'CANARY', 'RELEASE']);

let rankRows = [];
if (fs.existsSync(rankPath)) {
  rankRows = readJson(rankPath).ranked || [];
}
const rankMap = new Map(rankRows.map((r) => [r.id, r.priority_score]));

for (const item of wow.items || []) {
  if (!/^WOW-\d{2,3}$/.test(item.id || '')) errors.push(`${item.id || '<missing id>'}: invalid id format`);
  if (ids.has(item.id)) errors.push(`${item.id}: duplicate id`);
  ids.add(item.id);
  if (!validStatuses.has(item.status)) errors.push(`${item.id}: invalid status ${item.status}`);
  if (!validTiers.has(item.tier)) errors.push(`${item.id}: invalid tier ${item.tier}`);
  if (!validLayers.has(item?.profit_hook?.affected_layer)) errors.push(`${item.id}: invalid affected_layer`);
  if (!Array.isArray(item?.acceptance?.must_improve) || item.acceptance.must_improve.length === 0) errors.push(`${item.id}: acceptance.must_improve required`);
  if (!Array.isArray(item?.acceptance?.must_not_break) || item.acceptance.must_not_break.length === 0) errors.push(`${item.id}: acceptance.must_not_break required`);
  if (!Array.isArray(item.self_deception_risks) || item.self_deception_risks.length < 2) errors.push(`${item.id}: self_deception_risks must have >=2`);
  if (!Array.isArray(item.kill_criteria) || item.kill_criteria.length < 2) errors.push(`${item.id}: kill_criteria must have >=2`);

  for (const gate of item?.integration?.gates || []) {
    if (!scripts.has(gate)) errors.push(`${item.id}: gate script missing in package.json: ${gate}`);
  }
  for (const modulePath of item?.integration?.modules || []) {
    if (!fs.existsSync(modulePath)) errors.push(`${item.id}: module path missing: ${modulePath}`);
  }

  const needsScore = ['SHIPPED', 'STAGED'].includes(item.status);
  if (needsScore) {
    const s = item.scores;
    if (!s) {
      errors.push(`${item.id}: ${item.status} requires scores`);
    } else {
      for (const key of ['impact', 'confidence', 'complexity', 'verification_cost', 'risk']) {
        if (!Number.isInteger(s[key]) || s[key] < 1 || s[key] > 10) errors.push(`${item.id}: scores.${key} must be integer 1..10`);
      }
      if (Number.isInteger(s?.impact) && Number.isInteger(s?.confidence) && Number.isInteger(s?.complexity) && Number.isInteger(s?.verification_cost) && Number.isInteger(s?.risk)) {
        const expected = Number(((s.impact * s.confidence) / (s.complexity + s.verification_cost + s.risk)).toFixed(6));
        if (item?.computed?.priority_score !== expected) errors.push(`${item.id}: computed.priority_score mismatch expected ${expected}`);
        if (rankMap.size && rankMap.get(item.id) !== expected) errors.push(`${item.id}: wow_rank.json mismatch expected ${expected}`);
      }
    }

    if (!item.doc_path) {
      errors.push(`${item.id}: ${item.status} requires doc_path`);
    } else if (!fs.existsSync(item.doc_path)) {
      errors.push(`${item.id}: missing doc_path file ${item.doc_path}`);
    } else {
      const card = fs.readFileSync(item.doc_path, 'utf8');
      if (!card.includes(`# ${item.id} `)) errors.push(`${item.id}: card title heading mismatch`);
      for (const heading of requiredCardHeadings) {
        if (!card.includes(heading)) errors.push(`${item.id}: card missing heading ${heading}`);
      }
      for (const out of item?.integration?.evidence_outputs || []) {
        if (!card.includes(out)) errors.push(`${item.id}: card missing evidence output reference ${out}`);
      }
    }
  }

  if (item.status === 'SHIPPED') {
    const integration = item.integration || {};
    for (const k of ['epochs', 'gates', 'modules', 'evidence_outputs']) {
      if (!Array.isArray(integration[k]) || integration[k].length === 0) errors.push(`${item.id}: SHIPPED requires non-empty integration.${k}`);
    }
    if (placeholder.test(JSON.stringify(item))) errors.push(`${item.id}: SHIPPED item contains placeholder token`);

    for (const epoch of integration.epochs || []) {
      const epochRow = ledger.epochs?.[String(epoch)];
      const root = epochRow?.evidence_root;
      if (!root || !fs.existsSync(root)) {
        errors.push(`${item.id}: epoch ${epoch} missing evidence_root`);
        continue;
      }
      const packPath = `${root}pack_index.json`;
      if (!fs.existsSync(packPath)) {
        errors.push(`${item.id}: epoch ${epoch} missing pack_index.json`);
        continue;
      }
      const pack = readJson(packPath);
      const available = new Set([...(pack.gate_runs || []).map((x) => x.path), ...(pack.artifacts || []).map((x) => x.path), ...Object.keys(pack.hashes || {})]);
      for (const out of integration.evidence_outputs || []) {
        if (!available.has(out)) errors.push(`${item.id}: epoch ${epoch} missing evidence output in pack_index: ${out}`);
      }
    }
  }

  if (item.status === 'ARCHIVED') {
    if (!item.kill_evidence_ref?.epoch || !item.kill_evidence_ref?.path) {
      errors.push(`${item.id}: ARCHIVED requires kill_evidence_ref.epoch and kill_evidence_ref.path`);
    }
  }
}

if (errors.length) {
  console.error('verify:wow FAILED');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

const counts = (wow.items || []).reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {});
console.log('verify:wow PASSED');
console.log(JSON.stringify({ total: wow.items.length, counts }, null, 2));
