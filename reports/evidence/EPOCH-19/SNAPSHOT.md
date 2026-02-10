# EPOCH-19 Snapshot

## Assumptions ledger
1. PR binary warning is caused by committed archive files (`*.zip`/`*.tar.gz`).
   - Check: `git ls-files | rg '\\.(zip|tar|gz)$|EVIDENCE_PACK.tar.gz'`
2. Removing binaries from index while preserving checksums/manifests will keep traceability.
   - Check: keep `.sha256`/manifest text files in repo.
3. Baseline gates currently pass and should remain unchanged after this minimal patch.
   - Check: run install + verify:e2/phase2/paper + anti-flake reruns.

## Initial fact checks
- Head: `ba60ef63a9de148ff3fa3a90f7e079f6e5640c98`
- Preflight log: `reports/evidence/EPOCH-19/PREFLIGHT.log`
