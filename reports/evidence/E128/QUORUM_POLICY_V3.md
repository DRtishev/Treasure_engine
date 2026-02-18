# E128 QUORUM POLICY V3
- FULL requires: rest>=1 AND ws>=1 in same run
- freshness_sla_ok: true
- fallback_ratio <= 0.10
- parity_live_input: true
- diversity: >=2 providers OR >=2 endpoint hosts
- deterministic_sort: provider,channel,target_id
