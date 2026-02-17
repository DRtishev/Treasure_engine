# E100 ROLLBACK TXN

## Phase 1: Read Journal
- journal_path: <REPO_ROOT>/.foundation-seal/E100_APPLY_JOURNAL.json
- journal_sha256: c87000bfad494f02f9b06d46a7c1701e0ab5240948d8a7db9b2b40b9dad5de3e
- overlay_before: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- ledger_before: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9

## Phase 2: Restore x2 (Determinism Test)
- overlay_after_restore1: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- ledger_after_restore1: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9
- overlay_after_restore2: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- ledger_after_restore2: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9
- overlay_deterministic: true
- ledger_deterministic: true

## Phase 3: Verify Match with BEFORE
- overlay_match: true
- ledger_match: true

## Verdict: PASS

## Contracts
- Rollback must be deterministic (x2 restore produces identical state)
- Rollback must restore BEFORE snapshot byte-for-byte
