# E129 QUORUM SCORE V5
- formula: 0.25*rest_ok + 0.25*ws_ok + 0.20*freshness_ok + 0.20*provider_ok + 0.10*(1-fallback_ratio)
- per_phase: tcp,tls,http,ws_event,rest_payload weighted in rest/ws terms
- weighted_score: 0.4000
- fallback_ratio: 1.0000
