# NODE_TOOLCHAIN_ENSURE.md

STATUS: BLOCKED
REASON_CODE: ACQ_LOCK01
DETAIL_KIND: lock_missing
DETAIL_MSG: toolchain lock file absent — run bootstrap to acquire vendored node
NEXT_ACTION: npm run -s ops:node:toolchain:bootstrap
RUN_ID: STABLE

- lock_path: /home/user/Treasure_engine/artifacts/toolchains/node/v22.22.0/node-v22.22.0-linux-x64.lock.json
- node_bin: /home/user/Treasure_engine/artifacts/toolchains/node/v22.22.0/linux-x64/node-v22.22.0-linux-x64/bin/node
- node_runtime: UNKNOWN
- expected_version: v22.22.0
