import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const SSOT_PATH = path.join(ROOT, 'EDGE_PROFIT_00', 'HYPOTHESES_SSOT.md');
const REGISTRY_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REGISTRY_DIR, 'gates', 'manual');

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function parseSsot(text) {
  const rows = [];
  const errors = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (!line.startsWith('HYP-')) continue;
    const parts = line.split('|');
    if (parts.length !== 7) {
      errors.push(`bad_row_format:${line}`);
      continue;
    }
    const [id, name, paramsJson, timeframe, venue, expectedEdgeType, status] = parts;
    let params = null;
    try {
      params = JSON.parse(paramsJson);
      if (!params || typeof params !== 'object' || Array.isArray(params)) {
        errors.push(`params_not_object:${id}`);
        continue;
      }
    } catch {
      errors.push(`bad_params_json:${id}`);
      continue;
    }
    rows.push({ id, name, params, timeframe, venue, expected_edge_type: expectedEdgeType, status });
  }
  return { rows, errors };
}

const readOk = fs.existsSync(SSOT_PATH);
const ssotText = readOk ? fs.readFileSync(SSOT_PATH, 'utf8') : '';
const { rows: registry, errors } = parseSsot(ssotText);

if (!readOk) errors.push('missing_ssot:EDGE_PROFIT_00/HYPOTHESES_SSOT.md');

const required = ['id', 'name', 'params', 'timeframe', 'venue', 'expected_edge_type', 'status'];
const ids = new Set();
for (const row of registry) {
  for (const k of required) {
    if (!(k in row) || String(row[k]).trim() === '') errors.push(`missing_field:${row.id || 'UNKNOWN'}:${k}`);
  }
  if (!/^HYP-\d{4}$/.test(row.id)) errors.push(`bad_id_format:${row.id}`);
  if (ids.has(row.id)) errors.push(`duplicate_id:${row.id}`);
  ids.add(row.id);
}

const status = errors.length === 0 ? 'PASS' : 'BLOCKED';
const reasonCode = errors.length === 0 ? 'NONE' : 'RG01';
const nextAction = errors.length === 0
  ? 'npm run -s edge:profit:00:ingest'
  : 'npm run -s edge:profit:00';

const md = `# HYPOTHESIS_REGISTRY.md — EDGE_PROFIT_00 Registry Court

STATUS: ${status}
REASON_CODE: ${reasonCode}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${nextAction}

## Registry Scope

- ssot_path: EDGE_PROFIT_00/HYPOTHESES_SSOT.md
- evidence_scope: reports/evidence/EDGE_PROFIT_00/registry

## Registry Rows

| id | name | timeframe | venue | expected_edge_type | status |
|---|---|---|---|---|---|
${registry.map((r) => `| ${r.id} | ${r.name} | ${r.timeframe} | ${r.venue} | ${r.expected_edge_type} | ${r.status} |`).join('\n') || '| NONE | NONE | NONE | NONE | NONE | NONE |'}

## Validation Errors

${errors.length ? errors.map((e) => `- ${e}`).join('\n') : '- NONE'}
`;

writeMd(path.join(REGISTRY_DIR, 'HYPOTHESIS_REGISTRY.md'), md);

writeJsonDeterministic(path.join(MANUAL_DIR, 'hypothesis_registry.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: errors.length === 0
    ? `Registry valid with ${registry.length} immutable hypothesis entries.`
    : `Registry validation failed: ${errors.join('; ')}`,
  next_action: nextAction,
  hypothesis_count: registry.length,
  registry_ids: registry.map((r) => r.id),
  errors,
  ssot_path: 'EDGE_PROFIT_00/HYPOTHESES_SSOT.md',
  evidence_scope: 'reports/evidence/EDGE_PROFIT_00/registry',
});

console.log(`[${status}] edge_hypothesis_registry_court — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
