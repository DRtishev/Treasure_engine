# E99 APPLY REHEARSAL

## Phase 1: Pre-apply baseline (non-CI)
- baseline_fingerprint_before: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- baseline_fingerprint_after: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- baseline_stable: true

## Phase 2: Pre-apply baseline (CI=true read-only)
- baseline_ci_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- ci_mode_stable: true

## Phase 3: Apply x2 (idempotence test)
- overlay_before: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- overlay_after_run1: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- overlay_after_run2: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- idempotent: true
- apply_fingerprint_run1: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- apply_fingerprint_run2: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f

- files_changed: 0
- out_of_scope_writes: 0

## Phase 4: Post-apply verification (non-CI)
- post_apply_noci_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f

## Phase 5: Post-apply verification (CI=true read-only)
- post_apply_ci_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- post_apply_stable: true

## Verdict: PASS

## Contracts
- E97 apply must be idempotent (overlay hash stable across x2 runs)
- E97 apply must write only to allowed surface
- Post-apply CI read-only must not drift
