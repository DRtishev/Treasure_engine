import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const required = [
  'reports/evidence/EXECUTOR/gates/manual/regression_determinism_audit.json',
  'reports/evidence/EXECUTOR/gates/manual/regression_netkill_ledger_deterministic_x2.json',
  'reports/evidence/EXECUTOR/gates/manual/regression_netkill_ledger_summary_consistency.json',
  'reports/evidence/EXECUTOR/gates/manual/regression_node_options_preload_eviction.json',
  'reports/evidence/EXECUTOR/gates/manual/regression_netkill_physics_full_surface.json',
  'reports/evidence/EXECUTOR/gates/manual/regression_operator_single_action_ssot.json',
  'reports/evidence/EXECUTOR/gates/manual/public_data_readiness_seal.json',
];
const checks = {};
for (const rel of required) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { checks[rel] = { exists: false, schema_version: false, status_ok: false }; continue; }
  try {
    const d = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const statusOk = rel.endsWith('public_data_readiness_seal.json') ? ['PASS', 'NEEDS_DATA'].includes(String(d.status)) : String(d.status) === 'PASS';
    checks[rel] = { exists: true, schema_version: String(d.schema_version) === '1.0.0', status_ok: statusOk };
  } catch {
    checks[rel] = { exists: true, schema_version: false, status_ok: false };
  }
}
const ok = Object.values(checks).every((c) => c.exists && c.schema_version && c.status_ok);
const status = ok ? 'PASS' : 'BLOCKED';
const reason_code = ok ? 'NONE' : 'RG_GRP01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_GATE_RECEIPT_PRESENCE_CONTRACT.md'), `# REGRESSION_GATE_RECEIPT_PRESENCE_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: exists=${v.exists} schema=${v.schema_version} status_ok=${v.status_ok}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_gate_receipt_presence_contract.json'), { schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, checks });
console.log(`[${status}] regression_gate_receipt_presence_contract — ${reason_code}`);
process.exit(ok ? 0 : 1);
