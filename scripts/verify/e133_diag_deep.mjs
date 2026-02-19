#!/usr/bin/env node
process.env.FORCE_IPV4 = process.env.FORCE_IPV4 || '1';
await import('./e133_diag.mjs');
