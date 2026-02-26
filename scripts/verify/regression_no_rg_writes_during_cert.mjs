import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).stdout
  .split('\n').map((v) => v.trim()).filter(Boolean)
  .filter((f) => f.startsWith('reports/evidence/RG_'))
  .sort((a, b) => a.localeCompare(b));
const ok = untracked.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'SNAP_RG01';
writeMd(path.join(EXEC, 'REGRESSION_NO_RG_WRITES_DURING_CERT.md'), `# REGRESSION_NO_RG_WRITES_DURING_CERT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:no-rg-writes-during-cert\n\n${untracked.map((f)=>`- offender: ${f}`).join('\n') || '- offender: NONE'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_no_rg_writes_during_cert.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, offenders_untracked: untracked });
console.log(`[${status}] regression_no_rg_writes_during_cert — ${reason_code}`);
process.exit(ok ? 0 : 1);
