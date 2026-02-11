# GATE PLAN (ordered)
1. npm run verify:specs (run #1)
2. npm run verify:specs (run #2)
3. npm ci
4. npm run verify:paper (run #1)
5. npm run verify:paper (run #2)
6. npm run verify:e2 (run #1)
7. npm run verify:e2 (run #2)
8. npm run verify:e2:multi
9. npm run verify:paper:multi
10. npm run verify:phase2
11. npm run verify:integration
12. npm run verify:core
13. npm run verify:wall
14. npm run regen:manifests
15. sha256sum -c reports/evidence/EPOCH-PIPELINE-FREEZE/SHA256SUMS.SOURCE.txt
16. sha256sum -c reports/evidence/EPOCH-PIPELINE-FREEZE/SHA256SUMS.EVIDENCE.txt
17. sha256sum -c reports/evidence/EPOCH-PIPELINE-FREEZE/SHA256SUMS.EXPORT.txt
18. npm run export:validated
19. npm run verify:release-governor (run #1)
20. npm run verify:release-governor (run #2)
21. Clean clone rehearsal
