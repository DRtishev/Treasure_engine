#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { BOOT_NODE, CAPSULE_TAR, REASON } from './e141_lib.mjs';
import { proxyRedacted, REASONS } from './e142m_lib.mjs';
import { classifyNet } from './e142m_network_classify.mjs';

export function doctorState({ probe = false } = {}) {
  const nodeMajor = Number(process.versions.node.replace(/^v/, '').split('.')[0] || 0);
  const hasBoot = fs.existsSync(BOOT_NODE);
  const hasCapsule = fs.existsSync(CAPSULE_TAR);
  let mode = 'AUTHORITATIVE_READY';
  let why = 'BOOTSTRAP_OK';
  let next = 'CI=true npm run -s verify:mega';
  if (probe) {
    mode = 'PROBE_ONLY_NON_AUTHORITATIVE';
    why = REASONS.PROBE_ONLY_NON_AUTHORITATIVE;
  } else if (nodeMajor < 22 && !hasBoot && !hasCapsule) {
    mode = 'NEED_NODE_CAPSULE';
    why = REASONS.NEED_NODE_TARBALL;
    next = 'CI=true npm run -s verify:mega';
  } else if (nodeMajor < 22 && !hasBoot && hasCapsule) {
    mode = 'ACQUIRE_CAPSULE_AVAILABLE';
    why = REASONS.NEED_NODE_TARBALL;
  }
  const n = classifyNet({ write: false });
  return { mode, why, next, proxy: proxyRedacted(), netClass: n.netClass, node: process.version, hasBoot, hasCapsule };
}

export function doctorText(s) {
  return [
    `MODE=${s.mode}`,
    `WHY=${s.why}`,
    `NEXT_ACTION=${s.next}`,
    `NODE=${s.node}`,
    `NET_CLASS=${s.netClass}`,
    `CAPSULE_PRESENT=${s.hasCapsule}`,
    `BOOTSTRAPPED_NODE_PRESENT=${s.hasBoot}`,
    `PROXY=scheme:${s.proxy.scheme};shape_hash:${s.proxy.shape_hash}`,
  ].join('\n');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  process.stdout.write(`${doctorText(doctorState({ probe: process.argv.includes('--probe') }))}\n`);
}
