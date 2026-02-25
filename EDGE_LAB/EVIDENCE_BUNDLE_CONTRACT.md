# EVIDENCE_BUNDLE_CONTRACT.md

STATUS: ACTIVE
CONTRACT_VERSION: 1.1.0

Included root:
- reports/evidence/**

Excluded roots/files:
- artifacts/incoming/**
- node_modules/**
- .git/**
- tmp/**
- cache/**
- reports/evidence/EXECUTOR/EVIDENCE_BUNDLE_MANIFEST.md (self-output)
- reports/evidence/EXECUTOR/EVIDENCE_BUNDLE_TOOLCHAIN_VOLATILE.md (volatile)

Default mode behavior:
- Include only `*.md` and `*.json` from reports/evidence
- Fail with EC01_BDL01 if non-md/json inclusion candidates exist
- Deterministic pack: tar `--sort=name --mtime='UTC 2020-01-01' --owner=0 --group=0 --numeric-owner`
- gzip `-n`

Portable mode behavior (`EVIDENCE_BUNDLE_PORTABLE=1`):
- Same deterministic pack + md/json-only enforcement
- Additional fail-closed filter for absolute-path-like lines unless explicitly marked `VOLATILE`
- Fail with EC01_BDL02 on portable-path violations

Required outputs:
- artifacts/incoming/evidence_chain.tar.gz
- artifacts/incoming/EVIDENCE_TAR.sha256
- reports/evidence/EXECUTOR/EVIDENCE_BUNDLE_MANIFEST.md
- reports/evidence/EXECUTOR/EVIDENCE_BUNDLE_TOOLCHAIN_VOLATILE.md


PORTABLE PROOF PACK:
- EVIDENCE_BUNDLE_PORTABLE=1 npm run -s export:evidence-bundle
- EVIDENCE_BUNDLE_PORTABLE=1 npm run -s verify:regression:evidence-bundle-portable-mode
- portable manifest must remain env-byte-free; toolchain volatile file excluded from tar.
