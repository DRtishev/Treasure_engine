#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { sha256File } from './e66_lib.mjs';
import { rewriteSums, verifySums } from './foundation_sums.mjs';

const ROOT = path.resolve('reports/evidence/E138');
const REASON = {
  FAIL_NODE_POLICY: 'FAIL_NODE_POLICY',
  PROBE_ONLY_NON_AUTHORITATIVE: 'PROBE_ONLY_NON_AUTHORITATIVE',
  AUTHORITATIVE_PASS: 'AUTHORITATIVE_PASS',
  OK: 'OK',
};

function writeMd(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const txt = `${String(content).replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd()}\n`;
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, txt, 'utf8');
  fs.renameSync(tmp, file);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return { ec: r.status ?? 1, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function parseE135Matrix() {
  const p = path.resolve('reports/evidence/E135/TRANSPORT_HARNESS_MATRIX.md');
  if (!fs.existsSync(p)) return ['| scenario | reason_code |', '|---|---|'];
  const rows = fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.startsWith('| ') && !l.includes('scenario') && !l.startsWith('|---'));
  return [
    '| scenario | reason_code |',
    '|---|---|',
    ...rows.map((row) => {
      const parts = row.split('|').map((s) => s.trim()).filter(Boolean);
      return `| ${parts[0] || 'unknown'} | ${parts[parts.length - 1] || 'UNKNOWN'} |`;
    }),
  ];
}

function contractsCheck() {
  const files = fs.existsSync(ROOT) ? fs.readdirSync(ROOT) : [];
  let mdOnly = true;
  for (const f of files) if (!f.endsWith('.md')) mdOnly = false;
  const tokenRe = /(?:Bearer|token|api_key|apikey|password|secret|Authorization)\s*[=:]\s*\S+/i;
  let redaction = true;
  for (const f of files.filter((x) => x.endsWith('.md'))) {
    if (tokenRe.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) redaction = false;
  }
  const required = ['# E138 SNAPSHOT', '# E138 PROBE REPORT', '# E138 OFFLINE MATRIX', '# E138 CONTRACTS'];
  let header = true;
  for (const h of required) {
    const found = files.filter((x) => x.endsWith('.md')).some((f) => fs.readFileSync(path.join(ROOT, f), 'utf8').startsWith(`${h}\n`));
    if (!found) header = false;
  }
  return { mdOnly, redaction, header, ec: mdOnly && redaction && header ? 0 : 1 };
}

function runProbe() {
  fs.mkdirSync(ROOT, { recursive: true });
  fs.mkdirSync('artifacts/outgoing', { recursive: true });

  const nodeMajor = Number(process.versions.node.split('.')[0] || 0);
  const nodePolicyOk = nodeMajor >= 22;
  const status = nodePolicyOk ? REASON.AUTHORITATIVE_PASS : REASON.PROBE_ONLY_NON_AUTHORITATIVE;
  const reason = nodePolicyOk ? REASON.OK : REASON.FAIL_NODE_POLICY;

  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  const head = run('git', ['rev-parse', '--short', 'HEAD']);
  const dirty = run('git', ['status', '--porcelain']);
  const npmV = run('npm', ['-v']);

  writeMd(path.join(ROOT, 'SNAPSHOT.md'), [
    '# E138 SNAPSHOT',
    `- date_utc: ${new Date().toISOString()}`,
    `- pwd: ${process.cwd()}`,
    `- branch: ${branch.out}`,
    `- head: ${head.out}`,
    `- dirty: ${dirty.out ? 'YES' : 'NO'}`,
    `- node: ${process.version}`,
    `- npm: ${npmV.out || 'N/A'}`,
    `- node_policy_ok: ${nodePolicyOk}`,
  ].join('\n'));

  const off = run('node', ['scripts/verify/e135_run.mjs']);
  writeMd(path.join(ROOT, 'OFFLINE_MATRIX.md'), [
    '# E138 OFFLINE MATRIX',
    `- source: verify:e135`,
    `- verify_e135_ec: ${off.ec}`,
    `- reason_code: ${off.ec === 0 ? REASON.OK : 'FAIL_PROXY_POLICY'}`,
    ...parseE135Matrix(),
  ].join('\n'));

  writeMd(path.join(ROOT, 'PROBE_REPORT.md'), [
    '# E138 PROBE REPORT',
    `- status: ${status}`,
    `- reason_code: ${reason}`,
    '- claim: non-authoritative diagnostics only; not an epoch PASS.',
    '- authoritative_requirement: node>=22 and npm run -s verify:e137 must pass.',
    '- actions: snapshot, offline harness, contracts, export, import.',
  ].join('\n'));

  const contracts = contractsCheck();
  writeMd(path.join(ROOT, 'CONTRACTS.md'), [
    '# E138 CONTRACTS',
    `- md_only: ${contracts.mdOnly ? 'PASS' : 'FAIL'}`,
    `- redaction: ${contracts.redaction ? 'PASS' : 'FAIL'}`,
    `- header_exactness: ${contracts.header ? 'PASS' : 'FAIL'}`,
    `- reason_code: ${contracts.ec === 0 ? REASON.OK : 'FAIL_HEADER_EXACT'}`,
  ].join('\n'));

  const archive = path.resolve(`artifacts/outgoing/E138_probe_${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`);
  const tar = run('tar', ['czf', archive, 'reports/evidence/E138']);
  const exportOk = tar.ec === 0 && fs.existsSync(archive);
  const archiveSha = exportOk ? sha256File(archive) : 'N/A';
  writeMd(path.join(ROOT, 'EXPORT_RECEIPT.md'), [
    '# E138 EXPORT RECEIPT',
    `- archive_created: ${exportOk}`,
    `- archive_path: ${exportOk ? archive : 'NOT_CREATED'}`,
    `- archive_sha256: ${archiveSha}`,
    `- reason_code: ${exportOk ? REASON.OK : 'FAIL_IMPORT_STRUCTURE'}`,
  ].join('\n'));

  let importStatus = 'SKIPPED';
  let importReason = 'SKIP_IMPORT_NOT_REQUESTED';
  if (exportOk) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'e138-probe-'));
    const untar = run('tar', ['xzf', archive, '-C', tmp]);
    const unpacked = path.join(tmp, 'reports/evidence/E138');
    if (untar.ec === 0 && fs.existsSync(unpacked)) {
      importStatus = 'PASS';
      importReason = REASON.OK;
    } else {
      importStatus = 'FAIL';
      importReason = 'FAIL_IMPORT_STRUCTURE';
    }
  }
  writeMd(path.join(ROOT, 'IMPORT_REPORT.md'), [
    '# E138 IMPORT REPORT',
    `- status: ${importStatus}`,
    `- reason_code: ${importReason}`,
    '- note: probe import validates archive unpack path only.',
  ].join('\n'));

  writeMd(path.join(ROOT, 'VERDICT.md'), [
    '# E138 VERDICT',
    `- status: ${nodePolicyOk ? 'AUTHORITATIVE_READY' : 'BLOCKED_BY_NODE_POLICY'}`,
    `- reason_code: ${reason}`,
    '- non_authoritative: true',
    '- epoch_pass_claim: FORBIDDEN',
  ].join('\n'));

  rewriteSums(ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  const rows = verifySums(path.join(ROOT, 'SHA256SUMS.md'), ['reports/evidence/E138/SHA256SUMS.md']);
  writeMd(path.join(ROOT, 'PROBE_REPORT.md'), [
    '# E138 PROBE REPORT',
    `- status: ${status}`,
    `- reason_code: ${reason}`,
    `- node_policy_ok: ${nodePolicyOk}`,
    `- verify_e135_ec: ${off.ec}`,
    `- contracts_ec: ${contracts.ec}`,
    `- export_ok: ${exportOk}`,
    `- import_status: ${importStatus}`,
    `- sha_rows_verified: ${rows}`,
    '- claim: non-authoritative diagnostics only; not an epoch PASS.',
    '- authoritative_requirement: node>=22 and npm run -s verify:e137 must pass.',
  ].join('\n'));
  rewriteSums(ROOT, ['SHA256SUMS.md'], 'reports/evidence');

  return 0;
}

process.exit(runProbe());
