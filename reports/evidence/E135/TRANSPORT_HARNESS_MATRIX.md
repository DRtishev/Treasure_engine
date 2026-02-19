# E135 TRANSPORT HARNESS MATRIX
- mode: OFFLINE_DETERMINISTIC
- servers: 127.0.0.1:0 ephemeral (http_echo, ws_echo, connect_proxy)
- retries: 0
- timeouts: fixed
- external_network: NONE
| scenario | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | tcp_to_proxy_ok | connect_tunnel_ok | tls_over_tunnel_ok | http_over_tunnel_ok | ws_over_tunnel_ok | rtt_ms | reason_code |
|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| direct_http | true | true | true | false | false | false | false | false | false | false | 28 | OK |
| direct_ws | true | true | false | true | true | false | false | false | false | false | 33 | OK |
| proxy_http_connect | true | false | true | false | false | true | true | true | true | false | 41 | OK |
| proxy_ws_connect | true | false | false | true | true | true | true | true | false | true | 43 | OK |
