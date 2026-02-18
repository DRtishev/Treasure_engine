#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File } from '../verify/e66_lib.mjs';
import { getCapsulePinDir, getRunDir, writeMdAtomic } from '../verify/e113_lib.mjs';

const pin = getCapsulePinDir();
const run = getRunDir();
const out = path.resolve('artifacts/incoming/E113_REPLAY_BUNDLE.tar.gz');
const tarTmp = path.resolve('artifacts/incoming/E113_REPLAY_BUNDLE.tar');
if (!fs.existsSync(pin)) throw new Error('E113_PIN_NOT_FOUND');

const include = [
  path.relative(process.cwd(), pin),
  path.relative(process.cwd(), path.join(run, 'raw')),
  path.relative(process.cwd(), path.join(run, 'normalized')),
  'reports/evidence/E113/NET_PROOF.md',
  'reports/evidence/E113/REALITY_FUEL.md',
  'reports/evidence/E113/CAPSULE_MANIFEST.md'
].filter(p => fs.existsSync(path.resolve(p))).sort();

const tarArgs = ['--sort=name', '--mtime=@1700000000', '--owner=0', '--group=0', '--numeric-owner', '-cf', tarTmp, ...include];
const t = spawnSync('tar', tarArgs, { stdio: 'inherit' });
if ((t.status ?? 1) !== 0) throw new Error('E113_BUNDLE_TAR_FAIL');
const g = spawnSync('gzip', ['-n', '-f', tarTmp], { stdio: 'inherit' });
if ((g.status ?? 1) !== 0) throw new Error('E113_BUNDLE_GZIP_FAIL');
if (!fs.existsSync(out)) throw new Error('E113_BUNDLE_MISSING_AFTER_GZIP');
const hash = sha256File(out);
writeMdAtomic('reports/evidence/E113/REPLAY_BUNDLE.md', [
  '# E113 REPLAY BUNDLE',
  `- bundle_path: <REPO_ROOT>/artifacts/incoming/E113_REPLAY_BUNDLE.tar.gz`,
  `- bundle_sha256: ${hash}`,
  `- creation_command: tar ${tarArgs.join(' ')} && gzip -n -f artifacts/incoming/E113_REPLAY_BUNDLE.tar`,
  '## Included Paths',
  ...include.map(p => `- <REPO_ROOT>/${p}`)
].join('\n'));
console.log(`e113_build_replay_bundle: sha256=${hash}`);
