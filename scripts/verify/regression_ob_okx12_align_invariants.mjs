/**
 * regression_ob_okx12_align_invariants.mjs — RG_OB_OKX12_ALIGN_INVARIANTS
 *
 * Gate: Verifies OKX step-6 alignment invariants:
 *   1. ALIGN_FIRST_EVENT condition: first non-discarded message satisfies
 *      prevSeqId <= snapshot.seqId < seqId
 *   2. State transition: DISCARD → ALIGN_FIRST_EVENT → STRICT
 *   3. STRICT apply: all subsequent messages have prevSeqId == lastSeqId
 *   4. Align script exits EC=0 and produces expected EPOCH output
 *
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx12-align-invariants';
const FIXTURE_BASE = path.join(ROOT, 'artifacts', 'fixtures', 'okx', 'orderbook', 'align');
const BUFFER_PATH = path.join(FIXTURE_BASE, 'buffer.jsonl');
const SNAPSHOT_PATH = path.join(FIXTURE_BASE, 'snapshot.json');
const LOCK_PATH = path.join(FIXTURE_BASE, 'lock.json');
const ALIGN_SCRIPT = path.join(ROOT, 'scripts', 'edge', 'edge_okx_orderbook_02_align_offline.mjs');

const checks = [];

// Verify fixtures exist
for (const [label, p] of [['align_script', ALIGN_SCRIPT], ['buffer', BUFFER_PATH], ['snapshot', SNAPSHOT_PATH], ['lock', LOCK_PATH]]) {
  checks.push({
    check: `${label}_exists`,
    pass: fs.existsSync(p),
    detail: fs.existsSync(p) ? `${label} present — OK` : `MISSING: ${path.relative(ROOT, p)}`,
  });
}

if ([BUFFER_PATH, SNAPSHOT_PATH, LOCK_PATH, ALIGN_SCRIPT].every(fs.existsSync)) {
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  const bufLines = fs.readFileSync(BUFFER_PATH, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  const msgs = bufLines.map((l) => JSON.parse(l));

  // ── Invariant 1: Verify ALIGN_FIRST_EVENT condition in buffer ──
  const firstNonDiscarded = msgs.find((m) => m.data[0].seqId > snapshot.seqId);
  if (firstNonDiscarded) {
    const d = firstNonDiscarded.data[0];
    const invOk = d.prevSeqId <= snapshot.seqId && snapshot.seqId < d.seqId;
    checks.push({
      check: 'align_first_event_condition',
      pass: invOk,
      detail: invOk
        ? `prevSeqId=${d.prevSeqId} <= snapshot.seqId=${snapshot.seqId} < seqId=${d.seqId} — OK`
        : `FAIL: condition not satisfied: prevSeqId=${d.prevSeqId} snapshot.seqId=${snapshot.seqId} seqId=${d.seqId}`,
    });
    checks.push({
      check: 'align_first_event_seqId_matches_lock',
      pass: d.seqId === lock.align_first_event_seqId,
      detail: d.seqId === lock.align_first_event_seqId
        ? `align_first_event_seqId=${d.seqId} matches lock — OK`
        : `MISMATCH: buf=${d.seqId} lock=${lock.align_first_event_seqId}`,
    });
  } else {
    checks.push({ check: 'align_first_event_exists', pass: false, detail: 'No non-discarded message found in buffer' });
  }

  // ── Invariant 2: Discard count ──
  const discardedN = msgs.filter((m) => m.data[0].seqId <= snapshot.seqId).length;
  checks.push({
    check: 'discard_count_matches_lock',
    pass: discardedN === lock.discarded_n,
    detail: discardedN === lock.discarded_n
      ? `discarded_n=${discardedN} matches lock — OK`
      : `MISMATCH: computed=${discardedN} lock=${lock.discarded_n}`,
  });

  // ── Invariant 3: STRICT apply chain is valid ──
  const nonDiscarded = msgs.filter((m) => m.data[0].seqId > snapshot.seqId);
  let strictOk = true;
  let lastSeqId = snapshot.seqId;
  let isFirst = true;
  for (const m of nonDiscarded) {
    const d = m.data[0];
    if (isFirst) {
      // First event: ALIGN_FIRST_EVENT — apply then move to STRICT
      lastSeqId = d.seqId;
      isFirst = false;
    } else {
      // STRICT: prevSeqId must equal lastSeqId
      if (d.prevSeqId !== lastSeqId) {
        strictOk = false;
        checks.push({
          check: `strict_chain_seqId_${d.seqId}`,
          pass: false,
          detail: `STRICT GAP: prevSeqId=${d.prevSeqId} != lastSeqId=${lastSeqId}`,
        });
      }
      lastSeqId = d.seqId;
    }
  }
  if (strictOk) {
    checks.push({
      check: 'strict_apply_chain_valid',
      pass: true,
      detail: `all ${nonDiscarded.length - 1} STRICT apply steps have prevSeqId==lastSeqId — OK`,
    });
  }

  // ── Invariant 4: Run align script and verify EC=0 ──
  const result = spawnSync(
    process.execPath, [ALIGN_SCRIPT],
    { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, encoding: 'utf8', timeout: 30000 }
  );
  checks.push({
    check: 'align_script_exit_zero',
    pass: result.status === 0,
    detail: result.status === 0
      ? `align script EC=0 — PASS`
      : `EC=${result.status} stderr=${(result.stderr || '').slice(0, 200)}`,
  });
  if (result.status === 0) {
    checks.push({
      check: 'align_script_stdout_pass',
      pass: (result.stdout || '').includes('[PASS]'),
      detail: (result.stdout || '').includes('[PASS]') ? `stdout=[PASS] — OK` : `missing [PASS]`,
    });
  }

  // ── Invariant 5: EPOCH output created ──
  const epochPattern = `EPOCH-R2-ALIGN-`;
  const evidenceDir = path.join(ROOT, 'reports', 'evidence');
  const epochDirs = fs.existsSync(evidenceDir)
    ? fs.readdirSync(evidenceDir).filter((d) => d.startsWith(epochPattern))
    : [];
  checks.push({
    check: 'epoch_output_created',
    pass: epochDirs.length > 0,
    detail: epochDirs.length > 0
      ? `EPOCH dir exists: ${epochDirs[epochDirs.length - 1]} — OK`
      : `MISSING: no EPOCH-R2-ALIGN-* dir in reports/evidence/`,
  });

  if (epochDirs.length > 0) {
    const latest = path.join(evidenceDir, epochDirs[epochDirs.length - 1]);
    const alignJson = path.join(latest, 'ALIGN.json');
    const alignMd = path.join(latest, 'ALIGN.md');

    checks.push({
      check: 'epoch_align_json_exists',
      pass: fs.existsSync(alignJson),
      detail: fs.existsSync(alignJson) ? `ALIGN.json present — OK` : `MISSING ALIGN.json`,
    });
    checks.push({
      check: 'epoch_align_md_exists',
      pass: fs.existsSync(alignMd),
      detail: fs.existsSync(alignMd) ? `ALIGN.md present — OK` : `MISSING ALIGN.md`,
    });

    if (fs.existsSync(alignJson)) {
      const aj = JSON.parse(fs.readFileSync(alignJson, 'utf8'));
      checks.push({
        check: 'epoch_align_json_final_seqId',
        pass: aj.final_seqId === lock.final_seqId,
        detail: aj.final_seqId === lock.final_seqId
          ? `ALIGN.json final_seqId=${aj.final_seqId} matches lock — OK`
          : `MISMATCH: align=${aj.final_seqId} lock=${lock.final_seqId}`,
      });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX12_ALIGN_INVARIANT_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX12.md'), [
  '# REGRESSION_OB_OKX12.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## ALIGN_INVARIANTS',
  '- ALIGN_FIRST_EVENT: prevSeqId <= snapshot.seqId < seqId',
  '- STRICT: all subsequent prevSeqId == lastSeqId',
  '- DISCARD: seqId <= snapshot.seqId', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx12.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX12_ALIGN_INVARIANTS',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx12_align_invariants — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
