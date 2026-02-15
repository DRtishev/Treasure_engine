# E78 CLOSEOUT
- status: PASS
- commit: 98da808
- chain_mode: FAST_PLUS
- commands_executed: pwd; git status -sb; git rev-parse --short HEAD; node -v; npm -v; npm ci; CI=false UPDATE_E78_EVIDENCE=1 UPDATE_E78_CALIBRATION=1 CANARY_STAGE=BASELINE npm run -s verify:e78; git status --porcelain > /tmp/e78_before && CI=false npm run -s verify:e78 && git status --porcelain > /tmp/e78_after && diff -u /tmp/e78_before /tmp/e78_after; git status --porcelain > /tmp/e78_ci_before && CI=true CHAIN_MODE=FAST_PLUS npm run -s verify:e78 && git status --porcelain > /tmp/e78_ci_after && diff -u /tmp/e78_ci_before /tmp/e78_ci_after; grep -E canonical_fingerprint reports/evidence/E78/CLOSEOUT.md reports/evidence/E78/VERDICT.md; node -e import('./scripts/verify/e78_lib.mjs').then(m=>console.log(m.evidenceFingerprintE78())); grep -E ^[0-9a-f]{64} reports/evidence/E78/SHA256SUMS.md | sha256sum -c -; grep -E deterministic_match reports/evidence/E78/RUNS_EDGE_CANARY_X2.md
- recon_fixture_sha256: 425e327472dd24cb40efc351be70fb1c64df4960ed2567c507e876190615bd0d
- calibration_hash: 98180c31843fcf439d43fa5564ea2e52d0dabdc950d140f5088a7a8ec1ca646f
- canary_summary: PASS=4 FAIL=0
- canonical_fingerprint: d7328491f76d27b778283c675601f69b3de0c8d064ad913e279beca9e4455400
