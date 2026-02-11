# ASSUMPTIONS LEDGER

1. `verify:specs` can validate required spec suite offline.
   - Check: `npm run verify:specs`
   - Result: CONFIRMED (pass; log: `gates/verify_specs.log`)
2. Existing baseline gates (`verify:e2`, `verify:paper`) remain green after docs/tooling changes.
   - Check: `npm run verify:wall` and `npm run verify:core`
   - Result: CONFIRMED (pass; logs: `gates/verify_wall_latest.log`, `gates/verify_core.log`)
3. `zip` is available for deterministic export.
   - Check: `zip -v | head -n 1`
   - Result: CONFIRMED (log: `gates/zip_check.log`)
4. Manifest regeneration can validate generated manifests with `sha256sum -c`.
   - Check: `npm run regen:manifests` + checksum validation
   - Result: CONFIRMED
5. release-governor can run on clean clone by auto-exporting if zip is missing.
   - Check: `rm -f FINAL_VALIDATED.zip FINAL_VALIDATED.zip.sha256 && npm run verify:release-governor`
   - Result: CONFIRMED (log: `gates/verify_release_governor_autobuild.log`)
