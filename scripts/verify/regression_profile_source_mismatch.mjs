import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { profileForEvidenceSource, resolveProfit00ManualDir, resolveProfit00Profile } from '../edge/edge_lab/edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const INGEST_JSON = path.join(resolveProfit00ManualDir(ROOT), 'paper_evidence_ingest.json');
const PROFILE = resolveProfit00Profile(ROOT);

const LEGACY_ROOT_MANUAL = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'gates', 'manual');
const NEXT_ACTION = 'npm run -s executor:run:chain';

fs.mkdirSync(MANUAL_DIR, { recursive: true });

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Profile/evidence_source mapping is consistent.';
let evidenceSource = 'UNKNOWN';
let expectedProfile = '';

if (!fs.existsSync(INGEST_JSON)) {
  status = 'BLOCKED';
  reasonCode = 'ME01';
  message = 'Missing ingest gate output for active profile.';
} else {
  const ingest = JSON.parse(fs.readFileSync(INGEST_JSON, 'utf8'));
  evidenceSource = String(ingest.evidence_source || 'UNKNOWN').toUpperCase();
  expectedProfile = profileForEvidenceSource(evidenceSource);
  if (!expectedProfile || PROFILE !== expectedProfile) {
    status = 'FAIL';
    reasonCode = 'PF01';
    message = `Profile marker mismatch: evidence_source=${evidenceSource}, expected_profile=${expectedProfile || 'UNKNOWN'}, profile=${PROFILE || 'EMPTY'}.`;
  }
}

if (status === 'PASS' && PROFILE === 'public' && fs.existsSync(LEGACY_ROOT_MANUAL)) {
  const entries = fs.readdirSync(LEGACY_ROOT_MANUAL).filter((x) => x.endsWith('.json'));
  if (entries.length > 0) {
    status = 'FAIL';
    reasonCode = 'SG01';
    message = `Legacy root manual writes present in profile mode: ${entries.join(', ')}`;
  }
}

writeMd(path.join(REG_DIR, 'REGRESSION_PROFILE_SOURCE_MISMATCH.md'), `# REGRESSION_PROFILE_SOURCE_MISMATCH.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- ingest_json: ${path.relative(ROOT, INGEST_JSON).replace(/\\/g, '/')}\n- profile_marker: ${PROFILE || 'MISSING'}\n- evidence_source: ${evidenceSource}\n- expected_profile: ${expectedProfile || 'UNKNOWN'}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_profile_source_mismatch.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  profile_marker: PROFILE || null,
  evidence_source: evidenceSource,
  expected_profile: expectedProfile || null,
  ingest_json: path.relative(ROOT, INGEST_JSON).replace(/\\/g, '/'),
  legacy_root_manual_exists: fs.existsSync(LEGACY_ROOT_MANUAL),
});

console.log(`[${status}] regression_profile_source_mismatch — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
