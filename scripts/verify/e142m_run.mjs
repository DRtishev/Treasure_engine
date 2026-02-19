#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { ROOT, REASONS, run, writeMd } from './e142m_lib.mjs';
import { doctorState, doctorText } from './e142m_doctor.mjs';
import { runAcquire } from './e141_node_acquire.mjs';
import { runBootstrap } from './e141_node_bootstrap.mjs';
import { execWithPinned } from './e141_exec_with_pinned_node.mjs';
import { classifyNet } from './e142m_network_classify.mjs';
import { runExport } from './e142m_export.mjs';
import { runImport } from './e142m_import.mjs';
import { runContracts } from './e142m_contracts.mjs';
import { runSeal } from './e142m_seal_x2.mjs';

const probe = process.argv.includes('--probe');
fs.mkdirSync(ROOT, { recursive: true });

writeMd(path.join(ROOT, 'SNAPSHOT.md'), [
  '# E142_MEGA SNAPSHOT',
  `- date_utc: ${new Date().toISOString()}`,
  `- pwd: ${process.cwd()}`,
  `- branch: ${run('git',['rev-parse','--abbrev-ref','HEAD']).out}`,
  `- head: ${run('git',['rev-parse','--short','HEAD']).out}`,
  `- node: ${process.version}`,
  `- npm: ${run('npm',['-v']).out}`,
  '## RAW',
  `- probe: ${probe}`,
].join('\n'));

const d = doctorState({ probe });
writeMd(path.join(ROOT, 'DOCTOR_OUTPUT.md'), `# E142_MEGA DOCTOR OUTPUT\n\n## RAW\n\n\`\`\`\n${doctorText(d)}\n\`\`\``);
const net = classifyNet({ write: true });

let acq = { ec: 0 }, boot = { ec: 0 }, bridge = { ec: 0 }, rep = { ec: 0 };
if (!probe) {
  acq = runAcquire();
  boot = runBootstrap({ probe: false });
  if (boot.ec === 0) {
    bridge = execWithPinned(['-v']);
    rep = execWithPinned(['scripts/verify/e137_contracts.mjs']);
  }
}
writeMd(path.join(ROOT, 'BRIDGE_RUN.md'), [
  '# E142_MEGA BRIDGE RUN',
  `- bridge_ec: ${bridge.ec}`,
  `- representative_gate: scripts/verify/e137_contracts.mjs`,
  `- representative_gate_ec: ${rep.ec}`,
  '## RAW',
  `- acquire_ec: ${acq.ec}`,
  `- bootstrap_ec: ${boot.ec}`,
].join('\n'));

writeMd(path.join(ROOT, 'OPERATOR_RUNBOOK.md'), [
  '# E142_MEGA OPERATOR RUNBOOK',
  '- phone_flow_1: npm run -s doctor',
  '- phone_flow_2: CI=true npm run -s verify:mega',
  '- if_blocked: follow NEXT_ACTION from doctor output exactly',
  '- export_bundle: npm run -s verify:mega:export',
  '- import_accept: npm run -s verify:mega:import -- --archive <path>',
  '## RAW',
  `- net_class: ${net.netClass}`,
].join('\n'));

const ex = runExport();
const im = runImport();
const contracts = runContracts();
const seal = runSeal();
rewriteSums(ROOT, ['SHA256SUMS.md'], 'reports/evidence');
const rows = verifySums(path.join(ROOT, 'SHA256SUMS.md'), ['reports/evidence/E142_MEGA/SHA256SUMS.md']);

const authoritative = !probe && boot.ec === 0 && bridge.ec === 0 && rep.ec === 0;
const status = authoritative && contracts.ec === 0 && seal.ec === 0 && ex.ec === 0 && im.ec === 0 ? 'PASS' : (probe ? 'PROBE' : 'BLOCKED');
writeMd(path.join(ROOT, 'MEGA_SUMMARY.md'), [
  '# E142_MEGA MEGA SUMMARY',
  `- mode: ${d.mode}`,
  `- authoritative: ${authoritative}`,
  `- next_action: ${d.next}`,
  `- status: ${status}`,
  `- net_class: ${net.netClass}`,
  '## RAW',
  `- export_ec: ${ex.ec} import_ec: ${im.ec} contracts_ec: ${contracts.ec} seal_ec: ${seal.ec}`,
].join('\n'));

writeMd(path.join(ROOT, 'MEGA_VERDICT.md'), [
  '# E142_MEGA MEGA VERDICT',
  `- status: ${status}`,
  `- authoritative: ${authoritative}`,
  `- reason_code: ${status === 'PASS' ? REASONS.OK : (probe ? REASONS.PROBE_ONLY_NON_AUTHORITATIVE : REASONS.FAIL_NODE_POLICY)}`,
  `- net_class: ${net.netClass}`,
  `- sha_rows_verified: ${rows}`,
  '## RAW',
  `- bridge_ec: ${bridge.ec}`,
  `- representative_ec: ${rep.ec}`,
].join('\n'));

rewriteSums(ROOT, ['SHA256SUMS.md'], 'reports/evidence');
verifySums(path.join(ROOT, 'SHA256SUMS.md'), ['reports/evidence/E142_MEGA/SHA256SUMS.md']);
if (!probe && status !== 'PASS') process.exit(1);
process.exit(0);
