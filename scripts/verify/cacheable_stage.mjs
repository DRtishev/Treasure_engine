#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { buildCacheKey, cacheRead, cacheWrite } from './cache_utils.mjs';

const [stage, ...cmd] = process.argv.slice(2);
if (!stage || cmd.length === 0) {
  console.error('usage: node cacheable_stage.mjs <stage> <cmd...>');
  process.exit(2);
}

const cacheOn = process.env.PHOENIX_CACHE === '1';
const { key, payload } = buildCacheKey({
  stage,
  extraFiles: ['scripts/verify/cacheable_stage.mjs', 'scripts/verify/cache_utils.mjs'],
  envKeys: ['CI', 'RELEASE_BUILD', 'RELEASE_STRICT', 'LEDGER_PACK_VERIFY', 'ASSERT_NO_DIFF']
});

if (cacheOn) {
  const hit = cacheRead(stage, key);
  if (hit?.summary?.status === 0) {
    console.log(`[cache:${stage}] HIT ${key}`);
    process.exit(0);
  }
  console.log(`[cache:${stage}] MISS ${key}`);
}

const run = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', env: process.env, shell: false });
const status = run.status ?? 1;
if (cacheOn) cacheWrite(stage, key, { status, key, at: new Date().toISOString(), payload });
process.exit(status);
