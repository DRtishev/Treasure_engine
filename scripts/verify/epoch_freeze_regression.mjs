#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const LEDGER_PATH = path.resolve('specs/epochs/LEDGER.json');
const EVIDENCE_ROOT = path.resolve('reports/evidence');
const STANDARD_FILES = new Set(['PREFLIGHT.log', 'COMMANDS.log', 'SNAPSHOT.md', 'SUMMARY.md', 'VERDICT.md', 'SHA256SUMS.EVIDENCE', 'pack_index.json']);

function fail(msg) {
  console.error(`verify:epochs:freeze FAILED\n- ${msg}`);
  process.exit(1);
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function parseShaSums(filePath) {
  const map = new Map();
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^([a-f0-9]{64})\s+\*?\.?\/?(.+)$/);
    if (!m) continue;
    map.set(m[2], m[1]);
  }
  return map;
}

function mutableEvidencePath(rel) {
  if (rel.startsWith('gates/manual/')) return true;
  if (rel.startsWith('gates/')) return false;
  if (STANDARD_FILES.has(rel)) return false;
  return /\.(json|jsonl)$/i.test(rel);
}

const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));

function verifyCommandForEpoch(epoch) {
  const script = `verify:epoch${String(epoch)}`;
  return packageJson.scripts?.[script] ? script : null;
}

function run(cmd, args, env = process.env) {
  const out = spawnSync(cmd, args, { encoding: 'utf8', env });
  if (out.stdout) process.stdout.write(out.stdout);
  if (out.stderr) process.stderr.write(out.stderr);
  return out;
}

if (!fs.existsSync(LEDGER_PATH)) fail('missing specs/epochs/LEDGER.json');
if (!fs.existsSync(EVIDENCE_ROOT)) fail('missing reports/evidence directory');
const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));

const doneStage2 = Object.entries(ledger.epochs ?? {})
  .map(([k, v]) => ({ epoch: Number(k), row: v }))
  .filter(({ epoch, row }) => Number.isInteger(epoch) && epoch >= 41 && row?.status === 'DONE')
  .map(({ epoch }) => epoch);

const withPackIndex = fs.readdirSync(EVIDENCE_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^EPOCH-\d+$/.test(d.name))
  .map((d) => Number(d.name.slice('EPOCH-'.length)))
  .filter((e) => Number.isInteger(e))
  .filter((e) => fs.existsSync(path.join(EVIDENCE_ROOT, `EPOCH-${String(e).padStart(2, '0')}`, 'pack_index.json')));

const targets = [...new Set([...doneStage2, ...withPackIndex])].sort((a, b) => a - b);
const latestDone = doneStage2.length ? Math.max(...doneStage2) : 0;
if (targets.length === 0) fail('no epochs selected for freeze regression');

let failures = 0;
for (const epoch of targets) {
  const epochId = `EPOCH-${String(epoch).padStart(2, '0')}`;
  const epochDir = path.join(EVIDENCE_ROOT, epochId);
  const shaPath = path.join(epochDir, 'SHA256SUMS.EVIDENCE');
  if (!fs.existsSync(shaPath)) {
    console.error(`- ${epochId}: missing SHA256SUMS.EVIDENCE`);
    failures += 1;
    continue;
  }

  const script = verifyCommandForEpoch(epoch);
  if (!script && epoch === latestDone) {
    console.log(`freeze SKIP ${epochId} (latest DONE epoch has no verifier script yet)`);
    continue;
  }

  const packVerify = run('node', ['scripts/evidence/packager.mjs', 'pack:verify', '--id', String(epoch)]);
  if (packVerify.status !== 0) {
    console.error(`- ${epochId}: pack integrity failed`);
    failures += 1;
    continue;
  }

  const expected = parseShaSums(shaPath);
  const targetPaths = [...expected.keys()].filter(mutableEvidencePath);

  if (!script) {
    if (targetPaths.length > 0) {
      console.error(`- ${epochId}: missing verifier script (expected mutable files=${targetPaths.length})`);
      failures += 1;
    } else {
      console.log(`freeze SKIP ${epochId} (no verifier + no mutable paths)`);
    }
    continue;
  }

  const probe = run('npm', ['run', '-s', script], { ...process.env, EVIDENCE_EPOCH: epochId, EVIDENCE_WRITE_MODE: 'ASSERT_NO_DIFF' });
  if (probe.status !== 0) {
    console.error(`- ${epochId}: ${script} failed under ASSERT_NO_DIFF`);
    failures += 1;
    continue;
  }

  const tempRoot = path.join('.tmp', 'epoch_freeze', epochId);
  const diffs = [];
  for (const rel of targetPaths) {
    const oldSha = expected.get(rel);
    const generated = path.join(tempRoot, rel);
    if (!fs.existsSync(generated)) {
      diffs.push({ path: rel, old: oldSha, new: 'MISSING' });
      continue;
    }
    const newSha = sha256(generated);
    if (oldSha !== newSha) diffs.push({ path: rel, old: oldSha, new: newSha });
  }
  if (diffs.length > 0) {
    console.error(`- ${epochId}: evidence drift detected`);
    for (const d of diffs) console.error(`  * ${d.path}\n    old=${d.old}\n    new=${d.new}`);
    failures += 1;
    continue;
  }
  console.log(`freeze PASS ${epochId}`);
}

if (failures > 0) fail(`${failures} epoch(s) drifted or failed`);
console.log(`verify:epochs:freeze PASSED (epochs=${targets.length})`);
