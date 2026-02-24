import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';
fs.mkdirSync(MANUAL_DIR, { recursive: true });

const smokeSrc = fs.readFileSync(path.join(ROOT, 'scripts/edge/edge_lab/edge_profit_00_acquire_public_smoke.mjs'), 'utf8');
const execSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_edge_profit_public_00.mjs'), 'utf8');
const hasOfflineReplaySmoke = smokeSrc.includes('smoke_mode: OFFLINE_REPLAY') && smokeSrc.includes('checkOfflineReplayLock()');
const hasSkipDiagInOffline = execSrc.includes("skipped: 'OFFLINE_REPLAY'") && execSrc.includes("smokeMode === 'OFFLINE_REPLAY'");

const status = hasOfflineReplaySmoke && hasSkipDiagInOffline ? 'PASS' : 'FAIL';
const reasonCode = status === 'PASS' ? 'NONE' : 'RG01';
writeMd(path.join(REG_DIR, 'REGRESSION_PUBLIC_EPOCH_OFFLINE_REPLAY_NO_NETWORK.md'), `# REGRESSION_PUBLIC_EPOCH_OFFLINE_REPLAY_NO_NETWORK.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- has_offline_replay_smoke: ${hasOfflineReplaySmoke}\n- has_skip_diag_in_offline: ${hasSkipDiagInOffline}\n`);
writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_public_epoch_offline_replay_no_network.json'), {
  schema_version:'1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
  message: status === 'PASS' ? 'Offline replay path present and network diag skipped.' : 'Offline replay/no-network path missing.',
  next_action: NEXT_ACTION, has_offline_replay_smoke: hasOfflineReplaySmoke, has_skip_diag_in_offline: hasSkipDiagInOffline,
});
console.log(`[${status}] regression_public_epoch_offline_replay_no_network — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
