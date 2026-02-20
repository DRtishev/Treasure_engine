import { execSync } from 'node:child_process';

function run() {
  execSync('node scripts/edge/edge_lab/edge_next_epoch.mjs', { stdio: 'inherit' });
}

run();
run();

console.log('[PASS] edge:all:x2');
