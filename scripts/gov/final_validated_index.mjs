import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const GOV_DIR = path.join(ROOT, 'reports', 'evidence', 'GOV');
const CONTRACT_PATH = path.join(ROOT, 'GOV', 'EXPORT_CONTRACT.md');
const PASS_NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';
const PREVIEW_N = Number(process.env.FINAL_INDEX_PREVIEW_N || 200);
const fullMode = process.argv.includes('--full');

fs.mkdirSync(GOV_DIR, { recursive: true });

function readContract() {
  if (!fs.existsSync(CONTRACT_PATH)) return null;
  const kv = {};
  for (const line of fs.readFileSync(CONTRACT_PATH, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    kv[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return kv;
}

const contract = readContract();
const evidenceEpoch = process.env.EVIDENCE_EPOCH || contract?.EVIDENCE_EPOCH_DEFAULT || 'EPOCH-EDGE-RC-STRICT-01';
const finalRel = String(contract?.FINAL_VALIDATED_PRIMARY_PATH || '')
  .replaceAll('${EVIDENCE_EPOCH}', evidenceEpoch)
  .replace(/\\/g, '/');
const finalAbs = path.join(ROOT, finalRel);

let status = 'PASS';
let reasonCode = 'NONE';
let nextAction = PASS_NEXT_ACTION;
let rows = [];
let entryCount = 0;
let totalBytes = 0;
const topLevelCounts = new Map();

if (!finalRel || !fs.existsSync(finalAbs)) {
  status = 'BLOCKED';
  reasonCode = 'EC02';
  nextAction = 'npm run -s export:final-validated';
} else {
  const tvf = spawnSync('tar', ['-tvf', finalAbs], { cwd: ROOT, encoding: 'utf8' });
  if (tvf.status !== 0) {
    status = 'BLOCKED';
    reasonCode = 'EC02';
    nextAction = 'npm run -s export:final-validated';
  } else {
    const parsed = [];
    for (const line of tvf.stdout.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      const m = t.match(/^(\S+)\s+\S+\s+(\d+)\s+\S+\s+\S+\s+(.+)$/);
      if (!m) continue;
      const entryPath = String(m[3]).trim();
      if (!entryPath || entryPath.endsWith('/')) continue;
      const top = entryPath.split('/')[0];
      const sizeBytes = Number(m[2]) || 0;
      parsed.push({ top_level: top, entry_path: entryPath, size_bytes: sizeBytes });
      entryCount += 1;
      totalBytes += sizeBytes;
      topLevelCounts.set(top, (topLevelCounts.get(top) || 0) + 1);
    }
    parsed.sort((a, b) => a.entry_path.localeCompare(b.entry_path));
    const effective = fullMode ? parsed : parsed.slice(0, PREVIEW_N);
    rows = effective.map((r) => `| ${r.top_level} | ${r.entry_path} | ${r.size_bytes} |`);
  }
}

const topLevelRows = [...topLevelCounts.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([name, count]) => `| ${name} | ${count} |`);

const md = `# FINAL_VALIDATED_INDEX.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n- contract_path: GOV/EXPORT_CONTRACT.md\n- evidence_epoch: ${evidenceEpoch}\n- final_validated_path: ${finalRel || 'MISSING'}\n- final_validated_exists: ${fs.existsSync(finalAbs)}\n- mode: ${fullMode ? 'FULL' : 'COMPACT'}\n- preview_n: ${fullMode ? 'ALL' : PREVIEW_N}\n\n## Totals\n\n- entry_count: ${entryCount}\n- total_bytes: ${totalBytes}\n\n## Top-level summary\n\n| top_level | entry_count |\n|---|---:|\n${topLevelRows.length ? topLevelRows.join('\n') : '| NONE | 0 |'}\n\n## Tar Entries (${fullMode ? 'full listing' : `first ${PREVIEW_N}`})\n\n| top_level | entry_path | size_bytes |\n|---|---|---:|\n${rows.length ? rows.join('\n') : '| NONE | NONE | 0 |'}\n`;

writeMd(path.join(GOV_DIR, 'FINAL_VALIDATED_INDEX.md'), md);

console.log(`[${status}] final_validated_index — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
