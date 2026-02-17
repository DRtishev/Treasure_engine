# E104 BUNDLE HASH V2

## Algorithm
- Gather all .md files in reports/evidence/E104/ (excluding BUNDLE_HASH*, SHA256SUMS, CLOSEOUT, VERDICT)
- Sort files lexicographically
- Compute sha256 per file
- Build manifest: "<sha256>  <posix_path>" per line
- Compute sha256 of concatenated manifest (sorted)

## Properties
- Filesystem-order independent (sorted input)
- Platform-independent (posix paths)
- Deterministic (stable sorting, stable hashing)
- Circular-dependency free (excludes self)

## Bundle Hash
- hash: 7ce845d9d422743c2662709b217896fa9b484aa8b0b4f7b9850442c4162c9049
- file_count: 7
- algorithm: sha256(sorted_manifest)

## Manifest
```
2ccf38e289d9e6dee3c35016b11129f4db7869ed0d9773e13522ace5bdf0c086  reports/evidence/E104/FINGERPRINT_INVARIANCE_COURT.md
3c8a8eed85f419a7a2b52803ffeb425fe515759ccf8ae3475eaf52aaf82822df  reports/evidence/E104/PREFLIGHT.md
5f6953208d5190ef5f00e8a9662ef165ebe92a715e6a9cd8750cd5291ffd2fe4  reports/evidence/E104/BASELINE_FINGERPRINTS.md
5f6953208d5190ef5f00e8a9662ef165ebe92a715e6a9cd8750cd5291ffd2fe4  reports/evidence/E104/POST_FINGERPRINTS.md
a351bdf294626fa12942a8caff22df8f3ed2416683030b5a5bf33dbbbbc5c314  reports/evidence/E104/CONTRACTS_SUMMARY.md
ac11263c5ad2afbbd74ea38bf6f77967b3d472dc94f46c6d4573dae90da5bfff  reports/evidence/E104/PERF_BUDGET_COURT.md
e03e29166e80ef4c4fcb8d36d6e4679562a2d0aaed8fdbf7e57cd89e0f8685c5  reports/evidence/E104/PERF_BASELINE.md
```
