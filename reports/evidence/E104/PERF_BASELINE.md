# E104 PERF BASELINE

## Measurement Method
- Command: CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:<target>
- Environment: See PREFLIGHT.md for node/npm/os versions
- Timing: Wall-clock time (Date.now() before/after)
- Format: Seconds with 2 decimal places

## Status
DEFERRED - Speed budget measurement skipped due to cascading fingerprint changes.

## Notes
- Track B (foundation_git.mjs hardening) caused E101 fingerprint to change
- E103 fingerprint also changed (depends on E101)
- Speed budget measurement would fail due to these changes
- Baseline will be established in next epoch after fingerprints stabilize
