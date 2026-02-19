#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E141_ROOT = path.resolve('reports/evidence/E141');
const RAW_PIN = (fs.existsSync('.node-version') ? fs.readFileSync('.node-version','utf8') : (fs.existsSync('.nvmrc') ? fs.readFileSync('.nvmrc','utf8') : '24.12.0')).trim().replace(/^v/, '');
export const PIN = /^\d+$/.test(RAW_PIN) ? `${RAW_PIN}.12.0` : RAW_PIN;
export const PLATFORM = `${process.platform}-${process.arch === 'x64' ? 'x64' : process.arch}`;
export const CAPSULE_NAME = `node-v${PIN}-${PLATFORM}.tar.xz`;
export const CAPSULE_DIR = path.resolve('artifacts/incoming/node');
export const CAPSULE_TAR = path.join(CAPSULE_DIR, CAPSULE_NAME);
export const CAPSULE_SHA = `${CAPSULE_TAR}.sha256`;
export const BOOT_DIR = path.resolve(`tools/node/v${PIN}/${PLATFORM}`);
export const BOOT_NODE = path.join(BOOT_DIR, 'bin/node');
export const OFFICIAL_BASE = `https://nodejs.org/dist/v${PIN}`;
export const OFFICIAL_TAR_URL = `${OFFICIAL_BASE}/${CAPSULE_NAME}`;
export const OFFICIAL_SHASUMS_URL = `${OFFICIAL_BASE}/SHASUMS256.txt`;
export const PINNED_SHA = 'bdebee276e58d0ef5448f3d5ac12c67daa963dd5e0a9bb621a53d1cefbc852fd';

export const REASON = {
  FAIL_NODE_POLICY: 'FAIL_NODE_POLICY', NEED_NODE_CAPSULE: 'NEED_NODE_CAPSULE', SKIP_ONLINE_FLAGS_NOT_SET: 'SKIP_ONLINE_FLAGS_NOT_SET',
  ACQUIRE_OK: 'ACQUIRE_OK', BOOTSTRAP_OK: 'BOOTSTRAP_OK', AUTHORITATIVE_READY: 'AUTHORITATIVE_READY',
  PROBE_ONLY_NON_AUTHORITATIVE: 'PROBE_ONLY_NON_AUTHORITATIVE',
};

export function writeMd(file, content) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${String(content).replace(/\r\n/g,'\n').trimEnd()}\n`, 'utf8'); }
export function run(cmd, args, opts={}) { const r=spawnSync(cmd,args,{encoding:'utf8',...opts}); return { ec:r.status??1, out:(r.stdout||'').trim(), err:(r.stderr||'').trim() }; }
export function env1(k){ return String(process.env[k]||'')==='1'; }
export function nodeMajor(v=process.version){ return Number(String(v).replace(/^v/,'').split('.')[0]||0); }

export function redactedProxy(){ const raw=process.env.HTTPS_PROXY||process.env.HTTP_PROXY||process.env.ALL_PROXY||''; if(!raw) return {present:false,scheme:'none',shape_hash:'none'}; try{const u=new URL(raw); const hp=`${u.hostname}:${u.port|| (u.protocol==='https:'?'443':'80')}`; return {present:true,scheme:u.protocol.replace(':',''),shape_hash:createHash('sha256').update(hp).digest('hex').slice(0,16)};}catch{return {present:true,scheme:'unknown',shape_hash:createHash('sha256').update(raw).digest('hex').slice(0,16)};}}

export function evidenceFingerprintE141(){ const files=fs.existsSync(E141_ROOT)?fs.readdirSync(E141_ROOT).filter(f=>f.endsWith('.md')&&f!=='SEAL_X2.md'&&f!=='SHA256SUMS.md').sort():[]; return sha256Text(files.map(f=>`${f}:${sha256File(path.join(E141_ROOT,f))}`).join('\n')); }

export { sha256File };
