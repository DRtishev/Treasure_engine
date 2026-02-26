import { spawnSync } from 'node:child_process';

const r = spawnSync(process.execPath, ['scripts/edge/edge_liq_01_offline_replay.mjs'], {
  env: { ...process.env, TREASURE_NET_KILL: '0' },
  encoding: 'utf8',
});
if (r.status === 0) {
  console.error('[FAIL] RG_DATA03 replay passed while network-kill disabled guard expected');
  process.exit(1);
}
if (!(`${r.stdout}\n${r.stderr}`).includes('ND_LIQ01')) {
  console.error('[FAIL] RG_DATA03 expected ND_LIQ01 classification');
  process.exit(1);
}
console.log('[PASS] RG_DATA03 offline replay enforces NET_KILL');
