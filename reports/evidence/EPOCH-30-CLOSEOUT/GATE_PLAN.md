# Gate Plan

1. npm ci
2. npm run verify:specs (run #1)
3. npm run verify:specs (run #2 anti-flake)
4. npm run verify:wall (full)
5. npm run verify:release-governor (run #1)
6. npm run verify:release-governor (run #2 anti-flake)
7. npm run regen:manifests
8. sha256sum -c reports/evidence/EPOCH-30-CLOSEOUT/SHA256SUMS.SOURCE.txt
9. sha256sum -c reports/evidence/EPOCH-30-CLOSEOUT/SHA256SUMS.EVIDENCE.txt
10. sha256sum -c reports/evidence/EPOCH-30-CLOSEOUT/SHA256SUMS.EXPORT.txt
11. npm run export:validated
