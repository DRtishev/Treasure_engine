#!/usr/bin/env node
// E102-A5: Generate Operator Playbook (copy-paste commands)
import fs from 'node:fs';
import path from 'node:path';
import { writeMd } from './e66_lib.mjs';
import { E102_ROOT, ensureDir } from './e102_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';

const update = process.env.UPDATE_E102_EVIDENCE === '1';

if (isCIMode() && update) {
  throw new Error('UPDATE_E102_EVIDENCE forbidden in CI');
}

if (!update) {
  console.log('e102:operator_playbook SKIP (UPDATE_E102_EVIDENCE not set)');
  process.exit(0);
}

ensureDir(E102_ROOT);

const playbook = `# E102 OPERATOR PLAYBOOK

## Daily Health Check (Read-Only, No State Changes)

\`\`\`bash
# Run in CI mode (read-only enforcement)
CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e102
\`\`\`

**Expected**: All contracts PASS, no tracked file changes, canonical parity verified.

**If FAIL**:
1. Check kill-lock: \`ls -la .foundation-seal/*_KILL_LOCK.md\`
2. Read failure reason from lock file
3. Clear lock (if safe): \`CI=false CLEAR_E102_KILL_LOCK=1 npm run -s verify:e102\`
4. Re-run health check

---

## Weekly Evidence Update (Non-CI, Regenerate Evidence)

\`\`\`bash
# Update evidence pack (local only, never in CI)
CI=false UPDATE_E102_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e102:update
\`\`\`

**Expected**: Evidence regenerated, canonical fingerprint updated, SHA256SUMS verified.

**Verify**:
\`\`\`bash
grep canonical_fingerprint reports/evidence/E102/CLOSEOUT.md reports/evidence/E102/VERDICT.md
# Both should match
\`\`\`

---

## Apply Transaction (State Change, Use with Caution)

⚠️ **WARNING**: This modifies overlay + ledger state. Only run when authorized.

\`\`\`bash
# Step 1: Backup current state (manual)
cp core/edge/contracts/e97_envelope_tuning_overlay.md /tmp/overlay_backup.md
cp core/edge/state/profit_ledger_state.md /tmp/ledger_backup.md

# Step 2: Run apply transaction (x2 idempotence test)
CI=false UPDATE_E102_EVIDENCE=1 UPDATE_E102_APPLY_TXN=1 APPLY_MODE=APPLY CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e102:apply_txn

# Step 3: Verify journal created
ls -la .foundation-seal/E102_APPLY_JOURNAL.json
cat .foundation-seal/E102_APPLY_JOURNAL.json | jq '.schema_version, .integrity_sha256'

# Step 4: Verify idempotence
grep "idempotent: YES" reports/evidence/E102/RUNS_APPLY_TXN_X2.md
\`\`\`

**Expected**: Journal v2 created, idempotence verified (run1 == run2), evidence sealed.

---

## Rollback Transaction (Restore BEFORE State)

⚠️ **CRITICAL**: Only run if apply needs to be undone. This restores BEFORE snapshot from journal.

\`\`\`bash
# Step 1: Verify journal exists
test -f .foundation-seal/E102_APPLY_JOURNAL.json && echo "Journal found" || echo "ERROR: No journal"

# Step 2: Run rollback (x2 determinism test)
CI=false UPDATE_E102_EVIDENCE=1 ROLLBACK_E102=1 ROLLBACK_MODE=ROLLBACK CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e102:rollback_txn

# Step 3: Verify determinism
grep "deterministic: YES" reports/evidence/E102/RUNS_ROLLBACK_X2.md
grep "byte_for_byte_restore: YES" reports/evidence/E102/RUNS_ROLLBACK_X2.md
\`\`\`

**Expected**: State restored to BEFORE snapshot, determinism verified (rb1 == rb2 == BEFORE).

---

## Kill-Lock Recovery (After Critical Failure)

If verify:e102 fails with \`kill-lock active\`:

\`\`\`bash
# Step 1: Read lock reason
cat .foundation-seal/E102_KILL_LOCK.md

# Step 2: Understand failure (check evidence)
tail -50 reports/evidence/E102/CLOSEOUT.md

# Step 3: Fix root cause (varies by failure)
# ... address the specific issue ...

# Step 4: Clear lock (requires explicit flag)
CI=false CLEAR_E102_KILL_LOCK=1 npm run -s verify:e102

# Step 5: Verify recovery
CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e102
\`\`\`

**Never** clear kill-lock without understanding WHY it was armed.

---

## Contract Verification (Quick Check)

\`\`\`bash
# Run all E102 contracts without full ritual
npm run -s verify:e102:contracts
\`\`\`

**Contracts Checked**:
- case_collision (no case-only filename conflicts)
- path_invariance (no absolute paths, only <REPO_ROOT>)
- eol_contract (LF-only, no CRLF)
- node_truth (Node major == 22)
- no_secrets (no leaked secrets)

---

## Emergency: Manual Rollback (If Automated Fails)

If \`verify:e102:rollback_txn\` fails or journal is corrupted:

\`\`\`bash
# Step 1: Restore from manual backup (see Apply Transaction step 1)
cp /tmp/overlay_backup.md core/edge/contracts/e97_envelope_tuning_overlay.md
cp /tmp/ledger_backup.md core/edge/state/profit_ledger_state.md

# Step 2: Verify restoration
sha256sum core/edge/contracts/e97_envelope_tuning_overlay.md
sha256sum core/edge/state/profit_ledger_state.md
# Compare with BEFORE hashes from journal

# Step 3: Run health check
CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e102
\`\`\`

---

## Troubleshooting Guide

### "UPDATE_E102_EVIDENCE forbidden when CI=true"
✅ **Expected** - This is security boundary. Only run updates with \`CI=false\`.

### "canonical parity violation"
❌ **Critical** - CLOSEOUT/VERDICT fingerprints don't match computed.
- **Fix**: Regenerate evidence with \`npm run -s verify:e102:update\`
- **Root cause**: Evidence files modified manually (never do this)

### "UPDATE_SCOPE_VIOLATION"
❌ **Critical** - Files outside allowed scope were modified.
- **Fix**: Check \`git status\`, revert unexpected changes
- **Root cause**: Script modified wrong files or manual edits

### "sha mismatch in SHA256SUMS"
❌ **Critical** - Evidence file modified after sealing.
- **Fix**: Regenerate evidence with \`npm run -s verify:e102:update\`
- **Root cause**: Manual edit or filesystem corruption

### "Journal integrity check FAILED"
❌ **Critical** - Journal corrupted or tampered.
- **Fix**: DO NOT rollback. Use manual backup restoration.
- **Root cause**: Filesystem corruption or manual journal edit (never do this)

---

## Contact & Escalation

If issues persist:
1. Capture full output: \`npm run -s verify:e102 2>&1 | tee debug.log\`
2. Check evidence: \`ls -la reports/evidence/E102/\`
3. Check journal: \`cat .foundation-seal/E102_APPLY_JOURNAL.json | jq .\`
4. Escalate with debug.log + evidence pack

---

## Golden Rules

1. ✅ **Always** run health check in CI mode before applying changes
2. ✅ **Always** backup state manually before apply transaction
3. ✅ **Never** edit evidence files manually
4. ✅ **Never** edit journal files manually
5. ✅ **Never** clear kill-lock without understanding failure
6. ❌ **Never** run UPDATE_* commands in CI
7. ❌ **Never** modify core/edge files outside of apply transaction
8. ❌ **Never** commit .foundation-seal/*_KILL_LOCK.md to git
`;

writeMd(path.join(E102_ROOT, 'OPERATOR_PLAYBOOK.md'), playbook);

console.log('e102:operator_playbook GENERATED');
