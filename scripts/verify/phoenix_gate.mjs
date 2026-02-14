#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildCacheKey, cacheRead, cacheWrite, sha256File } from './cache_utils.mjs';

const critical = ['verify:phoenix', 'verify:ledger', 'verify:release', 'verify:baseline'];


for (const [k, v] of Object.entries({
  CI: 'true',
  LEDGER_PACK_VERIFY: '1',
  RELEASE_BUILD: '1',
  RELEASE_STRICT: '1'
})) {
  if (!process.env[k]) process.env[k] = v;
}

function runNpm(script, required = true) {
  const r = spawnSync('npm', ['run', '-s', script], { stdio: 'inherit', env: process.env, encoding: 'utf8' });
  if ((r.status ?? 1) !== 0 && required) throw new Error(`${script} failed`);
  return r.status ?? 1;
}

function runCmd(cmd, args, required = true) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: process.env, encoding: 'utf8' });
  if ((r.status ?? 1) !== 0 && required) throw new Error(`${cmd} ${args.join(' ')} failed`);
  return r.status ?? 1;
}

function emitKillPack(failedGate) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const epochId = `EPOCH-KILL-${stamp}`;
  const dir = path.resolve('reports/evidence', epochId);
  fs.mkdirSync(path.join(dir, 'gates', 'manual'), { recursive: true });
  const summary = { status: 'TRIGGERED', failed_gate: failedGate, critical, at: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, 'gates/manual/kill_criteria_report.json'), `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'SUMMARY.md'), `# ${epochId}\n- kill criteria triggered on ${failedGate}\n`);
  fs.writeFileSync(path.join(dir, 'VERDICT.md'), `# ${epochId} VERDICT\n- Verdict: BLOCKED\n`);
  fs.writeFileSync(path.join(dir, 'SNAPSHOT.md'), `# ${epochId} SNAPSHOT\n- failed_gate: ${failedGate}\n`);
  fs.writeFileSync(path.join(dir, 'PREFLIGHT.log'), `kill=true\n`);
  fs.writeFileSync(path.join(dir, 'COMMANDS.log'), `verify:phoenix\n`);
  const packIndex = { epoch_id: epochId, commit_sha: (spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout || '').trim(), date: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, 'pack_index.json'), `${JSON.stringify(packIndex, null, 2)}\n`);
  const files = ['PREFLIGHT.log','COMMANDS.log','SNAPSHOT.md','SUMMARY.md','VERDICT.md','pack_index.json','gates/manual/kill_criteria_report.json'];
  const sums = files.map((f)=>`${sha256File(path.join(dir,f))}  ./${f}`).join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'SHA256SUMS.EVIDENCE'), sums);
  return { epochId, dir };
}

function runCritical(script) {
  const statuses = [];
  for (let i = 0; i < 2; i += 1) {
    const st = spawnSync('npm', ['run', '-s', script], { stdio: 'inherit', env: process.env }).status ?? 1;
    statuses.push(st);
    if (st === 0) return { status: 0, attempts: i + 1, statuses };
  }
  const kill = emitKillPack(script);
  return { status: 1, attempts: 2, statuses, kill };
}

const cacheOn = process.env.PHOENIX_CACHE === '1';
const { key, payload } = buildCacheKey({
  stage: 'phoenix',
  extraFiles: ['scripts/verify/phoenix_gate.mjs', 'scripts/verify/cache_utils.mjs', 'package.json'],
  envKeys: ['CI', 'RELEASE_BUILD', 'RELEASE_STRICT', 'LEDGER_PACK_VERIFY', 'ASSERT_NO_DIFF']
});
if (cacheOn) {
  const hit = cacheRead('phoenix', key);
  if (hit?.summary?.status === 0) {
    console.log(`[cache:phoenix] HIT ${key}`);
    process.exit(0);
  }
  console.log(`[cache:phoenix] MISS ${key}`);
}

let status = 0;
let killReport = null;
try {
  runNpm('verify:specs');
  runNpm('verify:repo');
  runNpm('verify:manifest');
  runNpm('verify:determinism:strict');

  const led = runCritical('verify:ledger');
  if (led.status !== 0) throw new Error(`critical gate failed verify:ledger`);

  runNpm('verify:epochs:sweep');
  runNpm('verify:epochs:freeze');
  runNpm('verify:edge');
  runNpm('verify:treasure');

  const rel = runCritical('verify:release');
  if (rel.status !== 0) throw new Error('critical gate failed verify:release');

  const base = runCritical('verify:baseline');
  if (base.status !== 0) throw new Error('critical gate failed verify:baseline');

  runCmd('npm', ['run', '-s', 'verify:evidence:commit_binding'], false);
} catch (e) {
  status = 1;
  killReport = { error: String(e.message || e) };
}

if (cacheOn) {
  cacheWrite('phoenix', key, { status, key, at: new Date().toISOString(), payload, killReport });
}
if (status !== 0) {
  console.error('verify:phoenix FAILED');
  process.exit(1);
}

const releases = ['artifacts/out/FINAL_VALIDATED.zip', 'artifacts/out/evidence_chain.tar.gz'].filter((p) => fs.existsSync(p));
const release_hashes = Object.fromEntries(releases.map((p) => [p, sha256File(p)]));
fs.mkdirSync('reports/truth', { recursive: true });
fs.writeFileSync('reports/truth/phoenix_summary.json', `${JSON.stringify({ status: 'PASS', key, release_hashes }, null, 2)}\n`);
console.log('verify:phoenix PASSED');
