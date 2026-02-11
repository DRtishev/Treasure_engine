#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const repoRoot = process.cwd();
const evidenceDir = process.env.EVIDENCE_DIR || 'reports/evidence/EPOCH-BOOT.AUTOPILOT';
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

const evidenceFiles = [];
if (fs.existsSync(evidenceDir)) {
  const all = execSync(`find ${evidenceDir} -type f | sort`, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  for (const f of all) {
    if (f.includes('/manifests/')) continue;
    if (f.includes('/gates/sha_')) continue;
    if (f.includes('/gates/regen_manifests')) continue;
    if (path.basename(f).startsWith('SHA256SUMS.')) continue;
    evidenceFiles.push(f);
  }
}
writeManifest(evidenceManifest, evidenceFiles);
runCheck(evidenceManifest, 'validate_evidence.log');

const tracked = execSync('git ls-files', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter((f) => !f.match(/\.(zip|tar\.gz)$/))
  .filter((f) => !path.basename(f).startsWith('SHA256SUMS.'))
  .filter((f) => !f.includes('/manifests/'));
writeManifest(sourceManifest, tracked);
runCheck(sourceManifest, 'validate_source.log');

const exportCandidates = ['FINAL_VALIDATED.zip', 'EVIDENCE_PACK_EPOCH-BOOT.AUTOPILOT.tar.gz'].filter((f) => fs.existsSync(f));
writeManifest(exportManifest, exportCandidates);
if (exportCandidates.length) {
  runCheck(exportManifest, 'validate_export.log');
} else {
  fs.writeFileSync(path.join(manifestsDir, 'validate_export.log'), 'No export artifacts found; created empty SHA256SUMS.EXPORT.txt\n');
}

console.log(`Manifest regeneration complete in canonical order: EVIDENCE -> SOURCE -> EXPORT (${evidenceDir})`);
