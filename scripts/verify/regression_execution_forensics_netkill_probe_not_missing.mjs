import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const fpath = path.join(EXEC, 'EXECUTION_FORENSICS.md');
fs.mkdirSync(MANUAL, { recursive: true });

const text = fs.readFileSync(fpath, 'utf8');
const probe = (text.match(/net_kill_runtime_probe_result:\s*([^\n]+)/) || [, 'MISSING'])[1].trim();
const probeErr = (text.match(/net_kill_runtime_probe_error_code:\s*([^\n]+)/) || [, 'MISSING'])[1].trim();
const probeSig = (text.match(/net_kill_runtime_probe_signature_sha256:\s*([^\n]+)/) || [, 'MISSING'])[1].trim();
const classification = (text.match(/executor_classification_mode:\s*([^\n]+)/) || [, ''])[1];
const authoritative = /(verify|proof|gov|victory|foundation|mega)/i.test(classification);
const probeValid = /^(PASS|FAIL)$/.test(probe);
const sigValid = /^[a-f0-9]{64}$/.test(probeSig);
const ok = !authoritative || (probeValid && sigValid && probe !== 'MISSING');
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'NET_PROBE01';
writeMd(path.join(EXEC, 'REGRESSION_EXECUTION_FORENSICS_NETKILL_PROBE.md'), `# REGRESSION_EXECUTION_FORENSICS_NETKILL_PROBE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:execution-forensics-netkill-probe\n\n- authoritative: ${authoritative}\n- net_kill_runtime_probe_result: ${probe}\n- net_kill_runtime_probe_error_code: ${probeErr}\n- net_kill_runtime_probe_signature_sha256: ${probeSig}\n- classification: ${classification}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_execution_forensics_netkill_probe_not_missing.json'), { schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID, authoritative, probe, probe_error_code: probeErr, probe_signature_sha256: probeSig, classification });
console.log(`[${status}] regression_execution_forensics_netkill_probe_not_missing — ${reason}`);
process.exit(ok ? 0 : 1);
