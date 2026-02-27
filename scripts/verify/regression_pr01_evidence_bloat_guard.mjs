import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const LIMIT = Number(process.env.PR01_EVIDENCE_BLOAT_LIMIT || 60);
const OVERRIDE_PATH = path.join(ROOT, 'artifacts/incoming/EVIDENCE_BLOAT_OVERRIDE');
const OVERRIDE_TOKEN = String(process.env.PR01_EVIDENCE_BLOAT_OVERRIDE_TOKEN || 'ALLOW_EVIDENCE_BLOAT_PR01');
const NEXT_ACTION = 'npm run -s verify:fast';

const hasOriginMain = spawnSync('git', ['show-ref', '--verify', '--quiet', 'refs/remotes/origin/main']).status === 0;
let files = [];
if (hasOriginMain) {
  const diff = spawnSync('git', ['diff', '--name-only', 'refs/remotes/origin/main...HEAD', '--', 'reports/evidence'], { encoding: 'utf8' });
  files = String(diff.stdout || '').split('\n').map((x) => x.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

let overrideAccepted = false;
if (fs.existsSync(OVERRIDE_PATH)) {
  overrideAccepted = String(fs.readFileSync(OVERRIDE_PATH, 'utf8')).trim() === OVERRIDE_TOKEN;
}

const checks = {
  baseline_origin_main_present: hasOriginMain,
  changed_evidence_files_n: files.length,
  within_limit_or_override: files.length <= LIMIT || overrideAccepted,
  override_accepted: overrideAccepted,
};

const ok = hasOriginMain && checks.within_limit_or_override;
const status = ok ? 'PASS' : 'FAIL';
const reason_code = !hasOriginMain ? 'BH01' : (files.length > LIMIT && !overrideAccepted ? 'RG_PR01_EVIDENCE_BLOAT' : 'NONE');

writeMd(path.join(EXEC, 'REGRESSION_PR01_EVIDENCE_BLOAT_GUARD.md'), `# REGRESSION_PR01_EVIDENCE_BLOAT_GUARD.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- limit: ${LIMIT}\n- changed_evidence_files_n: ${files.length}\n- override_path: ${path.relative(ROOT, OVERRIDE_PATH)}\n- override_accepted: ${overrideAccepted}\n\n## OFFENDERS\n${files.map((f) => `- ${f}`).join('\n') || '- NONE'}\n`);

writeJsonDeterministic(path.join(MANUAL, 'regression_pr01_evidence_bloat_guard.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  limit: LIMIT,
  changed_evidence_files_n: files.length,
  override_path: path.relative(ROOT, OVERRIDE_PATH).replace(/\\/g, '/'),
  override_required_token: OVERRIDE_TOKEN,
  override_accepted: overrideAccepted,
  offenders: files,
  checks,
});

console.log(`[${status}] regression_pr01_evidence_bloat_guard — ${reason_code}`);
process.exit(ok ? 0 : 1);
