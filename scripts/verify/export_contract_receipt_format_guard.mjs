import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const GOV_DIR = path.join(ROOT, 'reports', 'evidence', 'GOV');
const RECEIPT_PATH = path.join(ROOT, 'GOV', 'EXPORT_CONTRACT_RECEIPT.md');
const PASS_NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';

fs.mkdirSync(GOV_DIR, { recursive: true });

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Receipt format is valid.';
let shaMatches = [];

if (!fs.existsSync(RECEIPT_PATH)) {
  status = 'FAIL';
  reasonCode = 'CT01';
  message = 'Missing export contract receipt.';
} else {
  const text = fs.readFileSync(RECEIPT_PATH, 'utf8');
  shaMatches = [...text.matchAll(/^CONTRACT_SHA256=([a-f0-9]{64})\s*$/gm)];
  if (shaMatches.length !== 1) {
    status = 'FAIL';
    reasonCode = 'CT01';
    message = `Expected exactly one CONTRACT_SHA256 line; got ${shaMatches.length}.`;
  }
}

writeMd(path.join(GOV_DIR, 'EXPORT_CONTRACT_RECEIPT_GUARD.md'), `# EXPORT_CONTRACT_RECEIPT_GUARD.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${PASS_NEXT_ACTION}\n\n- receipt_path: GOV/EXPORT_CONTRACT_RECEIPT.md\n- contract_sha256_line_count: ${shaMatches.length}\n- message: ${message}\n`);

console.log(`[${status}] export_contract_receipt_format_guard — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
