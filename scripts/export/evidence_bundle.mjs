import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(ROOT, 'artifacts/incoming');
const TAR_PATH = path.join(OUT_DIR, 'evidence_chain.tar');
const TGZ_PATH = path.join(OUT_DIR, 'evidence_chain.tar.gz');
const SHA_PATH = path.join(OUT_DIR, 'EVIDENCE_TAR.sha256');
const MANIFEST = path.join(ROOT, 'reports/evidence/EXECUTOR/EVIDENCE_BUNDLE_MANIFEST.md');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, acc);
    else if (/\.(md|json)$/.test(e.name)) acc.push(path.relative(ROOT, abs));
  }
  return acc;
}

const files = walk(path.join(ROOT, 'reports/evidence')).sort((a, b) => a.localeCompare(b));
const listPath = path.join(OUT_DIR, 'evidence_bundle.list.txt');
fs.writeFileSync(listPath, files.join('\n') + '\n');

const tar = spawnSync('bash', ['-lc', `cd ${JSON.stringify(ROOT)} && tar --sort=name --mtime='UTC 2020-01-01' --owner=0 --group=0 --numeric-owner -cf ${JSON.stringify(path.relative(ROOT, TAR_PATH))} -T ${JSON.stringify(path.relative(ROOT, listPath))}`], { encoding: 'utf8' });
if ((tar.status ?? 1) !== 0) throw new Error(tar.stderr || 'tar failed');
const gz = spawnSync('bash', ['-lc', `cd ${JSON.stringify(ROOT)} && gzip -n -f ${JSON.stringify(path.relative(ROOT, TAR_PATH))}`], { encoding: 'utf8' });
if ((gz.status ?? 1) !== 0) throw new Error(gz.stderr || 'gzip failed');
const sha = spawnSync('bash', ['-lc', `cd ${JSON.stringify(ROOT)} && sha256sum ${JSON.stringify(path.relative(ROOT, TGZ_PATH))} > ${JSON.stringify(path.relative(ROOT, SHA_PATH))}`], { encoding: 'utf8' });
if ((sha.status ?? 1) !== 0) throw new Error(sha.stderr || 'sha failed');

writeMd(MANIFEST, `# EVIDENCE_BUNDLE_MANIFEST.md\n\nSTATUS: PASS\n\n- tar: artifacts/incoming/evidence_chain.tar.gz\n- sha: artifacts/incoming/EVIDENCE_TAR.sha256\n- files_n: ${files.length}\n\n## FILES\n${files.map((f) => `- ${f}`).join('\n')}\n`);
console.log('[PASS] export_evidence_bundle — NONE');
