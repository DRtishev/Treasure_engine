import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { RUN_ID, sha256Text } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const TMP1 = path.join('/tmp', 'edge_raw_run1');
const TMP2 = path.join('/tmp', 'edge_raw_run2');

function cp(src, dst) {
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f);
    const d = path.join(dst, f);
    if (fs.statSync(s).isFile()) fs.copyFileSync(s, d);
  }
}

function snapshot(dir) {
  const files = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort();
  return files.map((file) => {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    return { file, hash: sha256Text(content), content };
  });
}

execSync('node scripts/edge/edge_lab/edge_all.mjs', { cwd: ROOT, stdio: 'pipe' });
cp(EVIDENCE_DIR, TMP1);
execSync('node scripts/edge/edge_lab/edge_all.mjs', { cwd: ROOT, stdio: 'pipe' });
cp(EVIDENCE_DIR, TMP2);

const s1 = snapshot(TMP1);
const s2 = snapshot(TMP2);
const rows = s1.map((a, i) => ({ file: a.file, sha1: a.hash, sha2: s2[i]?.hash || 'MISSING' }));
const drift = rows.filter((r) => r.sha1 !== r.sha2);
const status = drift.length ? 'FAIL' : 'PASS';
const reason = drift.length ? 'RAW_NONDETERMINISM' : 'NONE';

const hints = [];
for (const d of drift.slice(0, 5)) {
  const a = s1.find((x) => x.file === d.file)?.content.split('\n') || [];
  const b = s2.find((x) => x.file === d.file)?.content.split('\n') || [];
  for (let i = 0; i < Math.max(a.length, b.length) && hints.length < 10; i += 1) {
    if ((a[i] || '') !== (b[i] || '')) {
      hints.push(`${d.file} L${i + 1}`);
      break;
    }
  }
}

const report = `# RAW_STABILITY_REPORT\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN1_ID: ${RUN_ID}-raw1\nRUN2_ID: ${RUN_ID}-raw2\nNEXT_ACTION: ${status === 'PASS' ? 'Proceed to DETERMINISM_X2.' : 'Patch volatile producer output listed in DIFF_HINTS.'}\n\n## FILE_HASH_MATRIX\n${rows.map((r) => `- ${r.file} | sha256_run1=${r.sha1} | sha256_run2=${r.sha2}`).join('\n')}\n\n## DIFF_HINTS\n${hints.length ? hints.map((h) => `- ${h}`).join('\n') : '- NONE'}\n`;
fs.writeFileSync(path.join(EVIDENCE_DIR, 'RAW_STABILITY_REPORT.md'), report);
fs.rmSync(TMP1, { recursive: true, force: true });
fs.rmSync(TMP2, { recursive: true, force: true });

if (status !== 'PASS') process.exit(1);
console.log('[PASS] edge:raw:x2');
