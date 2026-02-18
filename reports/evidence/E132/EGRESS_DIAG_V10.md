# E132 EGRESS DIAG V10
- mode: ONLINE_OPTIONAL
- enabled: true
- proxy_vars_present: true
- proxy_scheme: http
- proxy_shape_hash: e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09
| scenario | path | ip_family | target_kind | host_hash | port | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | rtt_ms | bytes | reason_code | retry_count | proxy_shape_hash | ca_present |
|---|---|---|---|---|---:|---|---|---|---|---|---|---:|---:|---|---:|---|---|
| S1 | direct | auto | REST | 12a479b1330d902b | 443 | true | false | false | false | false | false | 32 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S1 | direct | auto | WS | 9c4fee881277c5b3 | 9443 | true | false | false | false | false | false | 76 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S1 | direct | auto | REST | b389857f74301732 | 443 | true | false | false | false | false | false | 66 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S1 | direct | auto | WS | da3b5294f467caa2 | 443 | true | false | false | false | false | false | 54 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S1 | direct | auto | REST | 0bf564b516e6feeb | 443 | true | false | false | false | false | false | 42 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S1 | direct | auto | WS | d6a6f14567314136 | 443 | true | false | false | false | false | false | 27 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S1 | direct | auto | NEUTRAL | a379a6f6eeafb9a5 | 443 | true | false | false | false | false | false | 10 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S2 | direct | 4 | REST | 12a479b1330d902b | 443 | true | false | false | false | false | false | 82 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S2 | direct | 4 | WS | 9c4fee881277c5b3 | 9443 | true | false | false | false | false | false | 129 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S2 | direct | 4 | REST | b389857f74301732 | 443 | true | false | false | false | false | false | 37 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S2 | direct | 4 | WS | da3b5294f467caa2 | 443 | true | false | false | false | false | false | 8 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S2 | direct | 4 | REST | 0bf564b516e6feeb | 443 | true | false | false | false | false | false | 15 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S2 | direct | 4 | WS | d6a6f14567314136 | 443 | true | false | false | false | false | false | 8 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S2 | direct | 4 | NEUTRAL | a379a6f6eeafb9a5 | 443 | true | false | false | false | false | false | 9 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S3 | direct | 6 | REST | 12a479b1330d902b | 443 | false | false | false | false | false | false | 55 | 0 | queryAaaa ENOTFOUND api.binance.com | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S3 | direct | 6 | WS | 9c4fee881277c5b3 | 9443 | false | false | false | false | false | false | 4 | 0 | queryAaaa ENOTFOUND stream.binance.com | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S3 | direct | 6 | REST | b389857f74301732 | 443 | false | false | false | false | false | false | 39 | 0 | queryAaaa ENOTFOUND api-testnet.bybit.com | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S3 | direct | 6 | WS | da3b5294f467caa2 | 443 | true | false | false | false | false | false | 154 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S3 | direct | 6 | REST | 0bf564b516e6feeb | 443 | false | false | false | false | false | false | 20 | 0 | queryAaaa ENOTFOUND api.kraken.com | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S3 | direct | 6 | WS | d6a6f14567314136 | 443 | false | false | false | false | false | false | 32 | 0 | queryAaaa ENOTFOUND ws.kraken.com | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S3 | direct | 6 | NEUTRAL | a379a6f6eeafb9a5 | 443 | true | false | false | false | false | false | 11 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S4 | proxy | auto | REST | 12a479b1330d902b | 443 | true | false | false | false | false | false | 7 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S4 | proxy | auto | WS | 9c4fee881277c5b3 | 9443 | true | false | false | false | false | false | 14 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S4 | proxy | auto | REST | b389857f74301732 | 443 | true | false | false | false | false | false | 42 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S4 | proxy | auto | WS | da3b5294f467caa2 | 443 | true | false | false | false | false | false | 132 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S4 | proxy | auto | REST | 0bf564b516e6feeb | 443 | true | false | false | false | false | false | 107 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S4 | proxy | auto | WS | d6a6f14567314136 | 443 | true | false | false | false | false | false | 21 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S4 | proxy | auto | NEUTRAL | a379a6f6eeafb9a5 | 443 | true | false | false | false | false | false | 7 | 0 | E_TIMEOUT | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S5 | proxy | 4 | REST | 12a479b1330d902b | 443 | true | false | false | false | false | false | 24 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S5 | proxy | 4 | WS | 9c4fee881277c5b3 | 9443 | true | false | false | false | false | false | 91 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S5 | proxy | 4 | REST | b389857f74301732 | 443 | true | false | false | false | false | false | 7 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S5 | proxy | 4 | WS | da3b5294f467caa2 | 443 | true | false | false | false | false | false | 49 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S5 | proxy | 4 | REST | 0bf564b516e6feeb | 443 | true | false | false | false | false | false | 6 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S5 | proxy | 4 | WS | d6a6f14567314136 | 443 | true | false | false | false | false | false | 6 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
| S5 | proxy | 4 | NEUTRAL | a379a6f6eeafb9a5 | 443 | true | false | false | false | false | false | 6 | 0 | E_IPV4_BLOCKED | 0 | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | true |
