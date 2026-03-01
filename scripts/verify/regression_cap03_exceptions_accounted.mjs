/**
 * regression_cap03_exceptions_accounted.mjs — RG_CAP03_EXCEPTIONS_ACCOUNTED
 *
 * Gate: OKX R2 exception handling is fully scaffolded:
 *   1. OKX capability flags present: checksum_deprecated, seq_no_update_supported, seq_reset_possible
 *   2. data_lanes.json okx orderbook lane has r2_exception_policy_refs
 *   3. All refs resolve to existing anchors in the doc
 *   4. Fixture dirs exist and are non-empty:
 *        artifacts/fixtures/okx/orderbook/no_update/
 *        artifacts/fixtures/okx/orderbook/seq_reset/
 *        artifacts/fixtures/okx/orderbook/empty_updates/
 *
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:cap03-exceptions-accounted';
const CAP_PATH = path.join(ROOT, 'specs', 'data_capabilities.json');
const LANES_PATH = path.join(ROOT, 'specs', 'data_lanes.json');
const FIXTURE_BASE = path.join(ROOT, 'artifacts', 'fixtures', 'okx', 'orderbook');
const OKX_REQUIRED_FLAGS = ['checksum_deprecated', 'seq_no_update_supported', 'seq_reset_possible'];
const REQUIRED_FIXTURE_DIRS = ['no_update', 'seq_reset', 'empty_updates'];
const OKX_LANE_ID = 'price_okx_orderbook_ws';

const checks = [];

// --- 1. OKX capability flags ---
if (!fs.existsSync(CAP_PATH)) {
  checks.push({ check: 'cap_file_exists', pass: false, detail: `missing: ${CAP_PATH}` });
} else {
  let cap;
  try {
    cap = JSON.parse(fs.readFileSync(CAP_PATH, 'utf8'));
  } catch (e) {
    cap = null;
    checks.push({ check: 'cap_parseable', pass: false, detail: e.message });
  }

  if (cap && cap.capabilities && cap.capabilities.okx && cap.capabilities.okx.orderbook) {
    const ob = cap.capabilities.okx.orderbook;
    for (const flag of OKX_REQUIRED_FLAGS) {
      const present = flag in ob;
      const truthy = ob[flag] === true;
      checks.push({
        check: `okx_flag_${flag}`,
        pass: present && truthy,
        detail: present ? `${flag}=${ob[flag]} — OK` : `MISSING flag: ${flag}`,
      });
    }
  } else {
    checks.push({ check: 'okx_orderbook_caps_present', pass: false, detail: 'capabilities.okx.orderbook missing' });
  }
}

// --- 2. Lane has r2_exception_policy_refs ---
let laneRefs = [];
if (!fs.existsSync(LANES_PATH)) {
  checks.push({ check: 'lanes_file_exists', pass: false, detail: `missing: ${LANES_PATH}` });
} else {
  let lanes;
  try {
    lanes = JSON.parse(fs.readFileSync(LANES_PATH, 'utf8'));
  } catch (e) {
    lanes = null;
    checks.push({ check: 'lanes_parseable', pass: false, detail: e.message });
  }

  if (lanes && Array.isArray(lanes.lanes)) {
    const okxLane = lanes.lanes.find((l) => l.lane_id === OKX_LANE_ID);
    const hasLane = !!okxLane;
    checks.push({ check: 'okx_orderbook_lane_present', pass: hasLane, detail: hasLane ? `${OKX_LANE_ID} — OK` : `MISSING lane: ${OKX_LANE_ID}` });

    if (okxLane) {
      const refs = okxLane.r2_exception_policy_refs || [];
      const hasRefs = refs.length > 0;
      checks.push({
        check: 'okx_lane_has_r2_exception_refs',
        pass: hasRefs,
        detail: hasRefs ? `refs_n=${refs.length}` : 'MISSING: r2_exception_policy_refs',
      });
      laneRefs = refs;

      // Verify expected anchors present
      const expectedAnchors = ['#no-update', '#seq-reset', '#empty-updates'];
      for (const anchor of expectedAnchors) {
        const hasAnchor = refs.some((r) => r.endsWith(anchor));
        checks.push({
          check: `ref_anchor_${anchor.slice(1)}`,
          pass: hasAnchor,
          detail: hasAnchor ? `ref with ${anchor} found — OK` : `MISSING ref ending with: ${anchor}`,
        });
      }
    }
  }
}

// --- 3. Anchor resolve: each ref must point to existing doc with matching heading ---
for (const ref of laneRefs) {
  const [docRel, anchor] = ref.split('#');
  const docPath = path.join(ROOT, docRel);
  const docExists = fs.existsSync(docPath);
  checks.push({ check: `ref_doc_exists_${anchor || 'noanchor'}`, pass: docExists, detail: docExists ? docRel : `MISSING doc: ${docRel}` });

  if (docExists && anchor) {
    const content = fs.readFileSync(docPath, 'utf8');
    // Anchors from headings: ## #anchor-name → GitHub-style: lowercase, spaces→-, non-alphanum removed
    // Simple check: look for "## #<anchor>" pattern or heading that normalizes to anchor
    const anchorPattern = new RegExp(`##\\s+#${anchor.replace(/-/g, '[-_]?')}`, 'i');
    const foundInHeading = anchorPattern.test(content);
    // Also accept bare heading match (## anchor-name)
    const barePattern = new RegExp(`##\\s+${anchor.replace(/-/g, '[-_\\s]?')}`, 'i');
    const foundBare = barePattern.test(content);
    const resolved = foundInHeading || foundBare;
    checks.push({
      check: `ref_anchor_resolved_${anchor}`,
      pass: resolved,
      detail: resolved ? `#${anchor} found in ${docRel} — OK` : `UNRESOLVED anchor: #${anchor} in ${docRel}`,
    });
  }
}

// --- 4. Fixture dirs exist and non-empty ---
for (const dir of REQUIRED_FIXTURE_DIRS) {
  const dirPath = path.join(FIXTURE_BASE, dir);
  const exists = fs.existsSync(dirPath);
  checks.push({ check: `fixture_dir_${dir}_exists`, pass: exists, detail: exists ? path.relative(ROOT, dirPath) : `MISSING: ${dirPath}` });

  if (exists) {
    const files = fs.readdirSync(dirPath).filter((f) => !f.startsWith('.'));
    const nonEmpty = files.length > 0;
    checks.push({
      check: `fixture_dir_${dir}_nonempty`,
      pass: nonEmpty,
      detail: nonEmpty ? `files_n=${files.length}` : 'EMPTY dir — no fixtures',
    });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'CAP03_EXCEPTIONS_INCOMPLETE';

writeMd(path.join(EXEC, 'REGRESSION_CAP03.md'), [
  '# REGRESSION_CAP03.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_cap03.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_CAP03_EXCEPTIONS_ACCOUNTED',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_cap03_exceptions_accounted — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
