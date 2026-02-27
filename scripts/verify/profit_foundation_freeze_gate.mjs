import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';
fs.mkdirSync(MANUAL, { recursive: true });

const required = [
  { path: 'reports/evidence/EXECUTOR/gates/manual/mega_proof_x2.json', cmd: '' },
  { path: 'reports/evidence/EXECUTOR/gates/manual/regression_no_unbounded_spawnsync.json', cmd: '' },
  { path: 'reports/evidence/EXECUTOR/gates/manual/regression_node22_wrapper_timeout.json', cmd: '' },
  { path: 'reports/evidence/EDGE_PROFIT_00/registry/gates/manual/regression_public_diag_bounded.json', cmd: 'npm run -s verify:regression:public-diag-bounded' },
  { path: 'reports/evidence/GOV/gates/manual/regression_export_final_validated_x2.json', cmd: 'npm run -s verify:regression:export-final-validated-x2' },
];

function runIfMissing(cmd) {
  if (!cmd) return { attempted: false, ec: 0 };
  const r = spawnSync('bash', ['-lc', cmd], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 900000,
    maxBuffer: 32 * 1024 * 1024,
    killSignal: 'SIGKILL',
  });
  return { attempted: true, ec: Number(r.status ?? 1) };
}

const checks = required.map((item) => {
  const abs = path.join(ROOT, item.path);
  let run = { attempted: false, ec: 0 };
  if (!fs.existsSync(abs)) {
    run = runIfMissing(item.cmd);
  }
  if (!fs.existsSync(abs)) return { path: item.path, ok: false, status: 'MISSING', detail: run.attempted ? `artifact not found after cmd ec=${run.ec}` : 'artifact not found', cmd_attempted: run.attempted, cmd_ec: run.ec };
  try {
    const j = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const jStatus = String(j.status || 'UNKNOWN').toUpperCase();
    return { path: item.path, ok: jStatus === 'PASS', status: jStatus, detail: jStatus === 'PASS' ? 'ok' : 'status must be PASS', cmd_attempted: run.attempted, cmd_ec: run.ec };
  } catch {
    return { path: item.path, ok: false, status: 'INVALID', detail: 'invalid json', cmd_attempted: run.attempted, cmd_ec: run.ec };
  }
});

const missing = checks.filter((x) => !x.ok).map((x) => ({ path: x.path, status: x.status, detail: x.detail, cmd_attempted: x.cmd_attempted, cmd_ec: x.cmd_ec }));
const frozen = missing.length === 0;
const status = frozen ? 'PASS' : 'NEEDS_DATA';
const reason_code = frozen ? 'NONE' : 'PFZ01_NEEDS_DATA';

writeMd(path.join(EXEC_DIR, 'PROFIT_FOUNDATION_FREEZE_GATE.md'), `# PROFIT_FOUNDATION_FREEZE_GATE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n## REQUIRED\n${required.map((x) => `- ${x.path}${x.cmd ? ` | cmd: ${x.cmd}` : ''}`).join('\n')}\n\n## CHECKS\n${checks.map((x) => `- ${x.path}: ${x.status} (${x.detail}) cmd_attempted=${x.cmd_attempted} cmd_ec=${x.cmd_ec}`).join('\n')}\n\n## MISSING_OR_BLOCKING\n${missing.map((x) => `- ${x.path}: ${x.status} (${x.detail}) cmd_attempted=${x.cmd_attempted} cmd_ec=${x.cmd_ec}`).join('\n') || '- none'}\n\n- foundation_frozen: ${frozen}\n`);
writeJsonDeterministic(path.join(MANUAL, 'profit_foundation_freeze_gate.json'), {
  schema_version: '1.1.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  foundation_frozen: frozen,
  required,
  checks,
  missing,
});
console.log(`[${status}] profit_foundation_freeze_gate — ${reason_code}`);
process.exit(frozen ? 0 : 2);
