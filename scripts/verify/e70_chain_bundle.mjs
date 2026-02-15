#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256Text } from './e66_lib.mjs';

const EPOCHS = ['E66', 'E67', 'E68', 'E69'];

function readCanonical(epoch) {
  const closeout = path.resolve(`reports/evidence/${epoch}/CLOSEOUT.md`);
  const verdict = path.resolve(`reports/evidence/${epoch}/VERDICT.md`);
  const rawA = fs.readFileSync(closeout, 'utf8');
  const rawB = fs.readFileSync(verdict, 'utf8');
  const a = (rawA.match(/canonical_fingerprint:\s*([a-f0-9]{64})/i) || [])[1] || '';
  const b = (rawB.match(/canonical_fingerprint:\s*([a-f0-9]{64})/i) || [])[1] || '';
  if (!a || !b || a !== b) throw new Error(`${epoch} canonical fingerprint mismatch`);
  return a;
}

function sumsCoreHash(epoch) {
  const sumsPath = path.resolve(`reports/evidence/${epoch}/SHA256SUMS.md`);
  const raw = fs.readFileSync(sumsPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter((line) => {
    if (!/^[a-f0-9]{64}\s{2}/.test(line)) return true;
    if (line.endsWith(` reports/evidence/${epoch}/CLOSEOUT.md`)) return false;
    if (line.endsWith(` reports/evidence/${epoch}/VERDICT.md`)) return false;
    if (line.endsWith(` reports/evidence/${epoch}/SHA256SUMS.md`)) return false;
    return true;
  });
  return sha256Text(`${lines.join('\n').replace(/\s+$/g, '')}\n`);
}

function runVerifyPacks(chainMode) {
  const ciEnv = { ...process.env, CI: 'true', CHAIN_MODE: 'FAST' };
  if (chainMode === 'FULL') {
    const steps = ['verify:e66', 'verify:phoenix:x2', 'verify:evidence', 'verify:e67', 'verify:e68', 'verify:e69'];
    for (const step of steps) {
      const r = spawnSync('npm', ['run', '-s', step], { stdio: 'inherit', env: ciEnv });
      if ((r.status ?? 1) !== 0) throw new Error(`failed ${step}`);
    }
  } else {
    const steps = ['verify:evidence', 'verify:e67:evidence', 'verify:e68:evidence', 'verify:e69:evidence'];
    for (const step of steps) {
      const r = spawnSync('npm', ['run', '-s', step], { stdio: 'inherit', env: ciEnv });
      if ((r.status ?? 1) !== 0) throw new Error(`failed ${step}`);
    }
  }
}

export function buildChainBundle(chainMode = String(process.env.CHAIN_MODE || 'FAST_PLUS').toUpperCase()) {
  if (!['FULL', 'FAST_PLUS', 'FAST'].includes(chainMode)) throw new Error('CHAIN_MODE must be FULL|FAST_PLUS|FAST');
  runVerifyPacks(chainMode);
  const entries = EPOCHS.map((epoch) => ({
    epoch,
    canonical_fingerprint: readCanonical(epoch),
    sums_core_hash: sumsCoreHash(epoch)
  }));
  entries.sort((a, b) => a.epoch.localeCompare(b.epoch));
  const concat = entries.map((e) => `${e.epoch}:${e.canonical_fingerprint}:${e.sums_core_hash}`).join('\n');
  const chain_bundle_fingerprint = sha256Text(`${concat}\n`);
  return { chain_mode: chainMode, entries, chain_bundle_fingerprint };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(buildChainBundle(), null, 2));
}
