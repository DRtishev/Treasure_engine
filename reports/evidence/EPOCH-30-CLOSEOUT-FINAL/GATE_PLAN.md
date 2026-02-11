# Gate Plan
1. verify:specs x2 (anti-flake, spec lock)
2. npm ci (install baseline)
3. verify:wall (full offline wall)
4. verify:clean-clone
5. verify:release-governor x2 (anti-flake)
6. export:validated
7. regen:manifests
8. sha256sum validation for SOURCE/EVIDENCE/EXPORT manifests
9. evidence pack tar.gz + sha256
10. ledger and verdict consistency updates
