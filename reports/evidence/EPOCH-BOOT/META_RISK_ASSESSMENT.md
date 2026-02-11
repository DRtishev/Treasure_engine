# META_RISK_ASSESSMENT — EPOCH-BOOT

## Top 5 failure scenarios
1. Truth sub-gate masked in composite path (`verify:e2:raw` has tolerant segment).
   - Probability: Medium
   - Impact: High
   - Mitigation: strict fail-fast decomposition in next epoch.

2. Hidden nondeterminism from timestamp-bearing logs in canonical manifests.
   - Probability: Medium
   - Impact: Medium
   - Mitigation: split SOURCE vs EVIDENCE checksums and keep run-scoped artifacts.

3. Accidental network dependency entering default gate path.
   - Probability: Low-Medium
   - Impact: High
   - Mitigation: keep network tests opt-in only (`ENABLE_NETWORK_TESTS=1`).

4. Shared mutable log/state paths causing cross-run coupling.
   - Probability: Medium
   - Impact: Medium
   - Mitigation: continue enforcing run-context directories and repeat anti-flake checks.

5. Evidence drift from self-referential checksum manifests.
   - Probability: High (if unmanaged)
   - Impact: Medium
   - Mitigation: exclude checksum files/logs from evidence checksum input set.
