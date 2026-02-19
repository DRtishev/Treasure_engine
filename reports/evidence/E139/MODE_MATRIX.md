# E139 MODE MATRIX
| scenario | expected_mode | expected_next_action |
|---|---|---|
| Node<22, probe=false | AUTHORITATIVE_BLOCKED | run verify:e139:probe or upgrade Node>=22 |
| Node<22, probe=true | PROBE_ONLY_NON_AUTHORITATIVE | install Node>=22 then run verify:e139 |
| Node>=22, online flags absent | ONLINE_SKIPPED_FLAGS_NOT_SET | continue offline authoritative path |
| Node>=22, ENABLE_NET=1+RISK+ONLINE_OPTIONAL=1 | ONLINE_READY_OPTIONAL | run optional online diagnostics |
| Node>=22, ENABLE_NET=1+RISK+ONLINE_REQUIRED=1 | ONLINE_READY_REQUIRED | run online-required diagnostics |
