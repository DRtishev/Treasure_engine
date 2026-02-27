import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
fs.mkdirSync('artifacts/incoming', { recursive: true });
fs.writeFileSync('artifacts/incoming/ALLOW_NETWORK', 'ALLOW_NETWORK: YES\n');
const r = spawnSync(process.execPath, ['scripts/edge/edge_liq_00_acquire_bybit_ws_v5.mjs', '--provider', 'bybit_ws_v5', '--duration-sec', '2', '--enable-network'], { encoding: 'utf8' });
const out = `${r.stdout}\n${r.stderr}`;
if (r.status === 1) {
  console.error('[FAIL] RG_ACQ02 acquire returned EC=1; expected EC=2 ACQ_NET01 under network limitation');
  process.exit(1);
}
if (r.status !== 0 && (r.status !== 2 || !out.includes('ACQ_NET01'))) {
  console.error('[FAIL] RG_ACQ02 expected ACQ_NET01 classification when network unavailable');
  process.exit(1);
}
console.log('[PASS] RG_ACQ02 classification uses EC=2 ACQ_NET01/NEEDS_NETWORK');
