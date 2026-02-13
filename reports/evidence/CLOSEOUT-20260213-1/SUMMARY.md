# CLOSEOUT SUMMARY

## What changed
- Removed case-collision mine by renaming `AGENTS.md` to `AGENTS_NOTICE.md` and keeping `agents.md` as SSOT.
- Archived contradictory planning/TODO docs to `docs/legacy/` with explicit LEGACY banner.
- Updated SSOT-facing docs to TREASURE ENGINE naming and removed stale NEURO-MEV phrasing.
- Hardened deterministic contract serialization in `core/edge/contracts.mjs`:
  - rejects non-finite numbers before serialization,
  - canonical fixed-point numeric emission (no scientific notation),
  - normalizes `-0` to `0`.
- Strengthened edge gate policy checks in `scripts/verify/edge_epoch_gate.mjs`:
  - non-finite rejection regression checks across all generated contracts,
  - scientific-notation + negative-zero serialization guard,
  - deterministic fingerprint stability assertion.
- Added `scripts/verify/repo_sanity_check.mjs` and wired `npm run verify:repo`.
- Wired `verify:repo` into `verify:specs` and added alias `verify:e2_multi_seed`.
- Fixed `verify:edge` env propagation so epoch gates write into the configured `EVIDENCE_EPOCH` directory.

## Risks / mitigations
- Deterministic serialization changed: mitigated by rerunning edge gates twice and preserving deterministic outputs.
- Repo sanity network primitive scan is scoped to `core/edge` to avoid false positives outside offline-default core paths.
