import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const evidenceRoot = path.join(ROOT, 'reports/evidence');
const dirs = fs.readdirSync(evidenceRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith('EPOCH-NODEAUTH-'))
  .map((d) => d.name)
  .sort((a, b) => a.localeCompare(b));

const offenders = dirs.filter((d) => d.includes('EPOCH-NODEAUTH-NODEAUTH_'));
const receiptPaths = dirs
  .map((d) => path.join('reports/evidence', d, 'node_authority', 'receipt.json'))
  .filter((rel) => fs.existsSync(path.join(ROOT, rel)));
const canonicalReceiptPrefix = receiptPaths.every((p) => /^reports\/evidence\/EPOCH-NODEAUTH-[^/]+\/node_authority\/receipt\.json$/.test(p));

const status = offenders.length === 0 && canonicalReceiptPrefix ? 'PASS' : 'BLOCKED';
const reason_code = status === 'PASS' ? 'NONE' : 'RG_NODEAUTH01';

writeMd(path.join(EXEC, 'REGRESSION_NODEAUTH01_PATH_CANONICAL.md'), `# REGRESSION_NODEAUTH01_PATH_CANONICAL.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s epoch:victory:seal\n\n- epoch_nodeauth_dirs_n: ${dirs.length}\n- receipt_paths_n: ${receiptPaths.length}\n- canonical_receipt_prefix: ${canonicalReceiptPrefix}\n- double_prefix_offenders_n: ${offenders.length}\n\n## DOUBLE_PREFIX_OFFENDERS\n${offenders.map((o) => `- ${o}`).join('\n') || '- none'}\n`);

writeJsonDeterministic(path.join(MANUAL, 'regression_nodeauth01_path_canonical.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  epoch_nodeauth_dirs_n: dirs.length,
  receipt_paths_n: receiptPaths.length,
  canonical_receipt_prefix: canonicalReceiptPrefix,
  double_prefix_offenders: offenders,
  receipt_paths: receiptPaths,
});

console.log(`[${status}] regression_nodeauth01_path_canonical — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
