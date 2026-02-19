#!/usr/bin/env node
import { E140_ROOT, REASON, detectTarball, env1, redactedProxy, writeMd } from './e140_lib.mjs';

export function doctorState({ probe = false } = {}) {
  const nodeMajor = Number(process.versions.node.split('.')[0] || 0);
  const tarball = detectTarball();
  const enableNet = env1('ENABLE_NET');
  const risk = env1('I_UNDERSTAND_LIVE_RISK');
  const opt = env1('ONLINE_OPTIONAL');
  const req = env1('ONLINE_REQUIRED');

  let mode = 'AUTHORITATIVE_READY';
  let why = REASON.OK;
  let next = 'NEXT_ACTION: npm run -s verify:e140';

  if (nodeMajor < 22 && !tarball && probe) {
    mode = 'PROBE_ONLY_NON_AUTHORITATIVE';
    why = REASON.PROBE_ONLY_NON_AUTHORITATIVE;
    next = 'NEXT_ACTION: provide pinned node tarball in artifacts/incoming/node and run npm run -s verify:e140';
  } else if (nodeMajor < 22 && !tarball) {
    mode = 'NEED_NODE_TARBALL';
    why = REASON.NEED_NODE_TARBALL;
    next = 'NEXT_ACTION: place node-v24.12.0-linux-x64.tar.xz + .sha256 in artifacts/incoming/node';
  } else if (!(enableNet && risk && (opt || req))) {
    mode = 'NEED_FLAGS_FOR_ONLINE';
    why = REASON.NEED_FLAGS_FOR_ONLINE;
    next = 'NEXT_ACTION: keep offline path or set ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1 ONLINE_OPTIONAL=1';
  }

  if (nodeMajor < 22 && tarball) {
    mode = probe ? 'PROBE_ONLY_NON_AUTHORITATIVE' : 'AUTHORITATIVE_READY';
    why = probe ? REASON.PROBE_ONLY_NON_AUTHORITATIVE : REASON.AUTHORITATIVE_READY;
    next = probe ? 'NEXT_ACTION: run npm run -s verify:e140 for authoritative bootstrap' : 'NEXT_ACTION: run npm run -s verify:e140';
  }

  return {
    mode,
    why,
    next,
    node: process.version,
    proxy: redactedProxy(),
    flags: {
      CI: process.env.CI || '', ENABLE_NET: enableNet ? '1' : '0', ONLINE_OPTIONAL: opt ? '1' : '0', ONLINE_REQUIRED: req ? '1' : '0', FORCE_IPV4: env1('FORCE_IPV4') ? '1' : '0', FORCE_IPV6: env1('FORCE_IPV6') ? '1' : '0',
    },
    tarball_present: !!tarball,
  };
}

export function doctorText(s) {
  return [
    'E140_DOCTOR',
    `MODE: ${s.mode}`,
    `WHY: ${s.why}`,
    `NODE: ${s.node}`,
    `LOCAL_NODE_TARBALL_PRESENT: ${s.tarball_present}`,
    `FLAGS: CI=${s.flags.CI} ENABLE_NET=${s.flags.ENABLE_NET} ONLINE_OPTIONAL=${s.flags.ONLINE_OPTIONAL} ONLINE_REQUIRED=${s.flags.ONLINE_REQUIRED} FORCE_IPV4=${s.flags.FORCE_IPV4} FORCE_IPV6=${s.flags.FORCE_IPV6}`,
    `PROXY: present=${s.proxy.present} scheme=${s.proxy.scheme} shape_hash=${s.proxy.shape_hash}`,
    s.next,
  ].join('\n');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const probe = process.argv.includes('--probe');
  const s = doctorState({ probe });
  const text = doctorText(s);
  process.stdout.write(`${text}\n`);
  if (process.argv.includes('--write')) {
    writeMd(`${E140_ROOT}/DOCTOR_OUTPUT.md`, `# E140 DOCTOR OUTPUT\n\n## RAW\n\n\`\`\`\n${text}\n\`\`\``);
  }
}
