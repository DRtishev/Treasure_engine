import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const GOV_DIR = path.join(ROOT, 'reports', 'evidence', 'GOV');
const MANUAL_DIR = path.join(GOV_DIR, 'gates', 'manual');
const CONTRACT_PATH = path.join(ROOT, 'GOV', 'EXPORT_CONTRACT.md');
const PASS_NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

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
const finalRel = String(contract?.FINAL_VALIDATED_PRIMARY_PATH || '').replaceAll('${EVIDENCE_EPOCH}', evidenceEpoch).replace(/\\/g, '/');
const sidecarRel = String(contract?.FINAL_VALIDATED_SHA256_SIDECAR_PATH || '').replaceAll('${EVIDENCE_EPOCH}', evidenceEpoch).replace(/\\/g, '/');
const finalAbs = path.join(ROOT, finalRel);
const sidecarAbs = path.join(ROOT, sidecarRel);

let status = 'PASS';
let reasonCode = 'NONE';
let nextAction = PASS_NEXT_ACTION;
let finalSha = 'MISSING';
let contractSha = fs.existsSync(CONTRACT_PATH) ? sha256File(CONTRACT_PATH) : 'MISSING';
let entryCount = 0;
let totalBytes = 0;

if (!finalRel || !sidecarRel || !fs.existsSync(finalAbs) || !fs.existsSync(sidecarAbs)) {
  status = 'BLOCKED';
  reasonCode = 'EC02';
  nextAction = 'npm run -s export:final-validated';
} else {
  finalSha = sha256File(finalAbs);
  const tvf = spawnSync('tar', ['-tvf', finalAbs], { cwd: ROOT, encoding: 'utf8' });
  if (tvf.status !== 0) {
    status = 'BLOCKED';
    reasonCode = 'EC02';
    nextAction = 'npm run -s export:final-validated';
  } else {
    for (const line of tvf.stdout.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      const m = t.match(/^(\S+)\s+\S+\s+(\d+)\s+\S+\s+\S+\s+(.+)$/);
      if (!m) continue;
      const entryPath = String(m[3]).trim();
      if (!entryPath || entryPath.endsWith('/')) continue;
      entryCount += 1;
      totalBytes += Number(m[2]) || 0;
    }
  }
}

writeMd(path.join(GOV_DIR, 'FINAL_VALIDATED_FINGERPRINT.md'), `# FINAL_VALIDATED_FINGERPRINT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n- artifact_path: ${finalRel || 'MISSING'}\n- sidecar_path: ${sidecarRel || 'MISSING'}\n- sha256: ${finalSha}\n- entry_count: ${entryCount}\n- total_bytes: ${totalBytes}\n- contract_sha256: ${contractSha}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'final_validated_fingerprint.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: status === 'PASS' ? 'Final validated fingerprint computed.' : 'Missing/invalid release artifact inputs.',
  next_action: nextAction,
  artifact_path: finalRel || null,
  sidecar_path: sidecarRel || null,
  sha256: finalSha,
  entry_count: entryCount,
  total_bytes: totalBytes,
  contract_sha256: contractSha,
});

console.log(`[${status}] final_validated_fingerprint — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
