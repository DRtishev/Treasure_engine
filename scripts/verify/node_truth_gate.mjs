/**
 * node_truth_gate.mjs — NT01/NT02 Node version SSOT validation
 *
 * Reads NODE_TRUTH.md for allowed_family and validates process.version.
 * BLOCKED NT01: NODE_TRUTH.md missing
 * FAIL NT02: Node mismatch vs SSOT
 * PASS: Node version matches allowed family
 */

import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const NODE_TRUTH_PATH = path.join(ROOT, 'NODE_TRUTH.md');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'INFRA_P0');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');

function parseFamilyFromNodeTruth(content) {
  const match = content.match(/allowed_family:\s*(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function parsePinnedMinor(content) {
  const match = content.match(/hard_pinned_minor:\s*([\d.]+)/);
  return match ? match[1] : null;
}

function parsePackageEngines() {
  try {
    const pkgPath = path.join(ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.engines?.node ?? null;
  } catch (_) {
    return null;
  }
}

function runningNodeFamily() {
  // process.version = "v22.22.0" → family = 22
  const match = process.version.match(/^v(\d+)\./);
  return match ? parseInt(match[1], 10) : null;
}

function runningNodeVersion() {
  return process.version.replace(/^v/, '');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
fs.mkdirSync(MANUAL_DIR, { recursive: true });

let status, reason_code, message, allowed_family, running_family, next_action;

const nodeTruthExists = fs.existsSync(NODE_TRUTH_PATH);

if (!nodeTruthExists) {
  status = 'BLOCKED';
  reason_code = 'NT01';
  message = 'NODE_TRUTH.md is missing. Create it with allowed_family, hard_pinned_minor, and engines alignment.';
  next_action = 'Create NODE_TRUTH.md at repository root. See INFRA_P0 specification.';
  allowed_family = null;
  running_family = runningNodeFamily();
} else {
  const nodeTruthContent = fs.readFileSync(NODE_TRUTH_PATH, 'utf8');
  allowed_family = parseFamilyFromNodeTruth(nodeTruthContent);
  const pinned_minor = parsePinnedMinor(nodeTruthContent);
  const engines = parsePackageEngines();
  running_family = runningNodeFamily();
  const running_version = runningNodeVersion();

  if (allowed_family === null) {
    status = 'BLOCKED';
    reason_code = 'NT01';
    message = 'NODE_TRUTH.md found but allowed_family field is missing or unparseable.';
    next_action = 'Add "allowed_family: NN" line to NODE_TRUTH.md.';
  } else if (running_family !== allowed_family) {
    status = 'FAIL';
    reason_code = 'NT02';
    message = `Node mismatch: running ${process.version} (family ${running_family}) vs NODE_TRUTH.md allowed_family=${allowed_family}. Align the running Node version or update NODE_TRUTH.md via APPLY protocol.`;
    next_action = `Install Node ${allowed_family}.x to match NODE_TRUTH.md, or update NODE_TRUTH.md via PROPOSE→APPLY→RECEIPT protocol.`;
  } else {
    status = 'PASS';
    reason_code = 'NONE';
    message = `Node ${process.version} matches allowed_family=${allowed_family}. Engines field: "${engines}". Pinned minor: ${pinned_minor ?? 'not set'}.`;
    next_action = 'No action required. Node truth is aligned.';
  }
}

// Write machine JSON
const gateResult = {
  schema_version: '1.0.0',
  allowed_family,
  message,
  next_action,
  reason_code,
  running_family,
  running_version: process.version,
  run_id: RUN_ID,
  status,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'node_truth_gate.json'), gateResult);

// Write markdown evidence
const md = `# NODE_TRUTH_GATE.md

STATUS: ${status}
REASON_CODE: ${reason_code}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${next_action}

## Gate Results

| Field | Value |
|-------|-------|
| status | ${status} |
| reason_code | ${reason_code} |
| running_node | ${process.version} |
| running_family | ${running_family ?? 'unknown'} |
| allowed_family | ${allowed_family ?? 'not set'} |
| node_truth_found | ${nodeTruthExists} |

## Message

${message}

## Evidence Paths

- reports/evidence/INFRA_P0/gates/manual/node_truth_gate.json
- reports/evidence/INFRA_P0/NODE_TRUTH_GATE.md
`;

fs.writeFileSync(path.join(EVIDENCE_DIR, 'NODE_TRUTH_GATE.md'), md);

if (status === 'PASS') {
  console.log(`[PASS] node_truth_gate — Node ${process.version} matches allowed_family=${allowed_family}`);
  process.exit(0);
} else {
  console.error(`[${status}] node_truth_gate — ${reason_code}: ${message}`);
  process.exit(1);
}
