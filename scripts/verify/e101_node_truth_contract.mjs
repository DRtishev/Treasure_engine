#!/usr/bin/env node
// E101-10F: Node truth contract
// CI requires Node major>=22; Node 24 is preferred and Node 22 is allowed with WARN.

import { spawnSync } from 'node:child_process';
import { isCIMode } from './foundation_ci.mjs';

function getNodeVersion() {
  const result = spawnSync('node', ['-v'], { encoding: 'utf8' });
  const version = (result.stdout || '').trim();
  const match = version.match(/^v(\d+)\.(\d+)/);
  return match ? { major: parseInt(match[1], 10), minor: parseInt(match[2], 10), raw: version } : null;
}

const v = getNodeVersion();
if (!v) {
  console.error('e101:node_truth FAILED: cannot determine Node version');
  process.exit(1);
}

if (isCIMode() && v.major < 22) {
  console.error(`e101:node_truth FAILED: CI requires Node major>=22, got ${v.major}`);
  process.exit(1);
}
if (!isCIMode() && v.major < 22) {
  console.error(`e101:node_truth FAILED: requires Node major>=22, got ${v.major}`);
  process.exit(1);
}

if (v.major !== 24) {
  console.warn(`e101:node_truth WARN: preferred Node major=24, got ${v.major}`);
}

console.log(`e101:node_truth PASSED (${v.raw})`);
