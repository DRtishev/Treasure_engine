import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { getVictoryStepPlan } from '../executor/victory_steps.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:close';
const markers = ['export:evidence-bundle', 'verify:regression:evidence-bundle', 'verify:regression:portable-manifest'];

function get(profile) {
  process.env.VICTORY_PROFILE = profile;
  return getVictoryStepPlan(false).map((x) => x.cmd);
}

const fast = get('FAST');
const close = get('CLOSE');
const audit = get('AUDIT');

const hasAuditExporters = audit.some((cmd) => markers.some((m) => cmd.includes(m)));
const fastOffenders = fast.filter((cmd) => markers.some((m) => cmd.includes(m)));
const closeOffenders = close.filter((cmd) => markers.some((m) => cmd.includes(m)));

const checks = {
  audit_has_exporters: hasAuditExporters,
  fast_has_no_exporters: fastOffenders.length === 0,
  close_has_no_exporters: closeOffenders.length === 0,
};

const status = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'RG_AUDIT01_EXPORTERS_ONLY_IN_AUDIT';

writeMd(path.join(EXEC, 'REGRESSION_AUDIT01_EXPORTERS_ONLY_IN_AUDIT.md'), `# REGRESSION_AUDIT01_EXPORTERS_ONLY_IN_AUDIT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- audit_has_exporters: ${checks.audit_has_exporters}\n- fast_has_no_exporters: ${checks.fast_has_no_exporters}\n- close_has_no_exporters: ${checks.close_has_no_exporters}\n\n${[...fastOffenders.map((x)=>`- fast_offender: ${x}`), ...closeOffenders.map((x)=>`- close_offender: ${x}`)].join('\n') || '- offenders: []'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_audit01_exporters_only_in_audit.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, checks, fastOffenders, closeOffenders, markers });
console.log(`[${status}] regression_audit01_exporters_only_in_audit — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
