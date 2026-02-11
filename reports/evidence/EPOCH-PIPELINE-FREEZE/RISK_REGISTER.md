# RISK REGISTER
- verify:wall includes npm ci and may be time-heavy; mitigated by full log capture.
- Historical evidence directories may contain stale manifests; mitigated by EVIDENCE_EPOCH explicit override.
- Clean-clone copy can accidentally include excluded artifacts; mitigated by explicit rsync excludes.
- Environment npm proxy warnings may appear; treated as non-blocking noise unless command fails.
