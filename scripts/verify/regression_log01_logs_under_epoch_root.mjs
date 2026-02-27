import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const evidenceRoot = path.join(ROOT, 'reports/evidence');
const epochDirs = fs.existsSync(evidenceRoot) ? fs.readdirSync(evidenceRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith('EPOCH-VICTORY-'))
  .map((d) => ({name: d.name, mtime: fs.statSync(path.join(evidenceRoot, d.name)).mtimeMs}))
  .sort((a, b) => a.mtime - b.mtime) : [];
const latestEpochDir = epochDirs.length ? epochDirs[epochDirs.length - 1].name : null;
const precheckPath = latestEpochDir ? path.join(evidenceRoot, latestEpochDir, 'gates/manual/victory_precheck.json') : '';
fs.mkdirSync(MANUAL, { recursive: true });

let offenders = ['victory_precheck_missing'];
if (precheckPath && fs.existsSync(precheckPath)) {
  const pre = JSON.parse(fs.readFileSync(precheckPath, 'utf8'));
  const out = Array.isArray(pre.offenders_outside_allowed_roots) ? pre.offenders_outside_allowed_roots : [];
  offenders = out
    .filter((p) => /\.log$/i.test(String(p)))
    .filter((p) => !String(p).startsWith('reports/evidence/EPOCH-'))
    .sort((a,b)=>a.localeCompare(b));
}

const ok = offenders.length === 0;
const status = ok ? 'PASS' : 'BLOCKED';
const reason = ok ? 'NONE' : 'RG_LOG01';
writeMd(path.join(EXEC, 'REGRESSION_LOG01_LOGS_UNDER_EPOCH_ROOT.md'), `# REGRESSION_LOG01_LOGS_UNDER_EPOCH_ROOT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s epoch:victory:seal\n\n${offenders.length ? offenders.map((o)=>`- offender: ${o}`).join('\n') : '- offenders: []'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_log01_logs_under_epoch_root.json'), { schema_version:'1.0.0', status, reason_code: reason, run_id: RUN_ID, offenders });
console.log(`[${status}] regression_log01_logs_under_epoch_root — ${reason}`);
process.exit(ok ? 0 : 2);
