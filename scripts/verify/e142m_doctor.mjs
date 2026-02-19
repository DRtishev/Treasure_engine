#!/usr/bin/env node
import fs from 'node:fs';
import { BOOT_NODE, CAPSULE_TAR } from './e141_lib.mjs';
import { CACHE_MAX_AGE_HOURS, REASONS, TRUTH_CACHE, proxyRedacted } from './e142m_lib.mjs';
import { classifyNet } from './e142m_network_classify.mjs';

const REQUIRED_CACHE_KEYS = [
  'schema_version','timestamp_utc','pinned_node_version','capsule_present','capsule_sha256_ok',
  'bootstrapped_node_present','pinned_node_health_ok','bridge_ec','rep_gate_ec',
  'authoritative','reason_code',
];

// Human-readable explanations for each reason code (concise, mobile-friendly).
const WHY_TEXT = {
  [REASONS.OK]:                         'All chain steps passed.',
  [REASONS.AUTHORITATIVE_PASS]:         'Authority confirmed from cache.',
  [REASONS.CACHE_MISSING]:              'No truth cache found. Run verify:mega to create it.',
  [REASONS.CACHE_INVALID]:              'Truth cache is malformed. Run verify:mega to rebuild.',
  [REASONS.CACHE_STALE]:                'Cache older than 24h. Refresh with verify:mega.',
  [REASONS.CACHE_STALE_FILESYSTEM]:     'Cache says artifacts present but they are gone. Re-run verify:mega.',
  [REASONS.NEED_NODE_TARBALL]:          'Capsule tarball missing. Place it then run verify:mega.',
  [REASONS.FAIL_CAPSULE_INTEGRITY]:     'Capsule SHA256 mismatch. Replace capsule then run verify:mega.',
  [REASONS.NEED_BOOTSTRAP]:             'Bootstrap failed. Run verify:mega.',
  [REASONS.FAIL_PINNED_NODE_HEALTH]:    'Pinned node binary unhealthy. Run verify:mega.',
  [REASONS.FAIL_NODE_POLICY]:           'Bridge or gate failed. Run verify:mega.',
  [REASONS.PROBE_ONLY_NON_AUTHORITATIVE]: 'Probe mode — no acquisition, never authoritative.',
  [REASONS.FAIL_CONTRACTS]:             'Contracts failed. Check CONTRACTS.md root_cause.',
};

function parseCache() {
  if (!fs.existsSync(TRUTH_CACHE)) return { ok: false, why: REASONS.CACHE_MISSING, data: null };
  const raw = fs.readFileSync(TRUTH_CACHE, 'utf8').replace(/\r\n/g, '\n');
  const data = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^-\s([a-z0-9_]+):\s*(.*)$/i);
    if (m) data[m[1]] = m[2].trim();
  }
  for (const k of REQUIRED_CACHE_KEYS) if (!(k in data)) return { ok: false, why: REASONS.CACHE_INVALID, data: null };
  return { ok: true, why: REASONS.OK, data };
}

export function doctorState() {
  const hasCapsule = fs.existsSync(CAPSULE_TAR);
  const hasBoot = fs.existsSync(BOOT_NODE);
  const proxy = proxyRedacted();
  const net = classifyNet({ write: false });
  const cache = parseCache();

  let mode = 'BLOCKED';
  let why = cache.why;
  let next = 'CI=true npm run -s verify:mega';
  let authoritative = false;
  let reasonCode = cache.why;
  let pinned = 'ABSENT';
  let lastKnownAuthTs = 'NONE';

  // Determine FILESYSTEM_STATE: reflects whether key artifacts are where they should be.
  const filesystemState = (!hasCapsule && !hasBoot) ? 'ABSENT'
    : (hasCapsule && hasBoot) ? 'OK'
    : 'PARTIAL';

  if (cache.ok) {
    const ts = Date.parse(cache.data.timestamp_utc || '');
    const ageHours = Number.isFinite(ts) ? Math.floor((Date.now() - ts) / 3600000) : (CACHE_MAX_AGE_HOURS + 1);
    pinned = hasBoot ? `READY/${cache.data.pinned_node_version}` : 'ABSENT';

    if (cache.data.authoritative === 'true') {
      lastKnownAuthTs = cache.data.timestamp_utc;
    }

    if (ageHours > CACHE_MAX_AGE_HOURS) {
      mode = 'STALE';
      reasonCode = REASONS.CACHE_STALE;
      why = reasonCode;
      next = 'CI=true npm run -s verify:mega';
      authoritative = false;
    } else if (cache.data.authoritative === 'true') {
      // P0 FIX: cross-validate TRUTH_CACHE filesystem claims against live disk.
      const cacheSaidCapsule = cache.data.capsule_present === 'true';
      const cacheSaidBoot = cache.data.bootstrapped_node_present === 'true';
      const filesystemMismatch = (cacheSaidCapsule && !hasCapsule) || (cacheSaidBoot && !hasBoot);
      if (filesystemMismatch) {
        mode = 'BLOCKED';
        reasonCode = REASONS.CACHE_STALE_FILESYSTEM;
        why = reasonCode;
        next = 'CI=true npm run -s verify:mega';
        authoritative = false;
      } else {
        mode = 'AUTHORITATIVE_PASS';
        reasonCode = REASONS.OK;
        why = REASONS.AUTHORITATIVE_PASS;
        next = 'npm run -s verify:mega:export';
        authoritative = true;
      }
    } else {
      mode = 'BLOCKED';
      reasonCode = cache.data.reason_code || REASONS.FAIL_NODE_POLICY;
      why = reasonCode;
      next = 'CI=true npm run -s verify:mega';
      authoritative = false;
    }
  }

  const whyHuman = WHY_TEXT[why] || why;

  return {
    mode, authoritative, reasonCode, next, whyHuman,
    lastKnownAuthTs, nodeHost: process.version, pinnedNode: pinned,
    hasCapsule, hasBoot, filesystemState, netClass: net.netClass, proxy,
  };
}

// P1-A: 13-field flight deck — mobile-first order.
// Most important fields (MODE, AUTHORITATIVE, REASON_CODE, NEXT_ACTION) are first.
export function doctorText(s) {
  return [
    `MODE=${s.mode}`,
    `AUTHORITATIVE=${s.authoritative}`,
    `REASON_CODE=${s.reasonCode}`,
    `NEXT_ACTION=${s.next}`,
    `WHY=${s.whyHuman}`,
    `LAST_KNOWN_AUTH_TS=${s.lastKnownAuthTs}`,
    `NODE_HOST=${s.nodeHost}`,
    `PINNED_NODE=${s.pinnedNode}`,
    `CAPSULE_PRESENT=${s.hasCapsule}`,
    `BOOTSTRAPPED_NODE_PRESENT=${s.hasBoot}`,
    `FILESYSTEM_STATE=${s.filesystemState}`,
    `NET_CLASS=${s.netClass}`,
    `PROXY=scheme:${s.proxy.scheme};shape_hash:${s.proxy.shape_hash}`,
  ].join('\n');
}

if (process.argv[1] === new URL(import.meta.url).pathname) process.stdout.write(`${doctorText(doctorState())}\n`);
