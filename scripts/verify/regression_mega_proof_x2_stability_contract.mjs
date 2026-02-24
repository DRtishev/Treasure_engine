import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const MANUAL_DIR = path.join(EXEC_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';
fs.mkdirSync(MANUAL_DIR, { recursive: true });

const exportSrc = fs.readFileSync(path.join(ROOT, 'scripts/export/final_validated.mjs'), 'utf8');
const megaSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_mega_proof_x2.mjs'), 'utf8');
const hasDeterministicGzip = exportSrc.includes("'-n', '-f', tarPath") && exportSrc.includes("'--sort=name'") && exportSrc.includes("'--mtime=UTC 2020-01-01'");
const hasNd01DiffHint = megaSrc.includes('nd01_diff_hint_files') && megaSrc.includes('ND01_DIFF_HINT_FILES');
const hasRunIdEqualsFilter = megaSrc.includes('!\/\\bRUN_ID=\/.test(line)');
const hasCodeBlockFilter = megaSrc.includes('noCodeBlocks = base.replace(/```[\\s\\S]*?```/g');

const status = hasDeterministicGzip && hasNd01DiffHint && hasRunIdEqualsFilter && hasCodeBlockFilter ? 'PASS' : 'FAIL';
const reasonCode = status === 'PASS' ? 'NONE' : 'RG01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_MEGA_PROOF_X2_STABILITY_CONTRACT.md'), `# REGRESSION_MEGA_PROOF_X2_STABILITY_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- has_deterministic_gzip: ${hasDeterministicGzip}\n- has_nd01_diff_hint: ${hasNd01DiffHint}\n- has_run_id_equals_filter: ${hasRunIdEqualsFilter}\n- has_code_block_filter: ${hasCodeBlockFilter}\n`);
writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_mega_proof_x2_stability_contract.json'), {
  schema_version:'1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
  message: status === 'PASS' ? 'Mega-proof x2 stability contract checks passed.' : 'Mega-proof x2 stability contract checks failed.',
  next_action: NEXT_ACTION, has_deterministic_gzip: hasDeterministicGzip, has_nd01_diff_hint: hasNd01DiffHint, has_run_id_equals_filter: hasRunIdEqualsFilter, has_code_block_filter: hasCodeBlockFilter,
});
console.log(`[${status}] regression_mega_proof_x2_stability_contract — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
