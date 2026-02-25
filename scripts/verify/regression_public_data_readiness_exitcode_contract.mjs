import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:public-data-readiness-exitcode-contract';

const r = runBounded('npm run -s verify:public:data:readiness', { cwd: ROOT, env: { ...process.env, OFFLINE_REPLAY: '1' }, maxBuffer: 8 * 1024 * 1024 });
const status = r.ec === 2 ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'RG_RDY01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_PUBLIC_DATA_READINESS_EXITCODE_CONTRACT.md'), `# REGRESSION_PUBLIC_DATA_READINESS_EXITCODE_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- readiness_ec: ${r.ec}\n- expected_ec_for_needs_data: 2\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_public_data_readiness_exitcode_contract.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, readiness_ec:r.ec, expected_ec_for_needs_data:2 });
console.log(`[${status}] regression_public_data_readiness_exitcode_contract — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
