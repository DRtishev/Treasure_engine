import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const canonSrc = fs.readFileSync(path.join(ROOT, 'scripts/edge/edge_lab/canon.mjs'), 'utf8');
const megaSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_mega_proof_x2.mjs'), 'utf8');

const canonHasMsMarkers = canonSrc.includes("'STARTED_AT_MS:'")
  && canonSrc.includes("'COMPLETED_AT_MS:'")
  && canonSrc.includes("'ELAPSED_MS:'");

const megaHasMsFilters = megaSrc.includes('STARTED_AT_MS|COMPLETED_AT_MS|ELAPSED_MS');

const checks = {
  canon_has_ms_markers: canonHasMsMarkers,
  mega_has_ms_filters: megaHasMsFilters,
  has_ms_timing_canonicalization_path: canonHasMsMarkers || megaHasMsFilters,
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_MPF02';

writeMd(path.join(EXEC_DIR, 'REGRESSION_MEGA_PROOF_X2_IGNORES_MS_TIMING.md'), `# REGRESSION_MEGA_PROOF_X2_IGNORES_MS_TIMING.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);

writeJsonDeterministic(path.join(MANUAL, 'regression_mega_proof_x2_ignores_ms_timing.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});

console.log(`[${status}] regression_mega_proof_x2_ignores_ms_timing — ${reason_code}`);
process.exit(ok ? 0 : 1);
