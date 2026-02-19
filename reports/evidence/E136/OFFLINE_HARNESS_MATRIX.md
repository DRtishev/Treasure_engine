# E136 OFFLINE HARNESS MATRIX
- source_epoch: E135
- source_file: reports/evidence/E135/TRANSPORT_HARNESS_MATRIX.md
- e135_matrix_sha256: f42a2e23a0d3fe1ba9fe710b371089110e151da7af02b743d8fefd1b1d3746b8
- e135_verdict_sha256: 560c03ce641dac5b53b936fd0bebf0a8d3ee6c78e7be01ec7e2e9b181ebba603
- e135_status: PASS
- e135_sha256sums_sha256: 09cd0a735c75ea20badb7d84c62e46172511babb919f14f6d983ffecc5964a32
- rerun_required: NO (E135 harness is always offline-deterministic)
- scenarios_verified: direct_http, direct_ws, proxy_http_connect, proxy_ws_connect
- all_reason_codes: OK
## Stage Summary
| scenario | direct_stages_ok | proxy_stages_ok | reason_code |
|---|---|---|---|
| direct_http | tcp_ok, tls_ok, http_ok | N/A | OK |
| direct_ws | tcp_ok, tls_ok, ws_handshake_ok, ws_event_ok | N/A | OK |
| proxy_http_connect | tcp_ok | tcp_to_proxy_ok, connect_tunnel_ok, http_over_tunnel_ok | OK |
| proxy_ws_connect | tcp_ok | tcp_to_proxy_ok, connect_tunnel_ok, ws_over_tunnel_ok, ws_event_ok | OK |
