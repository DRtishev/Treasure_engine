import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:executor-netkill-coverage';
fs.mkdirSync(MANUAL, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_run_chain.mjs'), 'utf8');
const checks = {
  hasClassifier: src.includes('function isVerifyStep(cmd)'),
  classifierCoversVerifyGov: src.includes('(verify:|gov:'),
  runShellUsesForceFlag: src.includes('runShell(cmd, isVerifyStep(cmd))'),
  hasTreasureNetKill: src.includes("TREASURE_NET_KILL: '1'"),
  hasPreloadAbs: src.includes("path.join(ROOT, 'scripts', 'safety', 'net_kill_preload.cjs')"),
  hasNodeOptionsInject: src.includes('NODE_OPTIONS: buildNetKillNodeOptions(process.env.NODE_OPTIONS)'),
};
const status = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'RG_NKC01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_EXECUTOR_NETKILL_COVERAGE.md'), `# REGRESSION_EXECUTOR_NETKILL_COVERAGE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_executor_netkill_coverage.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, checks, matched_patterns:['verify:','gov:','preload abs path','node options injection']});
console.log(`[${status}] regression_executor_netkill_coverage — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
