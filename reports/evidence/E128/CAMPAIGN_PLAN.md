# E128 CAMPAIGN PLAN
- n_attempts: 3
- k_success: 1
- spacing_sec: 5
- deterministic_attempt_ids: true
- adaptive_policy: E_RATE_LIMIT=>backoff, E_WS_NO_EVENT=>switch_endpoint, E_AUTH=>stop
