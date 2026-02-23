import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const REGISTRY_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REGISTRY_DIR, 'gates', 'manual');
const CONTRACT_PATH = path.join(ROOT, 'GOV', 'EXPORT_CONTRACT.md');
const NEXT_ACTION = 'npm run -s export:final-validated';

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function sha256File(absPath) {
  const data = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readContract() {
  if (!fs.existsSync(CONTRACT_PATH)) return null;
  const raw = fs.readFileSync(CONTRACT_PATH, 'utf8');
  const kv = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const key = t.slice(0, i).trim();
    const value = t.slice(i + 1).trim();
    if (key) kv[key] = value;
  }
  return kv;
}

function expandContractPath(template, evidenceEpoch) {
  return template.replaceAll('${EVIDENCE_EPOCH}', evidenceEpoch);
}

const contract = readContract();
const contractKeys = [
  'FINAL_VALIDATED_PRIMARY_PATH',
  'EVIDENCE_CHAIN_PRIMARY_PATH',
  'FINAL_VALIDATED_SHA256_SIDECAR_PATH',
];
const evidenceEpoch = process.env.EVIDENCE_EPOCH || contract?.EVIDENCE_EPOCH_DEFAULT || 'EPOCH-EDGE-RC-STRICT-01';

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Release artifacts present with sha256 checksums.';
let artifacts = [];
let missing = [];
let contractError = null;

if (!contract || !contractKeys.every((k) => typeof contract[k] === 'string' && contract[k].length > 0)) {
  status = 'NEEDS_DATA';
  reasonCode = 'RA02';
  message = 'Export contract missing or unparseable.';
  contractError = 'missing_or_unparseable_contract';
} else {
  const resolved = [
    { key: 'FINAL_VALIDATED_PRIMARY_PATH', rel: expandContractPath(contract.FINAL_VALIDATED_PRIMARY_PATH, evidenceEpoch) },
    { key: 'EVIDENCE_CHAIN_PRIMARY_PATH', rel: expandContractPath(contract.EVIDENCE_CHAIN_PRIMARY_PATH, evidenceEpoch) },
    { key: 'FINAL_VALIDATED_SHA256_SIDECAR_PATH', rel: expandContractPath(contract.FINAL_VALIDATED_SHA256_SIDECAR_PATH, evidenceEpoch) },
  ];

  artifacts = resolved.map((item) => {
    const abs = path.join(ROOT, item.rel);
    const present = fs.existsSync(abs);
    return {
      contract_key: item.key,
      path: item.rel.replace(/\\/g, '/'),
      present,
      sha256: present ? sha256File(abs) : 'MISSING',
    };
  });

  missing = artifacts.filter((a) => !a.present).map((a) => `${a.contract_key}:${a.path}`);
  if (missing.length > 0) {
    status = 'NEEDS_DATA';
    reasonCode = 'RA01';
    message = 'Release artifacts missing; export is required.';
  }
}

const md = `# RELEASE_ARTIFACTS.md — EDGE_PROFIT_00\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n## Contract\n\n- contract_path: GOV/EXPORT_CONTRACT.md\n- contract_loaded: ${Boolean(contract)}\n- evidence_epoch: ${evidenceEpoch}\n- contract_error: ${contractError || 'NONE'}\n\n## Artifact Checks\n\n${artifacts.length ? artifacts.map((a) => `- ${a.contract_key}: ${a.present ? 'PRESENT' : 'MISSING'} | ${a.path} | sha256=${a.sha256}`).join('\n') : '- NONE'}\n\n## Missing\n\n${missing.length ? missing.map((m) => `- ${m}`).join('\n') : '- NONE'}\n`;

writeMd(path.join(REGISTRY_DIR, 'RELEASE_ARTIFACTS.md'), md);

writeJsonDeterministic(path.join(MANUAL_DIR, 'release_artifacts.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  contract_path: 'GOV/EXPORT_CONTRACT.md',
  contract_loaded: Boolean(contract),
  evidence_epoch: evidenceEpoch,
  contract_error: contractError || 'NONE',
  artifacts,
  missing,
});

console.log(`[${status}] edge_profit_00_release_artifacts_gate — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
