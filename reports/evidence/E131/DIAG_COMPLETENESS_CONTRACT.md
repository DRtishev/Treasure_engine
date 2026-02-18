# E131 DIAG COMPLETENESS CONTRACT
- required_columns: dns_ok,tcp_ok,tls_ok,http_ok,ws_handshake_ok,ws_event_ok,rtt_ms,bytes,reason_code,proxy_shape_hash,ip_family
- matrix_has_dns_ok: true
- matrix_has_ws_event_ok: true
- matrix_has_http_ok: true
- column_sanity_pass: true
