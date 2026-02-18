# E130 QUORUM POLICY V5
- transport_quorum: K=2 of M tcp+tls successes and >=1 ws_event
- freshness_sla_sec: 5
- live_quorum: rest_ok && ws_event_ok same window
- no_full_if_fallback_ratio_gt: 0.0
- online_required_fail_closed: true
