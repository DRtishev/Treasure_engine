# E133 PROXY BREAKOUT MATRIX
- direct_path_stages: dns_ok,tcp_ok,tls_ok,http_ok,ws_handshake_ok,ws_event_ok
- proxy_path_stages: tcp_to_proxy_ok,connect_tunnel_ok,tls_over_tunnel_ok,http_over_tunnel_ok,ws_over_tunnel_ok
- reason_codes: E_PROXY_CONNECT_FAIL,E_PROXY_TUNNEL_FAIL,E_PROXY_AUTH_REQUIRED,E_WS_EVENT_TIMEOUT
