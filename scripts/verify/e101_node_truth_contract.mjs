#!/usr/bin/env node
// E101-10F: Node truth contract
// CI truthy requires Node major==22, non-CI warns but allows

import { spawnSync } from 'node:child_process';
import { isCIMode } from './foundation_ci.mjs';

function getNodeVersion() {
  const result = spawnSync('node', ['-v'], { encoding: 'utf8' });
  const version = (result.stdout || '').trim();
  const match = version.match(/^v(\d+)\./);
  return match ? parseInt(match[1], 10) : null;
}

const nodeMajor = getNodeVersion();
const REQUIRED_MAJOR = 22;

if (nodeMajor === null) {
  console.error('e101:node_truth FAILED: cannot determine Node version');
  process.exit(1);
}

if (isCIMode() && nodeMajor !== REQUIRED_MAJOR) {
  console.error(`e101:node_truth FAILED: CI requires Node major==${REQUIRED_MAJOR}, got ${nodeMajor}`);
  process.exit(1);
}

if (!isCIMode() && nodeMajor !== REQUIRED_MAJOR) {
  console.warn(`e101:node_truth WARN: Node major==${nodeMajor} (expected ${REQUIRED_MAJOR})`);
}

console.log(`e101:node_truth PASSED (Node v${nodeMajor})`);
