import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(ROOT, 'artifacts/incoming');
const TAR_PATH = path.join(OUT_DIR, 'evidence_chain.tar');
const TGZ_PATH = path.join(OUT_DIR, 'evidence_chain.tar.gz');
const SHA_PATH = path.join(OUT_DIR, 'EVIDENCE_TAR.sha256');
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANIFEST = path.join(EXEC_DIR, 'EVIDENCE_BUNDLE_MANIFEST.md');
const TOOLCHAIN_VOLATILE = path.join(EXEC_DIR, 'EVIDENCE_BUNDLE_TOOLCHAIN_VOLATILE.md');
const bundleMode = process.env.EVIDENCE_BUNDLE_PORTABLE === '1' ? 'PORTABLE' : 'DEFAULT';

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });

function sha256Text(txt) {
  return crypto.createHash('sha256').update(txt).digest('hex');
}

function walkAll(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walkAll(abs, acc);
    else acc.push(path.relative(ROOT, abs).replace(/\\/g, '/'));
  }
  return acc;
}

const all = walkAll(path.join(ROOT, 'reports/evidence')).sort((a, b) => a.localeCompare(b));
const exclude = new Set([
  'reports/evidence/EXECUTOR/EVIDENCE_BUNDLE_MANIFEST.md',
  'reports/evidence/EXECUTOR/EVIDENCE_BUNDLE_TOOLCHAIN_VOLATILE.md',
]);
const candidates = all.filter((rel) => /\.(md|json)$/.test(rel) && !exclude.has(rel));
const offenders = all.filter((rel) => !/\.(md|json)$/.test(rel) && !exclude.has(rel));
if (offenders.length && process.env.EVIDENCE_BUNDLE_STRICT_NON_MDJSON === '1') {
  throw new Error(`EC01_BDL01 disallowed files in reports/evidence: ${offenders.sort((a,b)=>a.localeCompare(b)).join(', ')}`);
}

if (bundleMode === 'PORTABLE') {
  const absPathLike = /(\/workspace\/|[A-Za-z]:\\\\)/m;
  const portableHits = [];
  for (const rel of candidates) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (absPathLike.test(text) && !text.includes('VOLATILE')) portableHits.push(rel);
  }
  if (portableHits.length && process.env.EVIDENCE_BUNDLE_PORTABLE_PATH_STRICT === '1') {
    throw new Error(`EC01_BDL02 absolute-path-like content detected: ${portableHits.sort((a,b)=>a.localeCompare(b)).join(', ')}`);
  }
}

const listPath = path.join(OUT_DIR, 'evidence_bundle.list.txt');
fs.writeFileSync(listPath, `${candidates.join('\n')}\n`);

const tar = spawnSync('bash', ['-lc', `cd ${JSON.stringify(ROOT)} && tar --sort=name --mtime='UTC 2020-01-01' --owner=0 --group=0 --numeric-owner -cf ${JSON.stringify(path.relative(ROOT, TAR_PATH))} -T ${JSON.stringify(path.relative(ROOT, listPath))}`], { encoding: 'utf8' });
if ((tar.status ?? 1) !== 0) throw new Error(tar.stderr || 'tar failed');
const gz = spawnSync('bash', ['-lc', `cd ${JSON.stringify(ROOT)} && gzip -n -f ${JSON.stringify(path.relative(ROOT, TAR_PATH))}`], { encoding: 'utf8' });
if ((gz.status ?? 1) !== 0) throw new Error(gz.stderr || 'gzip failed');
const sha = spawnSync('bash', ['-lc', `cd ${JSON.stringify(ROOT)} && sha256sum ${JSON.stringify(path.relative(ROOT, TGZ_PATH))} > ${JSON.stringify(path.relative(ROOT, SHA_PATH))}`], { encoding: 'utf8' });
if ((sha.status ?? 1) !== 0) throw new Error(sha.stderr || 'sha failed');

const listSha = sha256Text(fs.readFileSync(listPath, 'utf8'));
const tarSha = String(fs.readFileSync(SHA_PATH, 'utf8').trim().split(/\s+/)[0] || 'MISSING');

const tarVersion = spawnSync('tar', ['--version'], { encoding: 'utf8' }).stdout.split('\n')[0] || 'UNKNOWN';
const gzipVersion = spawnSync('gzip', ['--version'], { encoding: 'utf8' }).stdout.split('\n')[0] || 'UNKNOWN';
const shaVersion = spawnSync('sha256sum', ['--version'], { encoding: 'utf8' }).stdout.split('\n')[0] || 'UNKNOWN';
writeMd(TOOLCHAIN_VOLATILE, `# EVIDENCE_BUNDLE_TOOLCHAIN_VOLATILE.md\n\nSTATUS: VOLATILE\n\n- tar_version: ${tarVersion}\n- gzip_version: ${gzipVersion}\n- sha256sum_version: ${shaVersion}\n`);

writeMd(MANIFEST, `# EVIDENCE_BUNDLE_MANIFEST.md\n\nSTATUS: PASS\n\n- contract_version: 1.1.0\n- bundle_mode: ${bundleMode}\n- tar: artifacts/incoming/evidence_chain.tar.gz\n- sha: artifacts/incoming/EVIDENCE_TAR.sha256\n- file_count: ${candidates.length}\n- list_sha256: ${listSha}\n- tar_sha256: ${tarSha}\n\n## FILES\n${candidates.map((f) => `- ${f}`).join('\n')}\n`);
console.log('[PASS] export_evidence_bundle — NONE');
