#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { resolveEvidenceDir } from './evidence_helpers.mjs';

const evidenceDir = process.env.EVIDENCE_DIR || resolveEvidenceDir();
const manifestsDir = path.join(evidenceDir, 'manifests');
fs.mkdirSync(manifestsDir, { recursive: true });

const evidenceManifest = path.join(evidenceDir, 'SHA256SUMS.EVIDENCE.txt');
const sourceManifest = path.join(evidenceDir, 'SHA256SUMS.SOURCE.txt');
const exportManifest = path.join(evidenceDir, 'SHA256SUMS.EXPORT.txt');

function sha(file) {
  const buf = fs.readFileSync(file);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function writeManifest(filePath, entries) {
  const lines = entries.map((f) => `${sha(f)}  ${f}`).join('\n');
  fs.writeFileSync(filePath, `${lines}${lines ? '\n' : ''}`);
}

function runCheck(manifestPath, logName) {
  const cmd = `sha256sum -c ${manifestPath}`;
  const out = execSync(cmd, { encoding: 'utf8' });
  fs.writeFileSync(path.join(manifestsDir, logName), `$ ${cmd}\n${out}`);
}

function isEvidenceFileExcluded(filePath) {
  const basename = path.basename(filePath);
  if (filePath.includes('/manifests/')) return true;
  if (basename.startsWith('SHA256SUMS.')) return true;
  if (filePath.includes('/gates/')) {
    if (basename.startsWith('verify_wall')) return true;
    if (basename.startsWith('14_regen_manifests')) return true;
    if (basename.startsWith('15_sha_')) return true;
    if (basename.startsWith('16_sha_')) return true;
    if (basename.startsWith('17_sha_')) return true;
  }
  return false;
}

const evidenceFiles = [];
if (fs.existsSync(evidenceDir)) {
  const all = execSync(`find ${evidenceDir} -type f | sort`, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  for (const f of all) {
    if (isEvidenceFileExcluded(f)) continue;
    evidenceFiles.push(f);
  }
}
writeManifest(evidenceManifest, evidenceFiles);
runCheck(evidenceManifest, 'check_evidence.log');

let tracked = [];
try {
  tracked = execSync('git ls-files', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
} catch {
  tracked = execSync("find . -type f | sed 's#^\./##'", { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
}
tracked = tracked
  .filter((f) => !f.match(/\.(zip|tar\.gz)$/))
  .filter((f) => !path.basename(f).startsWith('SHA256SUMS.'))
  .filter((f) => !f.includes('/manifests/'));
writeManifest(sourceManifest, tracked);
runCheck(sourceManifest, 'check_source.log');

const exportCandidates = ['FINAL_VALIDATED.zip', 'FINAL_VALIDATED.zip.sha256']
  .filter((f) => fs.existsSync(f));
writeManifest(exportManifest, exportCandidates);
if (exportCandidates.length) {
  runCheck(exportManifest, 'check_export.log');
} else {
  fs.writeFileSync(path.join(manifestsDir, 'check_export.log'), 'No export artifacts found; created empty SHA256SUMS.EXPORT.txt\n');
}

console.log(`Manifest regeneration complete in canonical order: EVIDENCE -> SOURCE -> EXPORT (${evidenceDir})`);
