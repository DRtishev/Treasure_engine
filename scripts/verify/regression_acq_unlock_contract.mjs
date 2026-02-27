import { spawnSync } from 'node:child_process';
const r = spawnSync(process.execPath, ['scripts/edge/edge_liq_00_acquire_bybit_ws_v5.mjs', '--provider', 'bybit_ws_v5', '--duration-sec', '2'], { encoding: 'utf8' });
const out = `${r.stdout}\n${r.stderr}`;
if (r.status !== 2 || !out.includes('NET_REQUIRED')) {
  console.error('[FAIL] RG_ACQ01 expected EC=2 NET_REQUIRED when unlock missing');
  process.exit(1);
}
console.log('[PASS] RG_ACQ01 unlock contract enforced');
