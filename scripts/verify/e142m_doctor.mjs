#!/usr/bin/env node
import fs from 'node:fs';
import { BOOT_NODE, CAPSULE_TAR } from './e141_lib.mjs';
import { CACHE_MAX_AGE_HOURS, REASONS, TRUTH_CACHE, proxyRedacted } from './e142m_lib.mjs';
import { classifyNet } from './e142m_network_classify.mjs';

const REQUIRED_CACHE_KEYS = ['schema_version','timestamp_utc','pinned_node_version','capsule_present','capsule_sha256_ok','bootstrapped_node_present','pinned_node_health_ok','bridge_ec','rep_gate_ec','authoritative','reason_code'];

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
  let next = cache.why === REASONS.CACHE_INVALID ? 'npm run -s verify:mega:contracts' : 'CI=true npm run -s verify:mega';
  let authoritative = false;
  let reasonCode = cache.why;
  let pinned = hasBoot ? 'READY/UNKNOWN' : 'ABSENT';

  if (cache.ok) {
    const ts = Date.parse(cache.data.timestamp_utc || '');
    const ageHours = Number.isFinite(ts) ? Math.floor((Date.now() - ts) / 3600000) : (CACHE_MAX_AGE_HOURS + 1);
    pinned = hasBoot ? `READY/${cache.data.pinned_node_version}` : 'ABSENT';
    if (ageHours > CACHE_MAX_AGE_HOURS) {
      mode = 'STALE';
      why = REASONS.CACHE_STALE;
      next = 'CI=true npm run -s verify:mega';
      authoritative = false;
      reasonCode = REASONS.CACHE_STALE;
    } else if (cache.data.authoritative === 'true') {
      mode = 'AUTHORITATIVE_PASS';
      why = REASONS.AUTHORITATIVE_PASS;
      next = 'npm run -s verify:mega:export';
      authoritative = true;
      reasonCode = REASONS.OK;
    } else {
      mode = 'BLOCKED';
      why = cache.data.reason_code || REASONS.FAIL_NODE_POLICY;
      next = 'CI=true npm run -s verify:mega';
      authoritative = false;
      reasonCode = cache.data.reason_code || REASONS.FAIL_NODE_POLICY;
    }
  }

  return { mode, why, next, nodeHost: process.version, pinnedNode: pinned, hasCapsule, hasBoot, authoritative, reasonCode, netClass: net.netClass, proxy };
}

export function doctorText(s) {
  return [
    `MODE=${s.mode}`,
    `WHY=${s.why}`,
    `NEXT_ACTION=${s.next}`,
    `NODE_HOST=${s.nodeHost}`,
    `PINNED_NODE=${s.pinnedNode}`,
    `CAPSULE_PRESENT=${s.hasCapsule}`,
    `BOOTSTRAPPED_NODE_PRESENT=${s.hasBoot}`,
    `AUTHORITATIVE=${s.authoritative}`,
    `REASON_CODE=${s.reasonCode}`,
    `NET_CLASS=${s.netClass}`,
    `PROXY=scheme:${s.proxy.scheme};shape_hash:${s.proxy.shape_hash}`,
  ].join('\n');
}

if (process.argv[1] === new URL(import.meta.url).pathname) process.stdout.write(`${doctorText(doctorState())}\n`);
