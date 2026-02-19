# FINAL_MEGA INDEX
## Identity & State
- SNAPSHOT.md          — run identity: branch, HEAD, node version, git tree state
- VERDICT.md           — final run verdict: PASS/PROBE/BLOCKED + authoritative + reason
## Authority Chain
- AUTHORITY_MODEL.md   — 5-step authority chain definition + fail-closed rules
- TRUTH_CACHE_SPEC.md  — schema spec for TRUTH_CACHE (required keys)
- TRUTH_CACHE_README.md — pointer to canonical TRUTH_CACHE location + staleness policy
- CAPSULE_INTEGRITY.md — capsule SHA256 pin verification result
- PINNED_NODE_HEALTH.md — bootstrapped pinned-node exec health check
- BRIDGE_RUN.md        — pinned node -v bridge run result + EC
- GATE_RUN.md          — representative gate (e137_run.mjs) run result + EC
## Doctor Output
- DOCTOR_FAST_OUTPUT.md — read-only doctor snapshot (captured during this run)
## Network
- NET_CLASSIFICATION.md — offline/proxy/online mode + reason code
## Transfer Chain
- TRANSFER_EXPORT.md   — evidence archive path + sha256 + tar EC
- TRANSFER_IMPORT.md   — import verification: sha256 expected vs actual
- ACCEPTED.md          — final transfer acceptance status
## Contracts & Integrity
- CONTRACTS.md         — all contract checks: md_only, redaction, headers, schema, authority
- SEAL_X2.md           — deterministic fingerprint of evidence (fp1=fp2 parity)
- SHA256SUMS.md        — sha256 of every file; verify with: sha256sum -c
## Operator Docs
- RUNBOOK.md           — mobile-first operator guide: failure codes + exact actions
- RESEARCH_NOTES.md    — supply chain, determinism, proxy pitfalls reference
## RAW
- index_files: SNAPSHOT.md|VERDICT.md|AUTHORITY_MODEL.md|TRUTH_CACHE_SPEC.md|TRUTH_CACHE_README.md|CAPSULE_INTEGRITY.md|PINNED_NODE_HEALTH.md|BRIDGE_RUN.md|GATE_RUN.md|DOCTOR_FAST_OUTPUT.md|NET_CLASSIFICATION.md|TRANSFER_EXPORT.md|TRANSFER_IMPORT.md|ACCEPTED.md|CONTRACTS.md|SEAL_X2.md|SHA256SUMS.md|RUNBOOK.md|RESEARCH_NOTES.md|INDEX.md
