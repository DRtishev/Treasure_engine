# E136 IMPORT VERIFY
## Purpose
- Validate E136 evidence integrity on a receiving machine.
## Paste-able Commands (receiving machine)
```bash
# Step 1: Verify sha256 of all evidence files
sha256sum -c reports/evidence/E136/SHA256SUMS.md
# Step 2: Run import verify script
node scripts/verify/e136_import_verify.mjs
# Step 3: If you have the archive, verify its sha256
node scripts/verify/e136_import_verify.mjs --archive /path/to/E136_evidence_*.tar.gz
# Step 4: Full E136 gate (re-runs everything)
npm run -s verify:e136
```
## What is verified
- sha256 of every .md file in reports/evidence/E136/ matches SHA256SUMS.md
- EXPORT_MANIFEST.md sha256 per-file matches actual files
- Archive sha256 matches EXPORT_RECEIPT.md (if archive provided)
## What is NOT verified here
- Live network connectivity (use verify:e136:online with ENABLE_NET=1)
- E131–E135 baseline (use npm run -s verify:e136 for full chain)
