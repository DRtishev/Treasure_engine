#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { CAPSULE_DIR, CAPSULE_NAME, CAPSULE_SHA, CAPSULE_TAR, E141_ROOT, OFFICIAL_SHASUMS_URL, OFFICIAL_TAR_URL, PIN, PINNED_SHA, PLATFORM, writeMd } from './e141_lib.mjs';

export function writeCapsuleDocs({ satisfied=false }={}){
  fs.mkdirSync(CAPSULE_DIR,{recursive:true});
  writeMd(path.join(E141_ROOT,'NODE_CAPSULE_SPEC.md'),[
    '# E141 NODE CAPSULE SPEC',
    `- pin_version: ${PIN}`,
    `- platform: ${PLATFORM}`,
    `- capsule_name: ${CAPSULE_NAME}`,
    `- destination: ${CAPSULE_TAR}`,
    `- sha_file: ${CAPSULE_SHA}`,
    `- expected_sha256: ${PINNED_SHA}`,
    '## RAW',
    `- official_tar_url: ${OFFICIAL_TAR_URL}`,
    `- official_shasums_url: ${OFFICIAL_SHASUMS_URL}`,
  ].join('\n'));
  writeMd(path.join(E141_ROOT,'NODE_CAPSULE_REQUEST.md'),[
    '# E141 NODE CAPSULE REQUEST',
    `- status: ${satisfied?'SATISFIED':'REQUEST_REQUIRED'}`,
    `- pin_version: ${PIN}`,
    `- platform: ${PLATFORM}`,
    `- required_file_1: ${CAPSULE_NAME}`,
    `- required_file_2: ${path.basename(CAPSULE_SHA)}`,
    `- destination_dir: artifacts/incoming/node/`,
    `- expected_sha256: ${PINNED_SHA}`,
    '## RAW',
    `- fetch_url: ${OFFICIAL_TAR_URL}`,
    `- shasums_url: ${OFFICIAL_SHASUMS_URL}`,
    '- place_then_run: CI=true npm run -s verify:e141',
  ].join('\n'));
}
if(process.argv[1]===new URL(import.meta.url).pathname) writeCapsuleDocs({satisfied:fs.existsSync(CAPSULE_TAR)});
