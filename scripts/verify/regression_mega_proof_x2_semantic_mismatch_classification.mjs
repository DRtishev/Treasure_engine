import path from 'node:path';
import { RUN_ID, writeMd, stableEvidenceNormalize } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:mega-proof-x2-semantic-mismatch-classification';

function normalizeForMegaSample(content, rel, mode) {
  const base = stableEvidenceNormalize(content, { assertD005: false });
  const maybeCode = mode === 'noise' && rel === 'reports/evidence/EXECUTOR/COMMANDS_RUN.md'
    ? base.replace(/```[\s\S]*?```/g, '```<BLOCK>```')
    : base;
  return maybeCode.split(/\r?\n/).filter((line) => !/\bRUN_ID=/.test(line)).join('\n');
}

const rel = 'reports/evidence/EXECUTOR/COMMANDS_RUN.md';
const a = '```js\nconsole.log(1)\n```\nRUN_ID=AAA\n';
const b = '```js\nconsole.log(2)\n```\nRUN_ID=BBB\n';
const noiseEqual = normalizeForMegaSample(a, rel, 'noise') === normalizeForMegaSample(b, rel, 'noise');
const semanticEqual = normalizeForMegaSample(a, rel, 'semantic') === normalizeForMegaSample(b, rel, 'semantic');
const status = noiseEqual && !semanticEqual ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'ND01_SEM01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_MEGA_PROOF_X2_SEMANTIC_MISMATCH_CLASSIFICATION.md'), `# REGRESSION_MEGA_PROOF_X2_SEMANTIC_MISMATCH_CLASSIFICATION.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- noise_equal: ${noiseEqual}\n- semantic_equal: ${semanticEqual}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_mega_proof_x2_semantic_mismatch_classification.json'), {
  schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, noise_equal: noiseEqual, semantic_equal: semanticEqual,
});
console.log(`[${status}] regression_mega_proof_x2_semantic_mismatch_classification — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
