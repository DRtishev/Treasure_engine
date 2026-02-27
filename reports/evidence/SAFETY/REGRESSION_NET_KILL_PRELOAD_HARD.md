# REGRESSION_NET_KILL_PRELOAD_HARD.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 0d5bf328af69
NEXT_ACTION: npm run -s verify:regression:net-kill-preload-hard

- ec: 0
- preload_path: /workspace/Treasure_engine/scripts/safety/net_kill_preload.cjs
- node_options_used: --require "/workspace/Treasure_engine/scripts/safety/net_kill_preload.cjs"
- stderr: NONE
- fetch: ok=true code=NETV01 message=NETWORK_DISABLED_BY_TREASURE_NET_KILL
- http.request: ok=true code=NETV01 message=NETWORK_DISABLED_BY_TREASURE_NET_KILL
- https.request: ok=true code=NETV01 message=NETWORK_DISABLED_BY_TREASURE_NET_KILL
- dns.lookup: ok=true code=NETV01 message=NETWORK_DISABLED_BY_TREASURE_NET_KILL
- net.connect: ok=true code=NETV01 message=NETWORK_DISABLED_BY_TREASURE_NET_KILL
- tls.connect: ok=true code=NETV01 message=NETWORK_DISABLED_BY_TREASURE_NET_KILL
