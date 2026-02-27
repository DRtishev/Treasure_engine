#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXEC_DIR="$ROOT/reports/evidence/EXECUTOR"
MANUAL_DIR="$EXEC_DIR/gates/manual"
mkdir -p "$MANUAL_DIR"

RUN_ID="$(git -C "$ROOT" rev-parse --short=12 HEAD 2>/dev/null || echo UNKNOWN)"
NEXT_ACTION="npm run -s epoch:victory:seal"
IMAGE="node:22.22.0-bullseye-slim"

status="PASS"
reason_code="NONE"
docker_available="NO"
image_runnable="NO"
node_runtime="UNKNOWN"
image_id="UNKNOWN"

if command -v docker >/dev/null 2>&1; then
  docker_available="YES"
  if docker image inspect "$IMAGE" >/dev/null 2>&1 || docker pull "$IMAGE" >/dev/null 2>&1; then
    image_id="$(docker image inspect "$IMAGE" --format '{{.Id}}' 2>/dev/null || echo UNKNOWN)"
    node_runtime="$(docker run --rm "$IMAGE" node -v 2>/dev/null || echo UNKNOWN)"
    if [[ "$node_runtime" =~ ^v22\.22\.0$ ]]; then
      image_runnable="YES"
    fi
  fi
fi

if [[ "$docker_available" != "YES" || "$image_runnable" != "YES" ]]; then
  status="BLOCKED"
  reason_code="NT02"
fi

cat > "$EXEC_DIR/NODE_BACKEND_CHECK.md" <<MD
# NODE_BACKEND_CHECK.md

STATUS: $status
REASON_CODE: $reason_code
RUN_ID: $RUN_ID
NEXT_ACTION: $NEXT_ACTION

- docker_available: $docker_available
- image: $IMAGE
- image_id: $image_id
- image_runnable: $image_runnable
- node_runtime: $node_runtime
MD

cat > "$MANUAL_DIR/node_backend_check.json" <<JSON
{"schema_version":"1.0.0","status":"$status","reason_code":"$reason_code","run_id":"$RUN_ID","next_action":"$NEXT_ACTION","docker_available":"$docker_available","image":"$IMAGE","image_id":"$image_id","image_runnable":"$image_runnable","node_runtime":"$node_runtime"}
JSON

if [[ "$status" == "PASS" ]]; then
  echo "[PASS] node_backend_check — NONE"
  exit 0
fi

echo "[BLOCKED] node_backend_check — NT02"
exit 2
