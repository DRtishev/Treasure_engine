# Archive Policy

- Archive nondeterministic, superseded, backup, or quarantined assets under `archive/phoenix_<date>/` or `labs/`.
- Preserve original relative semantics by keeping descriptive filenames and recording new path in manifest.
- Archived tracked files remain immutable and their SHA256 is pinned in `specs/repo/REPO_MANIFEST.json`.
- Runtime/verify scripts must not depend on archived files unless explicitly documented fallback behavior exists.
