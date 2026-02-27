import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const beforeTracked = spawnSync('git', ['diff', '--name-only'], { cwd: ROOT, encoding: 'utf8' });
const before = new Set(String(beforeTracked.stdout || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean));

const run = spawnSync('bash', ['scripts/ops/node_authority_run.sh', '/bin/true'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, NODEAUTH_FORCE_COMMAND: 'npm run -s epoch:victory:seal' },
});

const epochRoot = path.join(ROOT, 'reports/evidence');
const routedDirs = fs.readdirSync(epochRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith('EPOCH-NODEAUTH-'))
  .map((d) => d.name)
  .sort();

const latest = routedDirs.length ? routedDirs[routedDirs.length - 1] : '';
const receiptMd = latest ? path.join(epochRoot, latest, 'node_authority/RECEIPT.md') : '';
const receiptJson = latest ? path.join(epochRoot, latest, 'node_authority/receipt.json') : '';
const execPoison = path.join(ROOT, 'reports/evidence/EXECUTOR/NODE_AUTHORITY_RECEIPT.md');
const execPoisonBefore = fs.existsSync(execPoison) ? fs.readFileSync(execPoison, 'utf8') : '__MISSING__';

const afterTracked = spawnSync('git', ['diff', '--name-only'], { cwd: ROOT, encoding: 'utf8' });
const after = String(afterTracked.stdout || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const newTracked = after.filter((p) => !before.has(p));

const offenders = [];
if (run.status !== 0) offenders.push(`wrapper_exit_${run.status}`);
if (!latest) offenders.push('missing_epoch_nodeauth_dir');
if (latest && !fs.existsSync(receiptMd)) offenders.push('missing_routed_receipt_md');
if (latest && !fs.existsSync(receiptJson)) offenders.push('missing_routed_receipt_json');
const execPoisonAfter = fs.existsSync(execPoison) ? fs.readFileSync(execPoison, 'utf8') : '__MISSING__';
if (execPoisonBefore !== execPoisonAfter) offenders.push('executor_receipt_mutated');
if (newTracked.length > 0) offenders.push(`new_tracked_mods_${newTracked.join(',')}`);

const ok = offenders.length === 0;
const status = ok ? 'PASS' : 'BLOCKED';
const reason = ok ? 'NONE' : 'RG_NODE_CHURN01';

writeMd(path.join(EXEC, 'REGRESSION_NODE_CHURN_RECEIPT_ROUTING.md'), `# REGRESSION_NODE_CHURN_RECEIPT_ROUTING.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s epoch:victory:seal\n\n- routed_dir: ${latest || 'NONE'}\n- offenders: ${offenders.length ? offenders.join(',') : '[]'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_node_churn_receipt_routing.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID, routed_dir: latest || 'NONE', offenders,
});

console.log(`[${status}] regression_node_churn_receipt_routing — ${reason}`);
process.exit(ok ? 0 : 2);
