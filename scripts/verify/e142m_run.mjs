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

const net = classifyNet({ write: false });
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

const ex = runExport();
const im = runImport();
writeMd(path.join(FINAL_ROOT, 'TRANSFER_EXPORT.md'), ['# FINAL_MEGA TRANSFER EXPORT',`- status: ${ex.ec===0?'PASS':'FAIL'}`,`- archive_path: ${ex.archive||'NA'}`,`- archive_sha256: ${ex.sha||'NA'}`,'## RAW',`- export_ec: ${ex.ec}`].join('\n'));
writeMd(path.join(FINAL_ROOT, 'TRANSFER_IMPORT.md'), ['# FINAL_MEGA TRANSFER IMPORT',`- status: ${im.ec===0?'PASS':'FAIL'}`,'## RAW',`- import_ec: ${im.ec}`].join('\n'));
writeMd(path.join(FINAL_ROOT, 'ACCEPTED.md'), ['# FINAL_MEGA ACCEPTED',`- status: ${im.ec===0?'ACCEPTED':'REJECTED'}`,'## RAW',`- mode: ${process.env.CI?'CI':'LOCAL'}`].join('\n'));

writeMd(path.join(FINAL_ROOT, 'RUNBOOK.md'), ['# FINAL_MEGA RUNBOOK','## One Command Flow','- run: npm run -s doctor','- then: run NEXT_ACTION exactly once','## If BLOCKED/CACHE_MISSING','- CI=true npm run -s verify:mega','## If STALE','- CI=true npm run -s verify:mega','## If FAIL_NODE_CAPSULE','- place capsule at artifacts/incoming/node/ and rerun verify:mega','## RAW',`- next_action: ${d.next}`].join('\n'));

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
