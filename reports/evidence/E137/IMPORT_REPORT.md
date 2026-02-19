# E137 IMPORT REPORT
- status: PASS
- reason_code: OK
- archive_path: /workspace/Treasure_engine/artifacts/outgoing/E137_evidence_2026-02-19T11-34-33-424Z.tar.gz
- archive_sha256_actual: 8880c975d395a8515f1aecaee06f733bb78348f176d700508f09ea41f927e41f
- archive_sha256_expected: 8880c975d395a8515f1aecaee06f733bb78348f176d700508f09ea41f927e41f
- unpacked_root_exists: true
- unpacked_md_only: true
- sha256sum_check: true
Declare: imported archive must preserve E137 contracts and integrity.
Verify: tar extract + md-only scan + sha256sum -c of unpacked SHA256SUMS.md.
If mismatch: rebuild archive with verify:e137:export then retry import.
