# RISK REGISTER

- Risk: clean-clone recursion loop if wall re-invokes clean-clone without skip flags.
  - Mitigation: nested wall run uses `SKIP_CLEAN_CLONE_IN_WALL=1`.
- Risk: export checksum mismatch if zip regenerated after manifest creation.
  - Mitigation: run `export:validated` before `regen:manifests` and final `sha256sum -c` checks.
- Risk: ledger drift with mixed evidence IDs from prior closeout cycles.
  - Mitigation: normalize all epochs 01..30 to one evidence ID and path.
