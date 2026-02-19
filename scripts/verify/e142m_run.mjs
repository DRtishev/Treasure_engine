#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { sha256File } from './e66_lib.mjs';
import { CACHE_MAX_AGE_HOURS, FINAL_ROOT, REASONS, ROOT, TRUTH_CACHE, run, writeMd } from './e142m_lib.mjs';
import { doctorState, doctorText } from './e142m_doctor.mjs';
import { runAcquire } from './e141_node_acquire.mjs';
import { BOOT_NODE, BOOT_DIR, CAPSULE_NAME, CAPSULE_TAR, PIN, PINNED_SHA } from './e141_lib.mjs';
import { runBootstrap } from './e141_node_bootstrap.mjs';
import { execWithPinned } from './e141_exec_with_pinned_node.mjs';
import { classifyNet } from './e142m_network_classify.mjs';
import { runExport } from './e142m_export.mjs';
import { runImport } from './e142m_import.mjs';
import { runContracts } from './e142m_contracts.mjs';
import { runSeal } from './e142m_seal_x2.mjs';

const probe = process.argv.includes('--probe');
fs.mkdirSync(ROOT, { recursive: true });
fs.mkdirSync(FINAL_ROOT, { recursive: true });

// write:true populates E142_MEGA/NET_CLASSIFICATION.md and NETWORK_CLASSIFICATION.md
const net = classifyNet({ write: true });
let acq = { ec: 0 }, boot = { ec: 0 }, bridge = { ec: 1 }, rep = { ec: 1 };
if (!probe) {
  acq = runAcquire();
  boot = runBootstrap({ probe: false });
  if (boot.ec === 0) {
    bridge = execWithPinned(['-v']);
    rep = execWithPinned(['scripts/verify/e137_run.mjs']);
  }
}

const capPresent = fs.existsSync(CAPSULE_TAR);
const capNameOk = path.basename(CAPSULE_TAR) === CAPSULE_NAME;
const capSha = capPresent ? sha256File(CAPSULE_TAR) : 'NA';
const capShaOk = !capPresent ? false : capSha === PINNED_SHA;
const capPlatformOk = BOOT_DIR.includes(`v${PIN}`);
const pinV = fs.existsSync(BOOT_NODE) ? run(BOOT_NODE, ['-v']) : { ec: 1, out: 'ABSENT' };
const pinHealthOk = pinV.ec === 0 && /^v\d+\./.test(pinV.out || '');
const authoritative = !probe && capShaOk && pinHealthOk && bridge.ec === 0 && rep.ec === 0;
const reasonCode = authoritative ? REASONS.OK : (probe ? REASONS.PROBE_ONLY_NON_AUTHORITATIVE : (capPresent ? REASONS.FAIL_NODE_POLICY : REASONS.NEED_NODE_TARBALL));
const status = authoritative ? 'PASS' : (probe ? 'PROBE' : 'BLOCKED');

// Write MEGA_VERDICT.md to ROOT so E142_MEGA stays consistent with TRUTH_CACHE.
writeMd(path.join(ROOT, 'MEGA_VERDICT.md'), [
  '# E142_MEGA MEGA VERDICT',
  `- status: ${status}`,
  `- authoritative: ${authoritative}`,
  `- reason_code: ${reasonCode}`,
  `- net_class: ${net.netClass}`,
  '## RAW',
  `- bridge_ec: ${bridge.ec}`,
  `- representative_ec: ${rep.ec}`,
  `- probe: ${probe}`,
].join('\n'));

// P0 FIX: Fail-closed — write TRUTH_CACHE ONLY when authoritative=true.
// Probe or non-authoritative runs must NOT overwrite a valid authoritative cache.
// This prevents a probe run from destroying evidence of a prior authoritative pass.
if (authoritative) {
  writeMd(TRUTH_CACHE, [
    '# E142_MEGA TRUTH CACHE',
    '- schema_version: 1',
    `- timestamp_utc: ${new Date().toISOString()}`,
    `- pinned_node_version: ${pinV.ec === 0 ? pinV.out : 'ABSENT'}`,
    `- capsule_present: ${capPresent}`,
    `- capsule_sha256_ok: ${capShaOk}`,
    `- bootstrapped_node_present: ${fs.existsSync(BOOT_NODE)}`,
    `- pinned_node_health_ok: ${pinHealthOk}`,
    `- bridge_ec: ${bridge.ec}`,
    `- rep_gate_ec: ${rep.ec}`,
    `- authoritative: ${authoritative}`,
    `- reason_code: ${reasonCode}`,
    '## RAW',
    `- cache_max_age_hours: ${CACHE_MAX_AGE_HOURS}`,
  ].join('\n'));
}

const d = doctorState();
const doctorOut = doctorText(d);

const snapshot = [
  '# FINAL_MEGA SNAPSHOT',
  `- date_utc: ${new Date().toISOString()}`,
  `- branch: ${run('git',['rev-parse','--abbrev-ref','HEAD']).out}`,
  `- head: ${run('git',['rev-parse','--short','HEAD']).out}`,
  `- node_host: ${process.version}`,
  '## RAW',
  `- probe: ${probe}`,
].join('\n');
writeMd(path.join(FINAL_ROOT, 'SNAPSHOT.md'), snapshot);

writeMd(path.join(FINAL_ROOT, 'DOCTOR_FAST_OUTPUT.md'), ['# FINAL_MEGA DOCTOR FAST OUTPUT','## RAW','```',doctorOut,'```'].join('\n'));
writeMd(path.join(FINAL_ROOT, 'TRUTH_CACHE_SPEC.md'), ['# FINAL_MEGA TRUTH CACHE SPEC','- schema_version: 1','- required_keys: schema_version|timestamp_utc|pinned_node_version|capsule_present|capsule_sha256_ok|bootstrapped_node_present|pinned_node_health_ok|bridge_ec|rep_gate_ec|authoritative|reason_code','## RAW',`- cache_path: ${TRUTH_CACHE}`].join('\n'));
writeMd(path.join(FINAL_ROOT, 'TRUTH_CACHE_README.md'), ['# FINAL_MEGA TRUTH CACHE README','- source_of_truth: reports/evidence/E142_MEGA/TRUTH_CACHE.md','- staleness_policy_hours: 24','## RAW',`- cache_present: ${fs.existsSync(TRUTH_CACHE)}`].join('\n'));
writeMd(path.join(FINAL_ROOT, 'CAPSULE_INTEGRITY.md'), ['# FINAL_MEGA CAPSULE INTEGRITY',`- status: ${capShaOk && capNameOk && capPlatformOk ? 'PASS':'FAIL'}`,`- reason_code: ${capShaOk && capNameOk && capPlatformOk ? REASONS.OK:REASONS.FAIL_CAPSULE_INTEGRITY}`,'## RAW',`- capsule_present: ${capPresent}`,`- capsule_filename_ok: ${capNameOk}`,`- capsule_sha256: ${capSha}`,`- capsule_sha256_ok: ${capShaOk}`,`- platform_ok: ${capPlatformOk}`].join('\n'));
writeMd(path.join(FINAL_ROOT, 'PINNED_NODE_HEALTH.md'), ['# FINAL_MEGA PINNED NODE HEALTH',`- status: ${pinHealthOk?'PASS':'FAIL'}`,`- reason_code: ${pinHealthOk?REASONS.OK:REASONS.FAIL_NODE_POLICY}`,'## RAW',`- node_bin: ${fs.existsSync(BOOT_NODE)?BOOT_NODE:'NA'}`,`- exec_ec: ${pinV.ec}`,`- node_v: ${pinV.out}`].join('\n'));
writeMd(path.join(FINAL_ROOT, 'NET_CLASSIFICATION.md'), ['# FINAL_MEGA NET CLASSIFICATION',`- net_class: ${net.netClass}`,`- reason_code: ${net.reason}`,'## RAW','- classes: OFFLINE|PROXY_ONLY|ONLINE_LIMITED|ONLINE_OK','- reason_codes: E_PROXY_BLOCK|E_TLS_INTERCEPT|E_WS_BLOCKED|E_DNS_FILTERED'].join('\n'));
writeMd(path.join(FINAL_ROOT, 'BRIDGE_RUN.md'), ['# FINAL_MEGA BRIDGE RUN',`- command: ${fs.existsSync(BOOT_NODE)?`${BOOT_NODE} -v`:'NA'}`,`- ec: ${bridge.ec}`,'## RAW',`- out: ${bridge.out||bridge.err||'NA'}`].join('\n'));
writeMd(path.join(FINAL_ROOT, 'GATE_RUN.md'), ['# FINAL_MEGA GATE RUN',`- command: ${fs.existsSync(BOOT_NODE)?`${BOOT_NODE} scripts/verify/e137_run.mjs`:'NA'}`,`- ec: ${rep.ec}`,'## RAW',`- out: ${rep.out||rep.err||'NA'}`].join('\n'));

// runExport writes TRANSFER_EXPORT.md; runImport writes TRANSFER_IMPORT.md and ACCEPTED.md.
// Do NOT overwrite them here — the export/import functions produce the canonical content.
const ex = runExport();
const im = runImport();

writeMd(path.join(FINAL_ROOT, 'RUNBOOK.md'), ['# FINAL_MEGA RUNBOOK','## One Command Flow','- run: npm run -s doctor','- then: run NEXT_ACTION exactly once','## If BLOCKED/CACHE_MISSING','- CI=true npm run -s verify:mega','## If STALE','- CI=true npm run -s verify:mega','## If CACHE_STALE_FILESYSTEM','- CI=true npm run -s verify:mega','## If FAIL_NODE_CAPSULE','- place capsule at artifacts/incoming/node/ and rerun verify:mega','## RAW',`- next_action: ${d.next}`].join('\n'));

writeMd(path.join(FINAL_ROOT, 'AUTHORITY_MODEL.md'), [
  '# FINAL_MEGA AUTHORITY MODEL',
  '## Chain (all must pass for authoritative=true)',
  '- step_1: capsule_present=true AND capsule_sha256_ok=true (supply chain integrity)',
  '- step_2: bootstrapped_node_present=true AND pinned_node_health_ok=true (pinned runtime)',
  '- step_3: bridge_ec=0 (pinned node -v via execWithPinned)',
  '- step_4: rep_gate_ec=0 (scripts/verify/e137_run.mjs via pinned node)',
  '- step_5: authoritative=true written to TRUTH_CACHE (fail-closed: only on full pass)',
  '## Doctor Cross-Validation',
  '- doctor reads TRUTH_CACHE and cross-checks capsule_present+bootstrapped_node_present vs live filesystem',
  '- if filesystem artifacts gone since cache was written: BLOCKED/CACHE_STALE_FILESYSTEM',
  '## Probe Mode',
  '- probe=true skips all acquisition; authoritative always false; TRUTH_CACHE NOT written',
  '## Fail-Closed Rules',
  '- TRUTH_CACHE written ONLY when authoritative=true',
  '- doctor NEVER triggers heavy execution',
  '- network tests require ENABLE_NET=1 AND I_UNDERSTAND_LIVE_RISK=1',
  '## RAW',
  `- authoritative: ${authoritative}`,
  `- reason_code: ${reasonCode}`,
  `- bridge_ec: ${bridge.ec}`,
  `- rep_gate_ec: ${rep.ec}`,
  `- capsule_sha256_ok: ${capShaOk}`,
  `- pinned_node_health_ok: ${pinHealthOk}`,
].join('\n'));

writeMd(path.join(FINAL_ROOT, 'RESEARCH_NOTES.md'), [
  '# FINAL_MEGA RESEARCH NOTES',
  '## Supply Chain Integrity (SLSA concepts)',
  '- Capsule (node tarball) is pinned by SHA256 (PINNED_SHA in e141_lib.mjs) — unspoofable identity.',
  '- All authority claims require capsule_sha256_ok=true; partial-hash matches are rejected.',
  '- Bootstrapped node binary is derived from the verified capsule — no host node used for authority.',
  '- TRUTH_CACHE written fail-closed: only on full authoritative pass, never on probe/partial.',
  '## Deterministic Builds & Reproducible Evidence',
  '- All evidence files are md-only with fixed schemas and fixed key order.',
  '- SHA256SUMS.md is rewritten deterministically (sorted filenames) after every run.',
  '- SEAL_X2.md records a fingerprint of all non-seal evidence files (excl. SHA256SUMS.md, SEAL_X2.md).',
  '- verifySums() verifies every hash at write time — no stale-hash drift.',
  '## Node Proxy/Network Pitfalls',
  '- undici and ws both require explicit proxy configuration (HTTPS_PROXY env var).',
  '- Proxy presence is detected and redacted to shape_hash (first 16 hex chars of sha256(host:port)).',
  '- Raw proxy URL never written to any evidence file — enforced by redaction contract.',
  '- Network tests strictly flag-gated: ENABLE_NET=1 + I_UNDERSTAND_LIVE_RISK=1 required.',
  '- Default mode is OFFLINE; PROXY_ONLY when proxy detected without flags.',
  '## Doctor Fast-Path Safety',
  '- Doctor is read-only cache consumer — no subprocess spawning, no network, no capsule downloads.',
  '- Doctor cross-validates TRUTH_CACHE filesystem claims vs live disk — prevents hallucinated PASS.',
  '- CACHE_STALE_FILESYSTEM reason code: capsule or boot node disappeared after authoritative cache was written.',
  '## RAW',
  '- research_version: 1',
  '- applies_to: E142_MEGA authority model, FINAL_MEGA evidence bundle',
].join('\n'));

const contracts = runContracts();
const seal = runSeal();
writeMd(path.join(FINAL_ROOT, 'VERDICT.md'), ['# FINAL_MEGA VERDICT',`- status: ${status}`,`- authoritative: ${authoritative}`,`- reason_code: ${reasonCode}`,'## RAW',`- contracts_ec: ${contracts.ec}`,`- seal_ec: ${seal.ec}`].join('\n'));

rewriteSums(FINAL_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
const rows = verifySums(path.join(FINAL_ROOT, 'SHA256SUMS.md'), ['reports/evidence/FINAL_MEGA/SHA256SUMS.md']);
writeMd(path.join(FINAL_ROOT, 'VERDICT.md'), ['# FINAL_MEGA VERDICT',`- status: ${status}`,`- authoritative: ${authoritative}`,`- reason_code: ${reasonCode}`,'- sha_rows_verified: '+rows,'## RAW',`- contracts_ec: ${contracts.ec}`,`- seal_ec: ${seal.ec}`].join('\n'));
rewriteSums(FINAL_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
verifySums(path.join(FINAL_ROOT, 'SHA256SUMS.md'), ['reports/evidence/FINAL_MEGA/SHA256SUMS.md']);

if (!probe && status !== 'PASS') process.exit(1);
process.exit(0);
