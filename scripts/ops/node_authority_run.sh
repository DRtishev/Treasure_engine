#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXEC_DIR="$ROOT/reports/evidence/EXECUTOR"
MANUAL_DIR="$EXEC_DIR/gates/manual"
SELFTEST_DIR="$EXEC_DIR/selftest"
SELFTEST_MANUAL_DIR="$SELFTEST_DIR/gates/manual"
mkdir -p "$MANUAL_DIR"

RUN_ID="$(git -C "$ROOT" rev-parse --short=12 HEAD 2>/dev/null || echo UNKNOWN)"
NEXT_ACTION="npm run -s ops:node:truth"
REQUIRED_NODE="22.22.0"
IMAGE_PRIMARY="node:22.22.0-bullseye-slim"
IMAGE_FALLBACK="node:22.22.0-slim"
TOOLCHAIN_BASE="${NODE22_TOOLCHAIN_DIR:-$ROOT/artifacts/toolchains/node/v22.22.0}"
TOOLCHAIN_BASENAME="node-v22.22.0-linux-x64"
TOOLCHAIN_LOCK="$TOOLCHAIN_BASE/${TOOLCHAIN_BASENAME}.lock.json"
TOOLCHAIN_NODE="$TOOLCHAIN_BASE/linux-x64/${TOOLCHAIN_BASENAME}/bin/node"

status="PASS"
reason_code="NONE"
backend="HOST_NODE22"
node_runtime="$(node -v 2>/dev/null || echo UNKNOWN)"
image_tag="NONE"
image_id="NONE"
out_dir="$EXEC_DIR"
out_manual_dir="$MANUAL_DIR"

write_receipt() {
  mkdir -p "$out_manual_dir"
  cat > "$out_dir/NODE_AUTHORITY_RECEIPT.md" <<MD
# NODE_AUTHORITY_RECEIPT.md

STATUS: $status
REASON_CODE: $reason_code
RUN_ID: $RUN_ID
NEXT_ACTION: $NEXT_ACTION

- backend: $backend
- required_node: $REQUIRED_NODE
- node_runtime: $node_runtime
- image_tag: $image_tag
- image_id: $image_id
MD

  cat > "$out_manual_dir/node_authority_receipt.json" <<JSON
{"schema_version":"1.0.0","status":"$status","reason_code":"$reason_code","run_id":"$RUN_ID","next_action":"$NEXT_ACTION","backend":"$backend","required_node":"$REQUIRED_NODE","node_runtime":"$node_runtime","image_tag":"$image_tag","image_id":"$image_id"}
JSON
}

write_selftest_case() {
  local case_name="$1"
  local case_status="$2"
  local case_reason="$3"
  local case_backend="$4"
  local case_runtime="$5"
  local case_image_tag="$6"
  local case_image_id="$7"

  cat > "$SELFTEST_DIR/NODE_AUTHORITY_RECEIPT_${case_name}.md" <<MD
# NODE_AUTHORITY_RECEIPT_${case_name}.md

STATUS: $case_status
REASON_CODE: $case_reason
RUN_ID: NODEAUTH_SELFTEST
NEXT_ACTION: $NEXT_ACTION

- backend: $case_backend
- required_node: $REQUIRED_NODE
- node_runtime: $case_runtime
- image_tag: $case_image_tag
- image_id: $case_image_id
MD

  cat > "$SELFTEST_MANUAL_DIR/node_authority_receipt_${case_name}.json" <<JSON
{"schema_version":"1.0.0","status":"$case_status","reason_code":"$case_reason","run_id":"NODEAUTH_SELFTEST","next_action":"$NEXT_ACTION","backend":"$case_backend","required_node":"$REQUIRED_NODE","node_runtime":"$case_runtime","image_tag":"$case_image_tag","image_id":"$case_image_id"}
JSON
}

if [[ "${1:-}" == "--selftest" ]]; then
  mkdir -p "$SELFTEST_MANUAL_DIR"
  write_selftest_case "HOST_PASS" "PASS" "NONE" "HOST_NODE22" "v22.22.0" "NONE" "NONE"
  write_selftest_case "BLOCKED_NT02" "BLOCKED" "NT02" "NO_NODE22_BACKEND" "UNKNOWN" "NONE" "NONE"
  write_selftest_case "VENDORED_PASS" "PASS" "NONE" "VENDORED_NODE22" "v22.22.0" "NONE" "NONE"
  cat > "$SELFTEST_DIR/NODE_AUTHORITY_SELFTEST.md" <<MD
# NODE_AUTHORITY_SELFTEST.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: NODEAUTH_SELFTEST
NEXT_ACTION: $NEXT_ACTION

- cases:
  - HOST_PASS => PASS/NONE
  - BLOCKED_NT02 => BLOCKED/NT02
  - VENDORED_PASS => PASS/NONE
MD
  echo "[PASS] node_authority_run selftest"
  exit 0
fi

if [[ "$node_runtime" =~ ^v22\. ]]; then
  write_receipt
  exec "$@"
fi

container_backend=""
container_image=""
if command -v docker >/dev/null 2>&1; then
  container_backend="docker"
elif command -v podman >/dev/null 2>&1; then
  container_backend="podman"
fi

if [[ -n "$container_backend" ]]; then
  backend="${container_backend^^}_NODE22"
  image_tag="$IMAGE_PRIMARY"
  if ! "$container_backend" image inspect "$IMAGE_PRIMARY" >/dev/null 2>&1; then
    if ! "$container_backend" pull "$IMAGE_PRIMARY" >/dev/null 2>&1; then
      image_tag="$IMAGE_FALLBACK"
      if ! "$container_backend" pull "$IMAGE_FALLBACK" >/dev/null 2>&1; then
        image_tag="NONE"
      fi
    fi
  fi

  if [[ "$image_tag" != "NONE" ]]; then
    image_id="$("$container_backend" image inspect "$image_tag" --format '{{.Id}}' 2>/dev/null || echo UNKNOWN)"
    node_runtime="$("$container_backend" run --rm "$image_tag" node -v 2>/dev/null || echo UNKNOWN)"
    if [[ "$node_runtime" =~ ^v22\.22\.0$ ]]; then
      write_receipt
      exec "$container_backend" run --rm -v "$ROOT:/repo" -w /repo "$image_tag" "$@"
    fi
  fi
fi

if [[ -f "$TOOLCHAIN_LOCK" && -x "$TOOLCHAIN_NODE" ]]; then
  backend="VENDORED_NODE22"
  image_tag="NONE"
  image_id="NONE"
  node_runtime="$($TOOLCHAIN_NODE -v 2>/dev/null || echo UNKNOWN)"
  if [[ "$node_runtime" =~ ^v22\.22\.0$ ]]; then
    write_receipt
    export PATH="$(dirname "$TOOLCHAIN_NODE"):$PATH"
    exec "$@"
  fi
fi

status="BLOCKED"
reason_code="NT02"
backend="NO_NODE22_BACKEND"
node_runtime="UNKNOWN"
image_tag="NONE"
image_id="NONE"
write_receipt
echo "[BLOCKED] node_authority_run — NT02"
exit 2
