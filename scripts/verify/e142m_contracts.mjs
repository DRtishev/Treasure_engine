#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { FINAL_ROOT, REASONS, TRUTH_CACHE, writeMd } from './e142m_lib.mjs';
import { CAPSULE_TAR, BOOT_NODE } from './e141_lib.mjs';

const REQUIRED = ['SNAPSHOT.md','DOCTOR_FAST_OUTPUT.md','TRUTH_CACHE_SPEC.md','TRUTH_CACHE_README.md','AUTHORITY_MODEL.md','CAPSULE_INTEGRITY.md','PINNED_NODE_HEALTH.md','NET_CLASSIFICATION.md','BRIDGE_RUN.md','GATE_RUN.md','TRANSFER_EXPORT.md','TRANSFER_IMPORT.md','ACCEPTED.md','CONTRACTS.md','SEAL_X2.md','VERDICT.md','SHA256SUMS.md','RUNBOOK.md','RESEARCH_NOTES.md'];
const TOK = /(?:Bearer|token|api_key|apikey|password|secret|Authorization)\s*[=:]\s*\S+/i;
const RAW_PROXY = /https?:\/\/[a-zA-Z0-9._-]+:[0-9]{2,5}/;
const DOCTOR_FIELDS = ['MODE','WHY','NEXT_ACTION','NODE_HOST','PINNED_NODE','CAPSULE_PRESENT','BOOTSTRAPPED_NODE_PRESENT','AUTHORITATIVE','REASON_CODE','NET_CLASS','PROXY'];

function doctorSchemaOk(rawDoc) {
  const m = rawDoc.match(/```\n([\s\S]*?)\n```/);
  if (!m) return false;
  const lines = m[1].split('\n').filter(Boolean);
  if (lines.length !== DOCTOR_FIELDS.length) return false;
  for (let i = 0; i < DOCTOR_FIELDS.length; i += 1) if (!lines[i].startsWith(`${DOCTOR_FIELDS[i]}=`)) return false;
  const next = lines[2] || '';
  return next.startsWith('NEXT_ACTION=') && !next.includes('&&');
}

function cacheData() {
  if (!fs.existsSync(TRUTH_CACHE)) return null;
  const d = {};
  for (const l of fs.readFileSync(TRUTH_CACHE, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^-\s([a-z0-9_]+):\s*(.*)$/i);
    if (m) d[m[1]] = m[2].trim();
  }
  return d;
}

export function runContracts() {
  const files = fs.existsSync(FINAL_ROOT) ? fs.readdirSync(FINAL_ROOT) : [];
  let md = true, hdr = true, red = true, schema = true, lock = true;
  const det = [];

  for (const f of files) if (!f.endsWith('.md')) { md = false; det.push(`non_md:${f}`); }
  for (const f of REQUIRED) {
    const p = path.join(FINAL_ROOT, f);
    if (!fs.existsSync(p)) { hdr = false; det.push(`missing:${f}`); continue; }
    const c = fs.readFileSync(p, 'utf8');
    if (!c.startsWith('# FINAL_MEGA ')) { hdr = false; det.push(`header:${f}`); }
    if (f !== 'SHA256SUMS.md' && !c.includes('## RAW')) { hdr = false; det.push(`raw:${f}`); }
    if (TOK.test(c) || RAW_PROXY.test(c)) { red = false; det.push(`redaction:${f}`); }
    if (f === 'DOCTOR_FAST_OUTPUT.md' && !doctorSchemaOk(c)) { schema = false; det.push('doctor_schema'); }
  }

  const cache = cacheData();
  if (!cache) { lock = false; det.push('missing_truth_cache'); }
  if (cache && cache.authoritative === 'true') {
    // Contract: all authority chain fields must be consistent with authoritative=true
    if (!(cache.bridge_ec === '0' && cache.rep_gate_ec === '0' && cache.pinned_node_health_ok === 'true' && cache.capsule_sha256_ok === 'true')) {
      lock = false; det.push('authority_lock');
    }
    // Contract: filesystem artifacts claimed present must still exist
    if (cache.capsule_present === 'true' && !fs.existsSync(CAPSULE_TAR)) { lock = false; det.push('authority_filesystem_capsule_gone'); }
    if (cache.bootstrapped_node_present === 'true' && !fs.existsSync(BOOT_NODE)) { lock = false; det.push('authority_filesystem_boot_gone'); }
  }

  const bridgeRunPath = path.join(FINAL_ROOT, 'BRIDGE_RUN.md');
  const gateRunPath = path.join(FINAL_ROOT, 'GATE_RUN.md');
  const verdictPath = path.join(FINAL_ROOT, 'VERDICT.md');

  const bridgeOk = fs.existsSync(bridgeRunPath) && /- command: /.test(fs.readFileSync(bridgeRunPath,'utf8')) && /- ec: /.test(fs.readFileSync(bridgeRunPath,'utf8'));
  if (!bridgeOk) { lock = false; det.push('bridge_contract'); }

  // Contract: if VERDICT claims authoritative=true, BRIDGE_RUN and GATE_RUN must both show ec:0
  if (fs.existsSync(verdictPath) && /- authoritative: true/.test(fs.readFileSync(verdictPath,'utf8'))) {
    const bridgeTxt = fs.existsSync(bridgeRunPath) ? fs.readFileSync(bridgeRunPath,'utf8') : '';
    const gateTxt = fs.existsSync(gateRunPath) ? fs.readFileSync(gateRunPath,'utf8') : '';
    if (!/- ec: 0/.test(bridgeTxt)) { lock = false; det.push('verdict_authority_bridge_ec_mismatch'); }
    if (!/- ec: 0/.test(gateTxt)) { lock = false; det.push('verdict_authority_gate_ec_mismatch'); }
  }

  const pass = md && hdr && red && schema && lock;
  writeMd(path.join(FINAL_ROOT, 'CONTRACTS.md'), ['# FINAL_MEGA CONTRACTS',`- status: ${pass?'PASS':'FAIL'}`,`- md_only: ${md?'PASS':'FAIL'}`,`- redaction: ${red?'PASS':'FAIL'}`,`- header_exactness: ${hdr?'PASS':'FAIL'}`,`- doctor_schema: ${schema?'PASS':'FAIL'}`,`- authority_lock: ${lock?'PASS':'FAIL'}`,`- reason_code: ${pass?REASONS.OK:REASONS.FAIL_DOCTOR_SCHEMA}`,'## RAW',...det.map((d)=>`- ${d}`)].join('\n'));
  return { ec: pass ? 0 : 1 };
}
if (process.argv[1] === new URL(import.meta.url).pathname) process.exit(runContracts().ec);
