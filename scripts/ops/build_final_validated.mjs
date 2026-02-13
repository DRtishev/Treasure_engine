#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const evidenceEpoch = process.env.EVIDENCE_EPOCH || 'EPOCH-EDGE-MERGE-READY-01';
const evidenceRoot = path.join(root, 'reports/evidence', evidenceEpoch);
fs.mkdirSync(evidenceRoot, { recursive: true });
fs.mkdirSync(path.join(root, 'artifacts/incoming'), { recursive: true });

const includeFiles = [];
const pushIfFile = (p) => { if (fs.existsSync(p) && fs.statSync(p).isFile()) includeFiles.push(p); };
const pushDirFiles = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) pushDirFiles(abs);
    if (entry.isFile()) includeFiles.push(abs);
  }
};

pushDirFiles(path.join(root, 'core/edge'));
pushDirFiles(path.join(root, 'scripts/verify'));
pushDirFiles(path.join(root, 'docs/EDGE_RESEARCH'));
for (let e = 31; e <= 40; e += 1) pushIfFile(path.join(root, 'specs/epochs', `EPOCH-${String(e).padStart(2, '0')}.md`));
pushIfFile(path.join(root, 'specs/epochs/INDEX.md'));
pushIfFile(path.join(root, 'specs/epochs/LEDGER.json'));

const relFiles = Array.from(new Set(includeFiles.map((p) => path.relative(root, p)))).sort((a, b) => a.localeCompare(b));
const listPath = path.join(evidenceRoot, 'final_validated_filelist.txt');
fs.writeFileSync(listPath, `${relFiles.join('\n')}\n`);

const checksumsPath = path.join(evidenceRoot, 'FINAL_VALIDATED_INPUTS.sha256');
const checksum = spawnSync('bash', ['-lc', `cd ${JSON.stringify(root)} && xargs -d '\n' sha256sum < ${JSON.stringify(listPath)} > ${JSON.stringify(checksumsPath)}`], { encoding: 'utf8' });
if (checksum.status !== 0) throw new Error(`checksum generation failed: ${checksum.stderr || checksum.stdout}`);

const tarName = 'FINAL_VALIDATED_EDGE_MERGE_READY_01.tar.gz';
const tarPath = path.join(root, 'artifacts/incoming', tarName);
if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);

const tarArgs = [
  '--sort=name',
  '--mtime=UTC 2020-01-01',
  '--owner=0',
  '--group=0',
  '--numeric-owner',
  '-czf',
  tarPath,
  '-T',
  listPath
];
const tar = spawnSync('tar', tarArgs, { cwd: root, encoding: 'utf8' });
if (tar.status !== 0) throw new Error(`tar packaging failed: ${tar.stderr || tar.stdout}`);

const tarShaPath = path.join(evidenceRoot, 'FINAL_VALIDATED.tar.gz.sha256');
const tarSha = spawnSync('bash', ['-lc', `cd ${JSON.stringify(root)} && sha256sum ${JSON.stringify(path.relative(root, tarPath))} > ${JSON.stringify(tarShaPath)}`], { encoding: 'utf8' });
if (tarSha.status !== 0) throw new Error(`tar checksum failed: ${tarSha.stderr || tarSha.stdout}`);

console.log(`PACKED ${path.relative(root, tarPath)}`);
console.log(`INPUT_HASHES ${path.relative(root, checksumsPath)}`);
console.log(`ARCHIVE_HASH ${path.relative(root, tarShaPath)}`);
