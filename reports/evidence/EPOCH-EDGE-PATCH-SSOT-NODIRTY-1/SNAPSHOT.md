# Snapshot
Read and enforced:
- docs/EDGE_RESEARCH/GLOSSARY.md
- docs/EDGE_RESEARCH/DETERMINISM_POLICY.md
- docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md
- docs/SDD_EDGE_EPOCHS_31_40.md
- docs/EDGE_RESEARCH/AI_MODULE.md
- specs/epochs/INDEX.md
- specs/epochs/LEDGER.json
- specs/epochs/EPOCH-31.md ... EPOCH-40.md
- scripts/verify/edge_epoch_gate.mjs, scripts/verify/edge_all_epochs.mjs
- core/edge/contracts.mjs, core/edge/runtime.mjs
Assumptions:
- default verify is offline-first
- clean clone remains opt-in by ENABLE_CLEAN_CLONE=1
- no-dirty checks are enforced for tracked files (git status --porcelain --untracked-files=no)
