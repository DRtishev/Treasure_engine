import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const CLEAN_MD = path.join(EXEC_DIR, 'CLEAN_BASELINE.md');

const TARGETS = [
  path.join(ROOT, 'reports', 'evidence', 'EXECUTOR'),
  path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'sandbox'),
  path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'stub'),
];

function clearChildren(dir) {
  const rel = path.relative(ROOT, dir).split(path.sep).join('/');
  if (!fs.existsSync(dir)) {
    return { dir: rel, existed: false, removed: 0 };
  }
  let removed = 0;
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    removed += 1;
  }
  return { dir: rel, existed: true, removed };
}

const results = TARGETS.map(clearChildren);
fs.mkdirSync(EXEC_DIR, { recursive: true });

const md = [
  '# CLEAN_BASELINE.md',
  '',
  'STATUS: PASS',
  'REASON_CODE: NONE',
  `RUN_ID: ${RUN_ID}`,
  'NEXT_ACTION: npm run -s executor:run:chain',
  '',
  '## Cleared directories (children only)',
  '',
  ...results.map((r) => `- ${r.dir} | existed=${r.existed} | removed_entries=${r.removed}`),
  '',
].join('\n');

writeMd(CLEAN_MD, md);
console.log('[PASS] executor_clean_baseline — NONE');
