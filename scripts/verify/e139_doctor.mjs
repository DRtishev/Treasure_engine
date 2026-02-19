#!/usr/bin/env node
import { createHash } from 'node:crypto';

const REASONS = {
  FAIL_NODE_POLICY: 'FAIL_NODE_POLICY',
  PROBE_ONLY_NON_AUTHORITATIVE: 'PROBE_ONLY_NON_AUTHORITATIVE',
  ONLINE_SKIPPED_FLAGS_NOT_SET: 'ONLINE_SKIPPED_FLAGS_NOT_SET',
  ONLINE_READY_OPTIONAL: 'ONLINE_READY_OPTIONAL',
  ONLINE_READY_REQUIRED: 'ONLINE_READY_REQUIRED',
  AUTHORITATIVE_READY: 'AUTHORITATIVE_READY',
  AUTHORITATIVE_BLOCKED: 'AUTHORITATIVE_BLOCKED',
  OK: 'OK',
};

function flag(name) {
  return String(process.env[name] || '') === '1';
}

function parseProxy(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const hostport = `${u.hostname}:${u.port || (u.protocol === 'https:' ? '443' : '80')}`;
    const shape = createHash('sha256').update(hostport).digest('hex').slice(0, 16);
    return { present: true, scheme: u.protocol.replace(':', ''), shape_hash: shape };
  } catch {
    return { present: true, scheme: 'unknown', shape_hash: createHash('sha256').update(raw).digest('hex').slice(0, 16) };
  }
}

export function getDoctorState({ probe = false } = {}) {
  const nodeMajor = Number(process.versions.node.split('.')[0] || 0);
  const nodePolicyOk = nodeMajor >= 22;
  const onlineOptional = flag('ONLINE_OPTIONAL');
  const onlineRequired = flag('ONLINE_REQUIRED');
  const enableNet = flag('ENABLE_NET');
  const liveRisk = flag('I_UNDERSTAND_LIVE_RISK');

  let mode = REASONS.AUTHORITATIVE_READY;
  let reasonCode = REASONS.OK;
  let nextAction = 'NEXT_ACTION: CI=true npm run -s verify:e139';

  if (!nodePolicyOk && probe) {
    mode = REASONS.PROBE_ONLY_NON_AUTHORITATIVE;
    reasonCode = REASONS.FAIL_NODE_POLICY;
    nextAction = 'NEXT_ACTION: install Node>=22 then run CI=true npm run -s verify:e139';
  } else if (!nodePolicyOk) {
    mode = REASONS.AUTHORITATIVE_BLOCKED;
    reasonCode = REASONS.FAIL_NODE_POLICY;
    nextAction = 'NEXT_ACTION: run npm run -s verify:e139:probe (non-authoritative) or upgrade to Node>=22';
  } else if (!(enableNet && liveRisk && (onlineOptional || onlineRequired))) {
    mode = REASONS.ONLINE_SKIPPED_FLAGS_NOT_SET;
    reasonCode = REASONS.ONLINE_SKIPPED_FLAGS_NOT_SET;
    nextAction = 'NEXT_ACTION: offline authoritative path ready; set online flags only if online diagnostics are required';
  } else if (onlineRequired) {
    mode = REASONS.ONLINE_READY_REQUIRED;
    reasonCode = REASONS.ONLINE_READY_REQUIRED;
    nextAction = 'NEXT_ACTION: run online-required diagnostics with current flags';
  } else {
    mode = REASONS.ONLINE_READY_OPTIONAL;
    reasonCode = REASONS.ONLINE_READY_OPTIONAL;
    nextAction = 'NEXT_ACTION: run optional online diagnostics or continue offline authoritative verification';
  }

  const proxyRaw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY || '';
  const proxy = parseProxy(proxyRaw);

  return {
    mode,
    reasonCode,
    nextAction,
    node: process.version,
    node_policy_ok: nodePolicyOk,
    flags: {
      CI: String(process.env.CI || ''),
      ENABLE_NET: enableNet ? '1' : '0',
      ONLINE_OPTIONAL: onlineOptional ? '1' : '0',
      ONLINE_REQUIRED: onlineRequired ? '1' : '0',
      I_UNDERSTAND_LIVE_RISK: liveRisk ? '1' : '0',
      FORCE_IPV4: flag('FORCE_IPV4') ? '1' : '0',
      FORCE_IPV6: flag('FORCE_IPV6') ? '1' : '0',
    },
    proxy,
  };
}

export function formatDoctor(state) {
  const lines = [
    'E139_DOCTOR',
    `NODE_POLICY_STATUS: ${state.node_policy_ok ? 'PASS' : 'BLOCKED'}`,
    `NODE_VERSION: ${state.node}`,
    `FLAGS: CI=${state.flags.CI} ENABLE_NET=${state.flags.ENABLE_NET} ONLINE_OPTIONAL=${state.flags.ONLINE_OPTIONAL} ONLINE_REQUIRED=${state.flags.ONLINE_REQUIRED} I_UNDERSTAND_LIVE_RISK=${state.flags.I_UNDERSTAND_LIVE_RISK} FORCE_IPV4=${state.flags.FORCE_IPV4} FORCE_IPV6=${state.flags.FORCE_IPV6}`,
    `PROXY_DISCOVERY: ${state.proxy ? `present=true scheme=${state.proxy.scheme} shape_hash=${state.proxy.shape_hash}` : 'present=false'}`,
    `MODE: ${state.mode}`,
    `REASON_CODE: ${state.reasonCode}`,
    state.nextAction,
  ];
  return `${lines.join('\n')}\n`;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const probe = process.argv.includes('--probe');
  const state = getDoctorState({ probe });
  process.stdout.write(formatDoctor(state));
}
