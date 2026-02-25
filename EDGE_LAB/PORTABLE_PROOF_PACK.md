# PORTABLE_PROOF_PACK.md

STATUS: ACTIVE

Portable proof pack commands:
- `EVIDENCE_BUNDLE_PORTABLE=1 npm run -s export:evidence-bundle`
- `EVIDENCE_BUNDLE_PORTABLE=1 npm run -s verify:regression:evidence-bundle-portable-mode`

Constraint:
- Portable manifest must be env-byte-free (no toolchain versions, no absolute paths).
- Toolchain diagnostics are written to volatile evidence and excluded from tar input.

Optional pinned runtime recipe:
- Run the two commands above in a pinned container image to reduce cross-machine drift.
