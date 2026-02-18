# E131 INTERNET POLICY NOTE
- policy_echo: runtime allowlist unknown at repo level; enforced by platform/network policy.
- methods_required: GET, CONNECT, Upgrade(websocket).
- ws_reminder: websocket handshake is HTTP GET + Upgrade.
- cache_reset_note: if policy changed, restart runtime/session before rerun.
- probe_public_target: example.com status from matrix (E_TIMEOUT)
