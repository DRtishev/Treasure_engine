#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E140_ROOT, REASON, env1, fingerprint, redactedProxy, run, writeMd } from './e140_lib.mjs';
import { doctorState, doctorText } from './e140_doctor.mjs';
import { bootstrapNode } from './e140_node_bootstrap.mjs';
import { runExport } from './e140_export.mjs';
import { runImport } from './e140_import.mjs';
import { runContracts } from './e140_contracts.mjs';

const probe = process.argv.includes('--probe');
fs.mkdirSync(E140_ROOT, { recursive: true });

const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).out;
const head = run('git', ['rev-parse', '--short', 'HEAD']).out;
const dirty = run('git', ['status', '--short']).out;
const npmv = run('npm', ['-v']).out;
writeMd(path.join(E140_ROOT, 'SNAPSHOT.md'), [
  '# E140 SNAPSHOT',
  `- date_utc: ${new Date().toISOString()}`,
  `- pwd: ${process.cwd()}`,
  `- branch: ${branch}`,
  `- head: ${head}`,
  `- dirty: ${dirty ? 'YES' : 'NO'}`,
  `- node: ${process.version}`,
  `- npm: ${npmv}`,
  '## RAW',
  `- CI=${process.env.CI || ''} ENABLE_NET=${process.env.ENABLE_NET || ''} ONLINE_OPTIONAL=${process.env.ONLINE_OPTIONAL || ''} ONLINE_REQUIRED=${process.env.ONLINE_REQUIRED || ''}`,
].join('\n'));

const doc = doctorState({ probe });
writeMd(path.join(E140_ROOT, 'DOCTOR_OUTPUT.md'), `# E140 DOCTOR OUTPUT\n\n## RAW\n\n\`\`\`\n${doctorText(doc)}\n\`\`\``);
const boot = bootstrapNode({ probe });
writeMd(path.join(E140_ROOT, 'NODE_BOOTSTRAP.md'), [
  '# E140 NODE BOOTSTRAP',
  `- status: ${boot.status}`,
  `- reason_code: ${boot.reason}`,
  `- node_bin: ${boot.node_bin || 'NA'}`,
  `- next_action: ${boot.next_action || 'none'}`,
  '## RAW',
  `- current_node: ${process.version}`,
].join('\n'));

const gate = [];
if (!probe && boot.reason !== REASON.AUTHORITATIVE_READY) {
  writeMd(path.join(E140_ROOT, 'GATE_RUN.md'), '# E140 GATE RUN\n- status: BLOCKED\n- reason_code: NEED_NODE_TARBALL\n## RAW\n- authoritative gates skipped');
  runContracts();
  rewriteSums(E140_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  verifySums(path.join(E140_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E140/SHA256SUMS.md']);
  writeMd(path.join(E140_ROOT, 'VERDICT.md'), '# E140 VERDICT\n- status: BLOCKED\n- reason_code: NEED_NODE_TARBALL\n- mode: BLOCKED\n## RAW\n- next_action: place pinned tarball and rerun verify:e140');
  rewriteSums(E140_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  process.exit(1);
}

if (!probe) {
  for (const [name, args] of [
    ['verify:node', ['run', '-s', 'verify:node']],
    ['verify:e135', ['run', '-s', 'verify:e135']],
    ['verify:e136', ['run', '-s', 'verify:e136']],
    ['verify:e139', ['run', '-s', 'verify:e139']],
  ]) {
    const r = run('npm', args, { env: { ...process.env, CI: 'true', CHAIN_MODE: 'FAST_PLUS', QUIET: '1' } });
    gate.push(`- ${name}: EC=${r.ec}`);
    if (r.ec !== 0) break;
  }
} else {
  gate.push('- probe_mode: skipping authoritative gates');
}
writeMd(path.join(E140_ROOT, 'GATE_RUN.md'), ['# E140 GATE RUN', `- status: ${probe ? 'PROBE' : 'RUN'}`, '## RAW', ...gate].join('\n'));

const exp = runExport();
const imp = runImport();
const ctr = runContracts();
rewriteSums(E140_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
const shaRows = verifySums(path.join(E140_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E140/SHA256SUMS.md']);

const fp = fingerprint([
  `node=${process.version}`,
  `bootstrap=${boot.status}`,
  `proxy=${redactedProxy().shape_hash}`,
  `flags=${env1('ENABLE_NET')}:${env1('ONLINE_OPTIONAL')}:${env1('ONLINE_REQUIRED')}`,
  ...fs.readdirSync(E140_ROOT).filter((f) => f.endsWith('.md')).sort(),
]);

const ok = probe ? (ctr.ec === 0) : (boot.reason === REASON.AUTHORITATIVE_READY && ctr.ec === 0 && exp.ec === 0 && imp.ec === 0 && !gate.some((g) => g.includes('EC=1')));
writeMd(path.join(E140_ROOT, 'VERDICT.md'), [
  '# E140 VERDICT',
  `- status: ${ok ? (probe ? 'PASS_NON_AUTHORITATIVE' : 'AUTHORITATIVE_PASS') : 'BLOCKED'}`,
  `- reason_code: ${ok ? REASON.OK : boot.reason}`,
  `- mode: ${doc.mode}`,
  `- fingerprint: ${fp}`,
  `- sha_rows_verified: ${shaRows}`,
  '## RAW',
  `- export_ec=${exp.ec} import_ec=${imp.ec} contracts_ec=${ctr.ec}`,
].join('\n'));
rewriteSums(E140_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
verifySums(path.join(E140_ROOT, 'SHA256SUMS.md'), ['reports/evidence/E140/SHA256SUMS.md']);
process.exit(ok ? 0 : 1);
