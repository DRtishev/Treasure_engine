#!/usr/bin/env node
import fs from 'node:fs';
const d = fs.readFileSync('reports/evidence/E118/DATA_LINEAGE.md','utf8');
for (const key of ['source_mode','providers_tried','providers_succeeded','fallback_used','fallback_ratio','pinned_snapshot_stamp','freshness_window']) {
  if (!new RegExp(`- ${key}:`).test(d)) throw new Error(`E118_LINEAGE_MISSING:${key}`);
}
console.log('e118_lineage_contract: PASS');
