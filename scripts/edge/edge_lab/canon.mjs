import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

export const RUN_ID = process.env.TREASURE_RUN_ID
  || process.env.GITHUB_SHA
  || execSync('git rev-parse --short=12 HEAD', { encoding: 'utf8' }).trim();

export function canonRelPath(root, p) {
  return path.relative(root, p).split(path.sep).join('/');
}

export function canonSort(arr) {
  return [...arr].sort((a, b) => String(a).localeCompare(String(b), 'en'));
}

export function canonNum(n, dp = 4) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 'NaN';
  return Number(x.toFixed(dp));
}

export function canonLines(text) {
  return String(text)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n*$/, '\n');
}

export function canonTable(rows) {
  return canonSort(rows).join('\n');
}

export function writeMd(file, content) {
  fs.writeFileSync(file, canonLines(content));
}

export function stableEvidenceNormalize(content) {
  return canonLines(String(content)
    .replace(/generated_at:\s*.+/gi, `generated_at: ${RUN_ID}`)
    .replace(/Started:\s*.+/gi, `Started: ${RUN_ID}`)
    .replace(/Completed:\s*.+/gi, `Completed: ${RUN_ID}`)
    .replace(/\(\d+ms\)/g, '(RUN_MS)')
    .replace(/after \d+ms/gi, 'after RUN_MS')
    .replace(/20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z/g, RUN_ID));
}

export function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}
