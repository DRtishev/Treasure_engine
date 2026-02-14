#!/usr/bin/env node
import fs from 'node:fs';
import { renderKbPortal } from './derived_views.mjs';

const out = 'kb/INDEX.md';
fs.writeFileSync(out, renderKbPortal());
console.log(`truth:kb:portal wrote ${out}`);
