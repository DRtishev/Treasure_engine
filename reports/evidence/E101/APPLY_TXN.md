# E101 APPLY TRANSACTION

## Phase 1: Before State
- overlay_sha256: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- ledger_sha256: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9

## Phase 2: Apply x2
- run1_duration: 3.22s
- run1_overlay_sha256: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- run1_ledger_sha256: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9
- run2_duration: 3.29s
- run2_overlay_sha256: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- run2_ledger_sha256: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9

## Phase 3: After State
- overlay_sha256: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- ledger_sha256: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9

## Phase 4: Journal v2
- schema_version: 2
- journal_path: <REPO_ROOT>/.foundation-seal/E101_APPLY_JOURNAL.json
- integrity_sha256: 884ed70185020776fc542d176e5980665fa8050e7209e2bb86f215bf73ce94a6

## Verification
- idempotence_check: PASS (run1 == run2)
- before_differs_from_after: false
