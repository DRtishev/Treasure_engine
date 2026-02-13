#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const LEDGER_PATH = path.resolve('specs/epochs/LEDGER.json');
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

function run(cmd, args, env = process.env) {
  const out = spawnSync(cmd, args, { encoding: 'utf8', env });
  if (out.stdout) process.stdout.write(out.stdout);
  if (out.stderr) process.stderr.write(out.stderr);
  return out;
}

function listFilesRecursive(dir) {
  const out = [];
  function walk(cur) {
    const entries = fs.readdirSync(cur, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(path.relative(dir, full).replaceAll('\\', '/'));
    }
  }
  walk(dir);
  return out;
}

function hashEvidenceTree(dir) {
  const files = listFilesRecursive(dir);
  return files.map((rel) => `${sha256(path.join(dir, rel))}  ${rel}`).join('\n');
}

if (!fs.existsSync(LEDGER_PATH)) fail('missing specs/epochs/LEDGER.json');

const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
const scripts = packageJson.scripts ?? {};
const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));

const targets = Object.entries(ledger.epochs ?? {})
  .map(([k, row]) => ({ epoch: Number(k), row }))
  .filter(({ epoch, row }) => Number.isInteger(epoch) && row?.stage === 'DONE')
  .sort((a, b) => a.epoch - b.epoch);

if (targets.length === 0) fail('no DONE epochs found in ledger');

let failures = 0;
for (const { epoch, row } of targets) {
  const epochId = row.id || `EPOCH-${String(epoch).padStart(2, '0')}`;
  const evidenceRoot = row.evidence_root;
  if (!evidenceRoot || typeof evidenceRoot !== 'string') {
    console.error(`- ${epochId}: missing evidence_root in ledger`);
    failures += 1;
    continue;
  }
  const epochDir = path.resolve(evidenceRoot);
  if (!fs.existsSync(epochDir) || !fs.statSync(epochDir).isDirectory()) {
    console.error(`- ${epochId}: evidence_root missing dir ${evidenceRoot}`);
    failures += 1;
    continue;
  }

  const shaPath = path.join(epochDir, 'SHA256SUMS.EVIDENCE');
  if (!fs.existsSync(shaPath)) {
    console.error(`- ${epochId}: missing SHA256SUMS.EVIDENCE`);
    failures += 1;
    continue;
  }

  const packVerify = run('node', ['scripts/evidence/packager.mjs', 'pack:verify', '--id', String(epoch)]);
  if (packVerify.status !== 0) {
    console.error(`- ${epochId}: pack integrity failed`);
    failures += 1;
    continue;
  }

  const expected = parseShaSums(shaPath);
  const mutablePaths = [...expected.keys()].filter(mutableEvidencePath);

  let verifier = null;
  const owner = String(row.gate_owner || '').trim();
  if (owner.startsWith('verify:') && scripts[owner]) verifier = owner;
  const fallback = `verify:epoch${epoch}`;
  if (!verifier && scripts[fallback]) verifier = fallback;

  if (!verifier) {
    if (mutablePaths.length > 0) {
      console.error(`- ${epochId}: NO_VERIFIER with mutable evidence paths:`);
      for (const p of mutablePaths) console.error(`  * ${p}`);
      failures += 1;
    } else {
      console.log(`freeze SKIP ${epochId} (NO_VERIFIER and no mutable paths)`);
    }
    continue;
  }

  const before = hashEvidenceTree(epochDir);
  const probeEvidenceEpoch = `EPOCH-FREEZE-${String(epoch).padStart(2, '0')}`;
  const probe = run('npm', ['run', '-s', verifier], { ...process.env, EVIDENCE_EPOCH: probeEvidenceEpoch, EVIDENCE_WRITE_MODE: 'ASSERT_NO_DIFF' });
  const after = hashEvidenceTree(epochDir);

  if (probe.status !== 0) {
    console.error(`- ${epochId}: ${verifier} failed under ASSERT_NO_DIFF`);
    failures += 1;
    continue;
  }
  if (before !== after) {
    console.error(`- ${epochId}: ASSERT_NO_DIFF mutated canonical evidence`);
    failures += 1;
    continue;
  }

  console.log(`freeze PASS ${epochId}`);
}

if (failures > 0) fail(`${failures} epoch(s) drifted or failed`);
console.log(`verify:epochs:freeze PASSED (epochs=${targets.length})`);
