#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File } from '../verify/e66_lib.mjs';
import { runDirE114, pinDirE114, writeMdAtomic } from '../verify/e114_lib.mjs';

const run=runDirE114(), pin=pinDirE114();
const out='artifacts/incoming/E114_REPLAY_BUNDLE.tar.gz'; const tar='artifacts/incoming/E114_REPLAY_BUNDLE.tar';
const include=[path.relative(process.cwd(),pin),path.relative(process.cwd(),path.join(run,'normalized')),path.relative(process.cwd(),path.join(run,'raw')),'reports/evidence/E114/NET_PROOF.md','reports/evidence/E114/REALITY_FUEL.md','reports/evidence/E114/CAPSULE_MANIFEST.md'].filter(p=>fs.existsSync(path.resolve(p))).sort();
const t=spawnSync('tar',['--sort=name','--mtime=@1700000000','--owner=0','--group=0','--numeric-owner','-cf',tar,...include],{stdio:'inherit'}); if((t.status??1)!==0) throw new Error('E114_BUNDLE_TAR_FAIL');
const g=spawnSync('gzip',['-n','-f',tar],{stdio:'inherit'}); if((g.status??1)!==0) throw new Error('E114_BUNDLE_GZIP_FAIL');
const h=sha256File(out);
writeMdAtomic('reports/evidence/E114/REPLAY_BUNDLE.md',['# E114 REPLAY BUNDLE',`- bundle_path: <REPO_ROOT>/${out}`,`- bundle_sha256: ${h}`,'## Included Paths',...include.map(x=>`- <REPO_ROOT>/${x}`)].join('\n'));
console.log(`e114_build_replay_bundle: ${h}`);
