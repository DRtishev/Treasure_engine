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

// P0-A: Clean-room guarantee — wipe FINAL_ROOT .md files before writing evidence.
// No outcome may depend on leftover files from a prior run.
// Scope: ONLY .md files in FINAL_ROOT. Never touches ROOT, archives, or anything outside.
fs.mkdirSync(FINAL_ROOT, { recursive: true });
for (const f of fs.readdirSync(FINAL_ROOT)) {
  if (f.endsWith('.md')) fs.rmSync(path.join(FINAL_ROOT, f));
}

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
const capIntegrity = capPresent && capShaOk && capNameOk && capPlatformOk;
const pinV = fs.existsSync(BOOT_NODE) ? run(BOOT_NODE, ['-v']) : { ec: 1, out: 'ABSENT' };
const pinHealthOk = pinV.ec === 0 && /^v\d+\./.test(pinV.out || '');
const authoritative = !probe && capShaOk && pinHealthOk && bridge.ec === 0 && rep.ec === 0;

// P0-E: Granular reason codes — root cause first.
const reasonCode = authoritative
  ? REASONS.OK
  : probe
    ? REASONS.PROBE_ONLY_NON_AUTHORITATIVE
    : !capPresent
      ? REASONS.NEED_NODE_TARBALL
      : !capIntegrity
        ? REASONS.FAIL_CAPSULE_INTEGRITY
        : boot.ec !== 0
          ? REASONS.NEED_BOOTSTRAP
          : !pinHealthOk
            ? REASONS.FAIL_PINNED_NODE_HEALTH
            : REASONS.FAIL_NODE_POLICY;

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

// Fail-closed: TRUTH_CACHE written ONLY when authoritative=true.
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

// P0-D: Enhanced SNAPSHOT — includes git dirty state for unspoofable source identity.
const gitBranch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
const gitHead = run('git', ['rev-parse', 'HEAD']);
const gitShort = run('git', ['rev-parse', '--short', 'HEAD']);
const gitDirty = run('git', ['status', '--porcelain']);
const headIdentity = gitHead.ec === 0 ? gitHead.out : 'HEAD_UNAVAILABLE';
const dirtyState = gitDirty.ec === 0 ? (gitDirty.out.trim() ? 'DIRTY' : 'CLEAN') : 'UNKNOWN';

writeMd(path.join(FINAL_ROOT, 'SNAPSHOT.md'), [
  '# FINAL_MEGA SNAPSHOT',
  `- date_utc: ${new Date().toISOString()}`,
  `- branch: ${gitBranch.out || 'UNKNOWN'}`,
  `- head_short: ${gitShort.out || 'UNKNOWN'}`,
  `- node_host: ${process.version}`,
  `- probe: ${probe}`,
  '## RAW',
  `- head_full: ${headIdentity}`,
  `- tree_state: ${dirtyState}`,
  `- pwd: ${process.cwd()}`,
].join('\n'));

writeMd(path.join(FINAL_ROOT, 'DOCTOR_FAST_OUTPUT.md'), [
  '# FINAL_MEGA DOCTOR FAST OUTPUT',
  '## RAW',
  '```',
  doctorOut,
  '```',
].join('\n'));

writeMd(path.join(FINAL_ROOT, 'TRUTH_CACHE_SPEC.md'), [
  '# FINAL_MEGA TRUTH CACHE SPEC',
  '- schema_version: 1',
  '- required_keys: schema_version|timestamp_utc|pinned_node_version|capsule_present|capsule_sha256_ok|bootstrapped_node_present|pinned_node_health_ok|bridge_ec|rep_gate_ec|authoritative|reason_code',
  '## RAW',
  `- cache_path: ${TRUTH_CACHE}`,
].join('\n'));

writeMd(path.join(FINAL_ROOT, 'TRUTH_CACHE_README.md'), [
  '# FINAL_MEGA TRUTH CACHE README',
  '- source_of_truth: reports/evidence/E142_MEGA/TRUTH_CACHE.md',
  '- staleness_policy_hours: 24',
  '## RAW',
  `- cache_present: ${fs.existsSync(TRUTH_CACHE)}`,
].join('\n'));

writeMd(path.join(FINAL_ROOT, 'CAPSULE_INTEGRITY.md'), [
  '# FINAL_MEGA CAPSULE INTEGRITY',
  `- status: ${capIntegrity ? 'PASS' : 'FAIL'}`,
  `- reason_code: ${capIntegrity ? REASONS.OK : (!capPresent ? REASONS.NEED_NODE_TARBALL : REASONS.FAIL_CAPSULE_INTEGRITY)}`,
  '## RAW',
  `- capsule_present: ${capPresent}`,
  `- capsule_filename_ok: ${capNameOk}`,
  `- capsule_sha256: ${capSha}`,
  `- capsule_sha256_ok: ${capShaOk}`,
  `- platform_ok: ${capPlatformOk}`,
].join('\n'));

writeMd(path.join(FINAL_ROOT, 'PINNED_NODE_HEALTH.md'), [
  '# FINAL_MEGA PINNED NODE HEALTH',
  `- status: ${pinHealthOk ? 'PASS' : 'FAIL'}`,
  `- reason_code: ${pinHealthOk ? REASONS.OK : REASONS.FAIL_PINNED_NODE_HEALTH}`,
  '## RAW',
  `- node_bin: ${fs.existsSync(BOOT_NODE) ? BOOT_NODE : 'NA'}`,
  `- exec_ec: ${pinV.ec}`,
  `- node_v: ${pinV.out}`,
].join('\n'));

writeMd(path.join(FINAL_ROOT, 'NET_CLASSIFICATION.md'), [
  '# FINAL_MEGA NET CLASSIFICATION',
  `- net_class: ${net.netClass}`,
  `- reason_code: ${net.reason}`,
  '## RAW',
  '- classes: OFFLINE|PROXY_ONLY|ONLINE_LIMITED|ONLINE_OK',
  '- reason_codes: E_PROXY_BLOCK|E_TLS_INTERCEPT|E_WS_BLOCKED|E_DNS_FILTERED',
].join('\n'));

writeMd(path.join(FINAL_ROOT, 'BRIDGE_RUN.md'), [
  '# FINAL_MEGA BRIDGE RUN',
  `- command: ${fs.existsSync(BOOT_NODE) ? `${BOOT_NODE} -v` : 'NA'}`,
  `- ec: ${bridge.ec}`,
  '## RAW',
  `- out: ${bridge.out || bridge.err || 'NA'}`,
].join('\n'));

writeMd(path.join(FINAL_ROOT, 'GATE_RUN.md'), [
  '# FINAL_MEGA GATE RUN',
  `- command: ${fs.existsSync(BOOT_NODE) ? `${BOOT_NODE} scripts/verify/e137_run.mjs` : 'NA'}`,
  `- ec: ${rep.ec}`,
  '## RAW',
  `- out: ${rep.out || rep.err || 'NA'}`,
].join('\n'));

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
  '- Bootstrapped node binary is derived from the verified capsule — host node NOT used for authority.',
  '- TRUTH_CACHE written fail-closed: only on full authoritative pass, never on probe/partial run.',
  '- npm ci (not npm install) enforced in CI — ensures lockfile-pinned dependency tree.',
  '- SLSA L1 concept applied: pinned SHA256 of Node.js binary = artifact provenance anchor.',
  '## Deterministic Builds & Reproducible Evidence',
  '- All evidence files are md-only with fixed schemas, fixed key order, Unix LF endings.',
  '- SHA256SUMS.md is rewritten deterministically (sorted filenames) after every run.',
  '- SEAL_X2.md records a fingerprint of all non-seal evidence files (excl. SHA256SUMS.md, SEAL_X2.md).',
  '- verifySums() verifies every hash inline at write time — no stale-hash drift possible.',
  '- Timestamps are ISO8601 UTC — no locale-dependent formatting.',
  '## Node Proxy/Network Pitfalls (undici + ws)',
  '- undici ProxyAgent does NOT verify HTTPS certs via HTTP CONNECT proxies (CVE-2022-32210, fixed >=5.5.1).',
  '- undici has no built-in offline mode — use fs module for local reads, not fetch, in offline evidence generation.',
  '- WebSocket (ws) connections are full-duplex streaming; cannot be served offline; code 1006 on incomplete close frames.',
  '- Proxy detected via HTTPS_PROXY/https_proxy env vars; redacted to shape_hash before any evidence write.',
  '- Raw proxy URL NEVER written to evidence — enforced by redaction contract in e142m_contracts.mjs.',
  '- Network tests flag-gated: ENABLE_NET=1 + I_UNDERSTAND_LIVE_RISK=1 required. Default = OFFLINE.',
  '- PROXY_ONLY: proxy detected but net flags absent → no live requests, mode written to evidence.',
  '## Doctor Fast-Path Safety',
  '- Doctor is read-only cache consumer — no subprocess spawning, no network, no capsule downloads.',
  '- Doctor cross-validates TRUTH_CACHE filesystem claims vs live disk — prevents hallucinated PASS.',
  '- CACHE_STALE_FILESYSTEM: capsule or boot node disappeared after authoritative cache was written.',
  '- NEXT_ACTION always a single copy-paste command; no && chains permitted (contract-enforced).',
  '## RAW',
  '- research_version: 2',
  '- applies_to: E142_MEGA authority model, FINAL_MEGA evidence bundle',
  '- sources: SLSA spec v1.0, reproducible-builds.org, undici CVE-2022-32210, undici GitHub issues',
].join('\n'));

// P1-D: Evidence index — curated map of all FINAL_MEGA files.
writeMd(path.join(FINAL_ROOT, 'INDEX.md'), [
  '# FINAL_MEGA INDEX',
  '## Identity & State',
  '- SNAPSHOT.md          — run identity: branch, HEAD, node version, git tree state',
  '- VERDICT.md           — final run verdict: PASS/PROBE/BLOCKED + authoritative + reason',
  '## Authority Chain',
  '- AUTHORITY_MODEL.md   — 5-step authority chain definition + fail-closed rules',
  '- TRUTH_CACHE_SPEC.md  — schema spec for TRUTH_CACHE (required keys)',
  '- TRUTH_CACHE_README.md — pointer to canonical TRUTH_CACHE location + staleness policy',
  '- CAPSULE_INTEGRITY.md — capsule SHA256 pin verification result',
  '- PINNED_NODE_HEALTH.md — bootstrapped pinned-node exec health check',
  '- BRIDGE_RUN.md        — pinned node -v bridge run result + EC',
  '- GATE_RUN.md          — representative gate (e137_run.mjs) run result + EC',
  '## Doctor Output',
  '- DOCTOR_FAST_OUTPUT.md — read-only doctor snapshot (captured during this run)',
  '## Network',
  '- NET_CLASSIFICATION.md — offline/proxy/online mode + reason code',
  '## Transfer Chain',
  '- TRANSFER_EXPORT.md   — evidence archive path + sha256 + tar EC',
  '- TRANSFER_IMPORT.md   — import verification: sha256 expected vs actual',
  '- ACCEPTED.md          — final transfer acceptance status',
  '## Contracts & Integrity',
  '- CONTRACTS.md         — all contract checks: md_only, redaction, headers, schema, authority',
  '- SEAL_X2.md           — deterministic fingerprint of evidence (fp1=fp2 parity)',
  '- SHA256SUMS.md        — sha256 of every file; verify with: sha256sum -c',
  '## Operator Docs',
  '- RUNBOOK.md           — mobile-first operator guide: failure codes + exact actions',
  '- RESEARCH_NOTES.md    — supply chain, determinism, proxy pitfalls reference',
  '## RAW',
  `- index_files: ${[
    'SNAPSHOT.md','VERDICT.md','AUTHORITY_MODEL.md','TRUTH_CACHE_SPEC.md',
    'TRUTH_CACHE_README.md','CAPSULE_INTEGRITY.md','PINNED_NODE_HEALTH.md',
    'BRIDGE_RUN.md','GATE_RUN.md','DOCTOR_FAST_OUTPUT.md','NET_CLASSIFICATION.md',
    'TRANSFER_EXPORT.md','TRANSFER_IMPORT.md','ACCEPTED.md','CONTRACTS.md',
    'SEAL_X2.md','SHA256SUMS.md','RUNBOOK.md','RESEARCH_NOTES.md','INDEX.md',
  ].join('|')}`,
].join('\n'));

writeMd(path.join(FINAL_ROOT, 'RUNBOOK.md'), [
  '# FINAL_MEGA RUNBOOK',
  '## Step 1 — Read the flight deck',
  '```',
  'npm run -s doctor',
  '```',
  '## Step 2 — Run NEXT_ACTION exactly once',
  '- Copy NEXT_ACTION from doctor output. Run it.',
  '- Expect: MODE=AUTHORITATIVE_PASS after full success.',
  '## Failure Codes & Actions',
  '| REASON_CODE             | What happened                        | Action                                    |',
  '|-------------------------|--------------------------------------|-------------------------------------------|',
  '| CACHE_MISSING           | No truth cache yet                   | CI=true npm run -s verify:mega            |',
  '| CACHE_STALE             | Cache >24h old                       | CI=true npm run -s verify:mega            |',
  '| CACHE_STALE_FILESYSTEM  | Capsule/boot gone since last auth    | CI=true npm run -s verify:mega            |',
  '| NEED_NODE_TARBALL       | Capsule file missing                 | Place capsule → CI=true npm run -s verify:mega |',
  '| FAIL_CAPSULE_INTEGRITY  | Capsule present but SHA256 mismatch  | Replace capsule → CI=true npm run -s verify:mega |',
  '| NEED_BOOTSTRAP          | Bootstrap failed                     | CI=true npm run -s verify:mega            |',
  '| FAIL_PINNED_NODE_HEALTH | Pinned node unhealthy                | CI=true npm run -s verify:mega            |',
  '| FAIL_NODE_POLICY        | Bridge/gate failed                   | CI=true npm run -s verify:mega            |',
  '| PROBE_ONLY_NON_AUTH     | Probe run (no acquisition)           | CI=true npm run -s verify:mega            |',
  '## Capsule Placement',
  '```',
  'ls artifacts/incoming/node/   # must contain the capsule tarball',
  'CI=true npm run -s verify:mega',
  '```',
  '## Probe Mode',
  '- Probe skips acquisition (no capsule download, no bootstrap, no bridge/gate).',
  '- TRUTH_CACHE is NEVER overwritten in probe mode.',
  '- Probe exits 0 regardless; use for smoke-testing evidence pipeline only.',
  '## Clean Evidence (what it means)',
  '- Every verify:mega run cleans FINAL_MEGA .md files before writing.',
  '- No outcome depends on leftover evidence from prior runs.',
  '- TRUTH_CACHE (in E142_MEGA/) is NOT cleaned — it persists until an authoritative run overwrites it.',
  '## Optional Online Acquire',
  '```',
  'ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1 ONLINE_OPTIONAL=1 CI=true npm run -s verify:mega',
  '```',
  '## RAW',
  `- next_action: ${d.next}`,
].join('\n'));

// Export/import AFTER all base evidence files are written (so the archive is complete).
const ex = runExport();
const im = runImport();

const contracts = runContracts();
const seal = runSeal();

// Write VERDICT without sha_rows_verified first (to include in sums computation).
writeMd(path.join(FINAL_ROOT, 'VERDICT.md'), [
  '# FINAL_MEGA VERDICT',
  `- status: ${status}`,
  `- authoritative: ${authoritative}`,
  `- reason_code: ${reasonCode}`,
  '## RAW',
  `- contracts_ec: ${contracts.ec}`,
  `- seal_ec: ${seal.ec}`,
].join('\n'));

// Compute sums, verify, then update VERDICT with the verified row count.
rewriteSums(FINAL_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
const rows = verifySums(path.join(FINAL_ROOT, 'SHA256SUMS.md'), ['reports/evidence/FINAL_MEGA/SHA256SUMS.md']);
writeMd(path.join(FINAL_ROOT, 'VERDICT.md'), [
  '# FINAL_MEGA VERDICT',
  `- status: ${status}`,
  `- authoritative: ${authoritative}`,
  `- reason_code: ${reasonCode}`,
  `- sha_rows_verified: ${rows}`,
  '## RAW',
  `- contracts_ec: ${contracts.ec}`,
  `- seal_ec: ${seal.ec}`,
].join('\n'));
// Final sums rewrite to capture updated VERDICT hash.
rewriteSums(FINAL_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
verifySums(path.join(FINAL_ROOT, 'SHA256SUMS.md'), ['reports/evidence/FINAL_MEGA/SHA256SUMS.md']);

if (!probe && status !== 'PASS') process.exit(1);
process.exit(0);
