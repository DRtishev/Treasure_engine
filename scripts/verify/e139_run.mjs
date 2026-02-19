#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { getDoctorState, formatDoctor } from './e139_doctor.mjs';
import { runContracts } from './e139_contracts.mjs';

const ROOT = path.resolve('reports/evidence/E139');
const probe = process.argv.includes('--probe');

function writeMd(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${String(content).replace(/\r\n/g, '\n').trimEnd()}\n`, 'utf8');
}

function sh(cmd) {
  const r = spawnSync('bash', ['-lc', cmd], { encoding: 'utf8' });
  return { ec: r.status ?? 1, out: (r.stdout || '').trim() };
}

fs.mkdirSync(ROOT, { recursive: true });
const nodeMajor = Number(process.versions.node.split('.')[0] || 0);
if (!probe && nodeMajor < 22) {
  process.stderr.write('E139_BLOCKED: reason_code=FAIL_NODE_POLICY node>=22 required\n');
  process.exit(1);
}

const branch = sh('git rev-parse --abbrev-ref HEAD').out;
const head = sh('git rev-parse --short HEAD').out;
const dirty = sh('git status --porcelain').out;
const npmv = sh('npm -v').out;

writeMd(path.join(ROOT, 'SNAPSHOT.md'), [
  '# E139 SNAPSHOT',
  `- date_utc: ${new Date().toISOString()}`,
  `- pwd: ${process.cwd()}`,
  `- branch: ${branch}`,
  `- head: ${head}`,
  `- dirty: ${dirty ? 'YES' : 'NO'}`,
  `- node: ${process.version}`,
  `- npm: ${npmv}`,
  `- probe_mode: ${probe}`,
  `- CI: ${process.env.CI || ''}`,
  `- ENABLE_NET: ${process.env.ENABLE_NET || ''}`,
  `- ONLINE_OPTIONAL: ${process.env.ONLINE_OPTIONAL || ''}`,
  `- ONLINE_REQUIRED: ${process.env.ONLINE_REQUIRED || ''}`,
  `- FORCE_IPV4: ${process.env.FORCE_IPV4 || ''}`,
  `- FORCE_IPV6: ${process.env.FORCE_IPV6 || ''}`,
].join('\n'));

const doctor = getDoctorState({ probe });
writeMd(path.join(ROOT, 'DOCTOR_OUTPUT.md'), `# E139 DOCTOR OUTPUT\n\n\`\`\`\n${formatDoctor(doctor).trimEnd()}\n\`\`\``);

writeMd(path.join(ROOT, 'MODE_MATRIX.md'), [
  '# E139 MODE MATRIX',
  '| scenario | expected_mode | expected_next_action |',
  '|---|---|---|',
  '| Node<22, probe=false | AUTHORITATIVE_BLOCKED | run verify:e139:probe or upgrade Node>=22 |',
  '| Node<22, probe=true | PROBE_ONLY_NON_AUTHORITATIVE | install Node>=22 then run verify:e139 |',
  '| Node>=22, online flags absent | ONLINE_SKIPPED_FLAGS_NOT_SET | continue offline authoritative path |',
  '| Node>=22, ENABLE_NET=1+RISK+ONLINE_OPTIONAL=1 | ONLINE_READY_OPTIONAL | run optional online diagnostics |',
  '| Node>=22, ENABLE_NET=1+RISK+ONLINE_REQUIRED=1 | ONLINE_READY_REQUIRED | run online-required diagnostics |',
].join('\n'));

writeMd(path.join(ROOT, 'OPERATOR_RUNBOOK.md'), [
  '# E139 OPERATOR RUNBOOK',
  '1. verify:offline — use for offline deterministic checks only.',
  '2. verify:probe — use on Node<22 for NON_AUTHORITATIVE diagnostics only.',
  '3. verify:authoritative — use on Node>=22 (`npm run -s verify:e139`).',
  '4. verify:online — use only with `ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1` and `ONLINE_OPTIONAL=1|ONLINE_REQUIRED=1`.',
].join('\n'));

const contracts = runContracts();
rewriteSums(ROOT, ['SHA256SUMS.md'], 'reports/evidence');
const shaRows = verifySums(path.join(ROOT, 'SHA256SUMS.md'), ['reports/evidence/E139/SHA256SUMS.md']);

const nonAuth = probe || doctor.mode === 'PROBE_ONLY_NON_AUTHORITATIVE' || doctor.mode === 'AUTHORITATIVE_BLOCKED';
const pass = contracts.ec === 0;
writeMd(path.join(ROOT, 'VERDICT.md'), [
  '# E139 VERDICT',
  `- status: ${pass ? (nonAuth ? 'PASS_NON_AUTHORITATIVE' : 'PASS') : 'FAIL'}`,
  `- mode: ${doctor.mode}`,
  `- reason_code: ${pass ? doctor.reasonCode : contracts.reason}`,
  `- non_authoritative: ${nonAuth}`,
  `- sha_rows_verified: ${shaRows}`,
].join('\n'));

rewriteSums(ROOT, ['SHA256SUMS.md'], 'reports/evidence');
verifySums(path.join(ROOT, 'SHA256SUMS.md'), ['reports/evidence/E139/SHA256SUMS.md']);
process.exit(pass ? 0 : 1);
