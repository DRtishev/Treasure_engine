import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

// FIX-03: deterministic test run id — no mtime-based discovery
const TEST_RUN_ID = 'EC01_TEST';
const epochDirName = `EPOCH-VICTORY-${TEST_RUN_ID}`;
const evidenceRoot = path.join(ROOT, 'reports/evidence');
const epochDir = path.join(evidenceRoot, epochDirName);

const run = spawnSync('bash', ['scripts/ops/node_authority_run.sh', 'npm', 'run', '-s', '_epoch:victory:seal'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, VICTORY_TEST_MODE: '1', CI: 'true', TREASURE_RUN_ID: TEST_RUN_ID },
});

const sealPath = path.join(epochDir, 'gates/manual/victory_seal.json');

const offenders = [];
if (!fs.existsSync(epochDir)) offenders.push('missing_epoch_victory_dir');
if (!fs.existsSync(sealPath)) offenders.push('missing_victory_seal_json');
let seal = {};
if (fs.existsSync(sealPath)) {
  seal = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
  if (!String(seal.reason_code || '').trim()) offenders.push('missing_reason_code');
  if (String(seal.reason_code || '').trim() === 'EC01') offenders.push('ec01_detected');
  if (!String(seal.block_reason_surface || '').trim()) offenders.push('missing_block_reason_surface');
  if (!(Number.isInteger(seal.first_failing_step_index) || seal.first_failing_step_index === null)) offenders.push('missing_first_failing_step_index');
  if (!(typeof seal.first_failing_step_cmd === 'string' || seal.first_failing_step_cmd === null)) offenders.push('missing_first_failing_step_cmd');
  if (!Array.isArray(seal.related_evidence_paths)) offenders.push('missing_related_evidence_paths');
}

const ok = offenders.length === 0;
const status = ok ? 'PASS' : 'BLOCKED';
const reason = ok ? 'NONE' : 'RG_EC01_01';

// FIX-03: cleanup test-mode epoch dir (only if test_mode confirmed)
if (seal.test_mode === true && fs.existsSync(epochDir)) {
  fs.rmSync(epochDir, { recursive: true, force: true });
}

writeMd(path.join(EXEC, 'REGRESSION_EC01_REASON_CONTEXT_CONTRACT.md'), `# REGRESSION_EC01_REASON_CONTEXT_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s epoch:victory:seal\n\n- wrapper_exit: ${run.status}\n- latest_epoch_victory: ${epochDirName}\n- offenders: ${offenders.length ? offenders.join(',') : '[]'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_ec01_reason_context_contract.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID,
  wrapper_exit: run.status, latest_epoch_victory: epochDirName, offenders,
});
console.log(`[${status}] regression_ec01_reason_context_contract — ${reason}`);
process.exit(ok ? 0 : 2);
