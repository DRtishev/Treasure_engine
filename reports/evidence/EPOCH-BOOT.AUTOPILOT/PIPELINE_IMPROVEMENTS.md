# PIPELINE IMPROVEMENTS

- Added `verify:specs` gate for strict spec-suite completeness and section validation.
- Added canonical manifest regeneration tool with fixed order (EVIDENCE -> SOURCE -> EXPORT) and inline checksum verification.
- Added canonical validated export command (`npm run export:validated`).
- Hardened release governor to auto-build validated export when missing.
- Added one-command offline wall (`npm run verify:wall`) with anti-flake repeats and manifest checks.
