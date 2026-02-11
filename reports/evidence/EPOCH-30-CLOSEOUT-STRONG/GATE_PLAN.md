# GATE PLAN

Ordered execution for hard-sync closeout:
1. `npm ci`
2. `npm run verify:specs` (twice anti-flake)
3. `npm run verify:wall`
4. `npm run verify:release-governor` (twice anti-flake)
5. `npm run export:validated`
6. `npm run regen:manifests`
7. `sha256sum -c` on SOURCE/EVIDENCE/EXPORT manifests
8. Build evidence/export archives + sha256 files (archives untracked)
