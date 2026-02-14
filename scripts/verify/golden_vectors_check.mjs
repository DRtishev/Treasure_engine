#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const manifestPath = 'scripts/verify/goldens/golden_vectors_manifest.json';
const vectors = [
  { id: 'verify-epoch49', cmd: ['npm', ['run', '-s', 'verify:epoch49']] },
  { id: 'verify-epoch50', cmd: ['npm', ['run', '-s', 'verify:epoch50']] },
  { id: 'verify-epoch56', cmd: ['npm', ['run', '-s', 'verify:epoch56']] }
];

function canonicalizeOutput(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .filter((l) => !l.includes('npm warn Unknown env config "http-proxy"'))
    .join('\n') + '\n';
}

const results = [];
for (const v of vectors) {
  const [bin, args] = v.cmd;
  const res = spawnSync(bin, args, { encoding: 'utf8', env: process.env });
  const output = canonicalizeOutput(`${res.stdout || ''}${res.stderr || ''}`);
  const sha256 = crypto.createHash('sha256').update(output).digest('hex');
  results.push({ id: v.id, exit_code: res.status ?? 1, sha256, output_sample: output.split('\n').slice(-3).join('\n') });
}

const report = {
  vectors: results,
  all_exit_zero: results.every((r) => r.exit_code === 0)
};

let expected = { vectors: [] };
if (fs.existsSync(manifestPath)) expected = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const expectedMap = new Map((expected.vectors || []).map((v) => [v.id, v]));
const mismatches = [];
for (const r of results) {
  const exp = expectedMap.get(r.id);
  if (!exp) mismatches.push(`${r.id}: missing expected vector`);
  else {
    if (exp.sha256 !== r.sha256) mismatches.push(`${r.id}: sha mismatch expected ${exp.sha256} got ${r.sha256}`);
    if (exp.exit_code !== r.exit_code) mismatches.push(`${r.id}: exit_code mismatch expected ${exp.exit_code} got ${r.exit_code}`);
  }
}

if (process.env.UPDATE_GOLDENS === '1') {
  fs.mkdirSync('scripts/verify/goldens', { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify({ generated_at: new Date().toISOString(), vectors: results.map(({ id, sha256, exit_code }) => ({ id, sha256, exit_code })) }, null, 2)}\n`);
  console.log(`verify:golden UPDATED ${manifestPath}`);
}

fs.mkdirSync('reports/truth', { recursive: true });
fs.writeFileSync('reports/truth/golden_vectors_manifest.json', `${JSON.stringify({ expected: expected.vectors || [], actual: results, mismatches }, null, 2)}\n`);

if (!report.all_exit_zero || mismatches.length) {
  console.error('verify:golden FAILED');
  for (const m of mismatches) console.error(`- ${m}`);
  if (!report.all_exit_zero) console.error('- one or more vectors returned non-zero exit');
  process.exit(1);
}
console.log('verify:golden PASSED');
console.log(JSON.stringify({ vectors: results.length, mismatches: 0 }, null, 2));
