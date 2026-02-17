# E100 APPLY TXN

## Phase 1: BEFORE Snapshot
- overlay_before: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- ledger_before: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9

## Phase 2: Apply x2 (Idempotence Test)
- overlay_after_run1: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- ledger_after_run1: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9
- overlay_after_run2: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- ledger_after_run2: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9
- overlay_idempotent: true
- ledger_idempotent: true

## Phase 3: Journal (for rollback)
- journal_saved: <REPO_ROOT>/.foundation-seal/E100_APPLY_JOURNAL.json
- journal_sha256: c87000bfad494f02f9b06d46a7c1701e0ab5240948d8a7db9b2b40b9dad5de3e

## Verdict: PASS

## Contracts
- Apply must be idempotent (x2 overlay/ledger hashes stable)
- Journal must be saved for deterministic rollback
