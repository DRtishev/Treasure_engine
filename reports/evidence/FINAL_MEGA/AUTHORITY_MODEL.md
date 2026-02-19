# FINAL_MEGA AUTHORITY MODEL
## Chain (all must pass for authoritative=true)
- step_1: capsule_present=true AND capsule_sha256_ok=true (supply chain integrity)
- step_2: bootstrapped_node_present=true AND pinned_node_health_ok=true (pinned runtime)
- step_3: bridge_ec=0 (pinned node -v via execWithPinned)
- step_4: rep_gate_ec=0 (scripts/verify/e137_run.mjs via pinned node)
- step_5: authoritative=true written to TRUTH_CACHE (fail-closed: only on full pass)
## Doctor Cross-Validation
- doctor reads TRUTH_CACHE and cross-checks capsule_present+bootstrapped_node_present vs live filesystem
- if filesystem artifacts gone since cache was written: BLOCKED/CACHE_STALE_FILESYSTEM
## Probe Mode
- probe=true skips all acquisition; authoritative always false; TRUTH_CACHE NOT written
## Fail-Closed Rules
- TRUTH_CACHE written ONLY when authoritative=true
- doctor NEVER triggers heavy execution
- network tests require ENABLE_NET=1 AND I_UNDERSTAND_LIVE_RISK=1
## RAW
- authoritative: false
- reason_code: PROBE_ONLY_NON_AUTHORITATIVE
- bridge_ec: 1
- rep_gate_ec: 1
- capsule_sha256_ok: false
- pinned_node_health_ok: false
