import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const GOV_DIR = path.join(ROOT, 'reports', 'evidence', 'GOV');
const MANUAL_DIR = path.join(GOV_DIR, 'gates', 'manual');
const CONTRACT_PATH = path.join(ROOT, 'GOV', 'EXPORT_CONTRACT.md');
const RECEIPT_PATH = path.join(ROOT, 'GOV', 'EXPORT_CONTRACT_RECEIPT.md');
const PASS_NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function parseReceiptHash(text) {
  const m = text.match(/^CONTRACT_SHA256=([a-f0-9]{64})\s*$/m);
  return m ? m[1] : '';
}

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'EXPORT_CONTRACT integrity verified against pinned receipt hash.';
let contractSha256 = '';
let receiptSha256 = '';
let receiptLoaded = false;

if (!fs.existsSync(CONTRACT_PATH)) {
  status = 'FAIL';
  reasonCode = 'CT01';
  message = 'Missing GOV/EXPORT_CONTRACT.md.';
} else {
  contractSha256 = sha256Text(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  if (!fs.existsSync(RECEIPT_PATH)) {
    status = 'FAIL';
    reasonCode = 'CT01';
    message = 'Missing GOV/EXPORT_CONTRACT_RECEIPT.md (no pinned contract hash receipt).';
  } else {
    receiptLoaded = true;
    receiptSha256 = parseReceiptHash(fs.readFileSync(RECEIPT_PATH, 'utf8'));
    if (!receiptSha256) {
      status = 'FAIL';
      reasonCode = 'CT01';
      message = 'Receipt is present but CONTRACT_SHA256 is missing/invalid.';
    } else if (receiptSha256 !== contractSha256) {
      status = 'FAIL';
      reasonCode = 'CT01';
      message = 'EXPORT_CONTRACT drift detected without updated receipt.';
    }
  }
}

writeMd(path.join(GOV_DIR, 'EXPORT_CONTRACT_INTEGRITY.md'), `# EXPORT_CONTRACT_INTEGRITY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${PASS_NEXT_ACTION}\n\n- contract_path: GOV/EXPORT_CONTRACT.md\n- receipt_path: GOV/EXPORT_CONTRACT_RECEIPT.md\n- receipt_loaded: ${receiptLoaded}\n- contract_sha256: ${contractSha256 || 'MISSING'}\n- receipt_contract_sha256: ${receiptSha256 || 'MISSING'}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'export_contract_integrity.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: PASS_NEXT_ACTION,
  contract_path: 'GOV/EXPORT_CONTRACT.md',
  receipt_path: 'GOV/EXPORT_CONTRACT_RECEIPT.md',
  receipt_loaded: receiptLoaded,
  contract_sha256: contractSha256 || null,
  receipt_contract_sha256: receiptSha256 || null,
});

console.log(`[${status}] export_contract_integrity_gate — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
