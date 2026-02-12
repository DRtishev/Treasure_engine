import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['scripts/verify/edge_epoch_gate.mjs', '38'], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
