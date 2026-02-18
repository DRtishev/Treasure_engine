#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
const r=spawnSync('node',['scripts/data/e125_egress_diag.mjs'],{stdio:'inherit',env:{...process.env}}); process.exit(r.status??1);
