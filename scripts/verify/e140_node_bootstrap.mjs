#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E140_ROOT, NODE_BIN, NODE_INSTALL_DIR, NODE_SHA_FILE, REASON, detectTarball, run, shaOrNA, writeMd } from './e140_lib.mjs';

export function bootstrapNode({ probe = false } = {}) {
  const major = Number(process.versions.node.split('.')[0] || 0);
  if (major >= 22) {
    return { status: 'READY_SYSTEM_NODE', reason: REASON.AUTHORITATIVE_READY, ec: 0, node_bin: process.execPath };
  }

  if (fs.existsSync(NODE_BIN)) {
    const check = run(NODE_BIN, ['-v']);
    if (check.ec === 0) {
      return { status: 'READY_BOOTSTRAPPED_NODE', reason: REASON.AUTHORITATIVE_READY, ec: 0, node_bin: NODE_BIN };
    }
  }

  const tarball = detectTarball();
  if (!tarball) {
    return {
      status: probe ? 'PROBE_ONLY' : 'BLOCKED',
      reason: REASON.NEED_NODE_TARBALL,
      ec: probe ? 0 : 1,
      node_bin: '',
      next_action: 'Place pinned tarball at artifacts/incoming/node/node-v24.12.0-linux-x64.tar.xz with matching .sha256 then rerun verify:e140',
    };
  }

  const expected = fs.existsSync(NODE_SHA_FILE) ? fs.readFileSync(NODE_SHA_FILE, 'utf8').trim().split(/\s+/)[0] : '';
  const actual = shaOrNA(tarball);
  if (!expected || expected !== actual) {
    return { status: 'BLOCKED', reason: REASON.FAIL_NODE_POLICY, ec: probe ? 0 : 1, node_bin: '', next_action: 'Fix tarball sha256 to match pinned .sha256 file' };
  }

  fs.mkdirSync(path.dirname(NODE_INSTALL_DIR), { recursive: true });
  const args = tarball.endsWith('.tar.xz')
    ? ['-xJf', tarball, '-C', path.dirname(NODE_INSTALL_DIR)]
    : ['-xzf', tarball, '-C', path.dirname(NODE_INSTALL_DIR)];
  const untar = run('tar', args);
  if (untar.ec !== 0 || !fs.existsSync(NODE_BIN)) {
    return { status: 'BLOCKED', reason: REASON.FAIL_NODE_POLICY, ec: probe ? 0 : 1, node_bin: '', next_action: 'Repair tarball contents and retry bootstrap' };
  }

  return { status: 'READY_BOOTSTRAPPED_NODE', reason: REASON.AUTHORITATIVE_READY, ec: 0, node_bin: NODE_BIN };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const r = bootstrapNode({ probe: process.argv.includes('--probe') });
  writeMd(path.join(E140_ROOT, 'NODE_BOOTSTRAP.md'), [
    '# E140 NODE BOOTSTRAP',
    `- status: ${r.status}`,
    `- reason_code: ${r.reason}`,
    `- node_bin: ${r.node_bin || 'NA'}`,
    `- next_action: ${r.next_action || 'none'}`,
    '## RAW',
    `- current_node: ${process.version}`,
  ].join('\n'));
  process.exit(r.ec);
}
