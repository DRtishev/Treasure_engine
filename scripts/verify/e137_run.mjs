#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E137_ROOT, REQUIRED_E137_FILES, REASON, ensureDir, run, writeMd } from './e137_lib.mjs';
import { runOffline } from './e137_offline.mjs';
import { runOnline } from './e137_online.mjs';
import { runExport } from './e137_export.mjs';
import { runImport } from './e137_import.mjs';
import { runContracts } from './e137_contracts.mjs';
import { runSealX2 } from './e137_seal_x2.mjs';

ensureDir(E137_ROOT);
ensureDir('artifacts/outgoing');


const nodeMajor = Number(process.versions.node.split('.')[0] || 0);
if (nodeMajor < 22) {
  process.stderr.write('E137_BLOCKED: reason_code=FAIL_NODE_POLICY node>=22 required\n');
    process.exit(1);
}

const snap = run('git', ['rev-parse', '--short', 'HEAD']);
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
const dirty = run('git', ['status', '--porcelain']);
const npmV = run('npm', ['-v']);
writeMd(path.join(E137_ROOT, 'SNAPSHOT.md'), [
  '# E137 SNAPSHOT',
  `- date_utc: ${new Date().toISOString()}`,
  `- pwd: ${process.cwd()}`,
  `- branch: ${branch.out}`,
  `- head: ${snap.out}`,
  `- dirty: ${dirty.out ? 'YES' : 'NO'}`,
  `- node: ${process.version}`,
  `- npm: ${npmV.out}`,
  `- enable_net: ${process.env.ENABLE_NET === '1' ? '1' : '0'}`,
  `- online_optional: ${process.env.ONLINE_OPTIONAL === '1' ? '1' : '0'}`,
  `- online_required: ${process.env.ONLINE_REQUIRED === '1' ? '1' : '0'}`,
  `- live_risk_unlock: ${process.env.I_UNDERSTAND_LIVE_RISK === '1' ? '1' : '0'}`,
].join('\n'));

const offline = runOffline();
let online = { ec: 0, reasonCode: REASON.SKIP_ONLINE_FLAGS_NOT_SET };
if (process.env.ENABLE_NET === '1' || process.env.ONLINE_OPTIONAL === '1' || process.env.ONLINE_REQUIRED === '1') {
  online = runOnline();
} else {
  writeMd(path.join(E137_ROOT, 'ONLINE_MATRIX.md'), '# E137 ONLINE MATRIX\n- status: SKIPPED\n- reason_code: SKIP_ONLINE_FLAGS_NOT_SET');
}

writeMd(path.join(E137_ROOT, 'TRANSFER_PROTOCOL.md'), [
  '# E137 TRANSFER PROTOCOL',
  '- mode_matrix: OFFLINE | ONLINE_OPTIONAL | ONLINE_REQUIRED',
  '- export_command: npm run -s verify:e137:export',
  '- export_location: artifacts/outgoing/E137_evidence_<ts>.tar.gz',
  '- import_command: npm run -s verify:e137:import -- --archive <path>',
  '- import_checks: sha256, structure(E137 root), md-only, SHA256SUMS parity, contracts',
  '- reason_code: OK',
].join('\n'));

const imp = runImport();
let contracts = runContracts();
let seal = runSealX2();
rewriteSums(E137_ROOT, ['SHA256SUMS.md'], 'reports/evidence');

const exp = runExport();
contracts = runContracts();
seal = runSealX2();
rewriteSums(E137_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
const sumsRows = verifySums(path.join(E137_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E137/SHA256SUMS.md']);

const missing = REQUIRED_E137_FILES.filter((f) => !fs.existsSync(path.join(E137_ROOT, f)));
const pass = offline.ec === 0 && contracts.ec === 0 && seal.ec === 0 && exp.ec === 0 && missing.length === 0;
writeMd(path.join(E137_ROOT, 'VERDICT.md'), [
  '# E137 VERDICT',
  `- status: ${pass ? 'PASS' : 'FAIL'}`,
  `- reason_code: ${pass ? REASON.OK : (missing.length ? REASON.FAIL_IMPORT_STRUCTURE : (contracts.reasonCode || REASON.FAIL_HEADER_EXACT))}`,
  `- offline_ec: ${offline.ec}`,
  `- online_ec: ${online.ec}`,
  `- export_ec: ${exp.ec}`,
  `- import_ec: ${imp.ec}`,
  `- contracts_ec: ${contracts.ec}`,
  `- seal_x2_ec: ${seal.ec}`,
  `- sha_rows_verified: ${sumsRows}`,
  ...(missing.length ? ['', '## Missing Required Files', ...missing.map((f) => `- ${f}`)] : []),
].join('\n'));
rewriteSums(E137_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
verifySums(path.join(E137_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E137/SHA256SUMS.md']);

if (!pass) process.exit(1);
