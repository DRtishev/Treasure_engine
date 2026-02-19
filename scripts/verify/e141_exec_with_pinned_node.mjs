#!/usr/bin/env node
import path from 'node:path';
import { BOOT_NODE, E141_ROOT, run, writeMd } from './e141_lib.mjs';

export function execWithPinned(args){
  const r=run(BOOT_NODE,args,{env:process.env});
  writeMd(path.join(E141_ROOT,'EXEC_BRIDGE.md'),[
    '# E141 EXEC BRIDGE',
    `- status: ${r.ec===0?'PASS':'FAIL'}`,
    `- node_bin: ${BOOT_NODE}`,
    `- command: ${args.join(' ')}`,
    `- ec: ${r.ec}`,
    '## RAW',
    '```',
    r.out || r.err || '',
    '```',
  ].join('\n'));
  return r;
}
if(process.argv[1]===new URL(import.meta.url).pathname) process.exit(execWithPinned(process.argv.slice(2)).ec);
