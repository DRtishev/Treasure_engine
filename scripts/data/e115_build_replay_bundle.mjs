#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File } from '../verify/e66_lib.mjs';
import { runDirE115, pinDirE115, writeMdAtomic } from '../verify/e115_lib.mjs';

const run=runDirE115(), pin=pinDirE115(); const tar='artifacts/incoming/E115_REPLAY_BUNDLE.tar'; const out='artifacts/incoming/E115_REPLAY_BUNDLE.tar.gz';
const include=[path.relative(process.cwd(),pin),path.relative(process.cwd(),path.join(run,'raw')),path.relative(process.cwd(),path.join(run,'normalized')),'reports/evidence/E115/NET_FULLNESS.md','reports/evidence/E115/INPUT_BINDING.md','reports/evidence/E115/SNAPSHOT_INTEGRITY.md'].filter(p=>fs.existsSync(path.resolve(p))).sort();
let r=spawnSync('tar',['--sort=name','--mtime=@1700000000','--owner=0','--group=0','--numeric-owner','-cf',tar,...include],{stdio:'inherit'}); if((r.status??1)!==0) throw new Error('E115_BUNDLE_TAR_FAIL');
r=spawnSync('gzip',['-n','-f',tar],{stdio:'inherit'}); if((r.status??1)!==0) throw new Error('E115_BUNDLE_GZIP_FAIL');
const h=sha256File(out);
writeMdAtomic('reports/evidence/E115/REPLAY_BUNDLE.md',['# E115 REPLAY BUNDLE',`- bundle_path: <REPO_ROOT>/${out}`,`- bundle_sha256: ${h}`,'## Included Paths',...include.map(x=>`- <REPO_ROOT>/${x}`)].join('\n'));
console.log(`e115_build_replay_bundle: ${h}`);
