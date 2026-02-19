# FINAL_MEGA RESEARCH NOTES
## Supply Chain Integrity (SLSA concepts)
- Capsule (node tarball) is pinned by SHA256 (PINNED_SHA in e141_lib.mjs) — unspoofable identity.
- All authority claims require capsule_sha256_ok=true; partial-hash matches are rejected.
- Bootstrapped node binary is derived from the verified capsule — host node NOT used for authority.
- TRUTH_CACHE written fail-closed: only on full authoritative pass, never on probe/partial run.
- npm ci (not npm install) enforced in CI — ensures lockfile-pinned dependency tree.
- SLSA L1 concept applied: pinned SHA256 of Node.js binary = artifact provenance anchor.

## Deterministic Builds & Reproducible Evidence
- All evidence files are md-only with fixed schemas, fixed key order, Unix LF endings.
- SHA256SUMS.md is rewritten deterministically (sorted filenames) after every run.
- SEAL_X2.md records a fingerprint of all non-seal evidence files (excl. SHA256SUMS.md, SEAL_X2.md).
- verifySums() verifies every hash inline at write time — no stale-hash drift possible.
- Timestamps are ISO8601 UTC — no locale-dependent formatting.

## Node Proxy/Network Pitfalls (undici + ws)
- undici ProxyAgent does NOT verify HTTPS certs via HTTP CONNECT proxies (CVE-2022-32210, fixed >=5.5.1).
- undici has no built-in offline mode — use fs module for local reads, not fetch, in offline evidence generation.
- WebSocket (ws) connections are full-duplex streaming; cannot be served offline; code 1006 on incomplete close frames.
- Proxy detected via HTTPS_PROXY/https_proxy env vars; redacted to shape_hash before any evidence write.
- Raw proxy URL NEVER written to evidence — enforced by redaction contract in e142m_contracts.mjs.
- Network tests flag-gated: ENABLE_NET=1 + I_UNDERSTAND_LIVE_RISK=1 required. Default = OFFLINE.
- PROXY_ONLY: proxy detected but net flags absent → no live requests, mode written to evidence.

## Doctor Fast-Path Safety
- Doctor is read-only cache consumer — no subprocess spawning, no network, no capsule downloads.
- Doctor cross-validates TRUTH_CACHE filesystem claims vs live disk — prevents hallucinated PASS.
- CACHE_STALE_FILESYSTEM: capsule or boot node disappeared after authoritative cache was written.
- NEXT_ACTION always a single copy-paste command; no && chains permitted (contract-enforced).

## RAW
- research_version: 2
- applies_to: E142_MEGA authority model, FINAL_MEGA evidence bundle
- sources: SLSA spec v1.0, reproducible-builds.org, undici CVE-2022-32210, undici GitHub issues
