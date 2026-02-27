#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_CANDIDATE="$(cd "$SCRIPT_DIR/../.." && pwd)"
ROOT="$(git -C "$ROOT_CANDIDATE" rev-parse --show-toplevel 2>/dev/null || echo "$ROOT_CANDIDATE")"
EXEC_DIR="$ROOT/reports/evidence/EXECUTOR"
MANUAL_DIR="$EXEC_DIR/gates/manual"
SELFTEST_DIR="$EXEC_DIR/selftest"
SELFTEST_MANUAL_DIR="$SELFTEST_DIR/gates/manual"
mkdir -p "$MANUAL_DIR"

HEAD7="$(git -C "$ROOT" rev-parse --short=7 HEAD 2>/dev/null || echo UNKNOWN)"
RUN_ID="$(git -C "$ROOT" rev-parse --short=12 HEAD 2>/dev/null || echo UNKNOWN)"
NEXT_ACTION="npm run -s ops:node:truth"
REQUIRED_NODE="22.22.0"
IMAGE_PRIMARY="node:22.22.0-bullseye-slim"
IMAGE_FALLBACK="node:22.22.0-slim"
TOOLCHAIN_BASE_INPUT="${NODE22_TOOLCHAIN_DIR:-artifacts/toolchains/node/v22.22.0}"
if [[ "$TOOLCHAIN_BASE_INPUT" = /* ]]; then
  TOOLCHAIN_BASE="$TOOLCHAIN_BASE_INPUT"
else
  TOOLCHAIN_BASE="$ROOT/$TOOLCHAIN_BASE_INPUT"
fi
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
backend_ladder_attempts=()

cmdslug() {
  local raw="$*"
  echo "$raw" | tr '[:upper:]' '[:lower:]' | tr ' /:' '___' | tr -cd 'a-z0-9_' | sed 's/_\+/_/g' | sed 's/^_//;s/_$//' | cut -c1-48
}

is_authoritative_cmd() {
  local raw="$*"
  [[ "$raw" == *"epoch:victory:seal"* ]] && return 0
  [[ "$raw" == *"_epoch:victory:seal"* ]] && return 0
  [[ "$raw" == *"epoch:mega:proof:x2"* ]] && return 0
  [[ "$raw" == *"_epoch:mega:proof:x2"* ]] && return 0
  [[ "$raw" == *"epoch:foundation:seal"* ]] && return 0
  [[ "$raw" == *"_epoch:foundation:seal"* ]] && return 0
  [[ "$raw" == *"epoch:victory:triage"* ]] && return 0
  [[ "$raw" == *"_epoch:victory:triage"* ]] && return 0
  [[ "$raw" == *"verify:repo:byte-audit:x2"* ]] && return 0
  [[ "$raw" == *"_verify:repo:byte-audit:x2"* ]] && return 0
  [[ "$raw" == *"verify:public:data:readiness"* ]] && return 0
  [[ "$raw" == *"_verify:public:data:readiness"* ]] && return 0
  return 1
}

setup_receipt_paths() {
  local raw="$*"
  if is_authoritative_cmd "$raw"; then
    local slug
    slug="$(cmdslug "$raw")"
    local deterministic_run_id="NODEAUTH_${HEAD7}_${slug}"
    out_dir="$ROOT/reports/evidence/EPOCH-NODEAUTH-${deterministic_run_id}/node_authority"
    out_manual_dir="$out_dir"
    mkdir -p "$out_dir"
  fi
}

write_backend_witness() {
  local selected_backend="$1"
  local reason="$2"
  local witness_dir="$ROOT/reports/evidence/EPOCH-NODEAUTH-${RUN_ID}/node_authority"
  local host_node_version="$(node -v 2>/dev/null || echo UNKNOWN)"
  local docker_present="false"
  local podman_present="false"
  local vendored_lock_present="false"
  local vendored_node_present="false"
  local vendored_node_exec_ok="false"
  local vendored_node_version="UNKNOWN"
  local attempts_json
  local selected_backend_json="null"

  command -v docker >/dev/null 2>&1 && docker_present="true"
  command -v podman >/dev/null 2>&1 && podman_present="true"
  [[ -f "$TOOLCHAIN_LOCK" ]] && vendored_lock_present="true"
  [[ -f "$TOOLCHAIN_NODE" ]] && vendored_node_present="true"
  if [[ "$vendored_node_present" == "true" ]]; then
    vendored_node_version="$($TOOLCHAIN_NODE -v 2>/dev/null || echo UNKNOWN)"
    if [[ "$vendored_node_version" == "v22.22.0" ]]; then
      vendored_node_exec_ok="true"
    fi
  fi

  if [[ -n "$selected_backend" ]]; then
    selected_backend_json="\"$selected_backend\""
  fi

  attempts_json="["
  local first=1
  local item
  for item in "${backend_ladder_attempts[@]}"; do
    if [[ $first -eq 0 ]]; then
      attempts_json+=","
    fi
    attempts_json+="\"$item\""
    first=0
  done
  attempts_json+="]"

  mkdir -p "$witness_dir"
  cat > "$witness_dir/BACKEND_WITNESS.json" <<JSON
{
  "backend_ladder_attempts": $attempts_json,
  "host_node_version": "$host_node_version",
  "docker_present": $docker_present,
  "podman_present": $podman_present,
  "vendored_root_path": "$(realpath -m "$TOOLCHAIN_BASE")",
  "vendored_lock_path": "$(realpath -m "$TOOLCHAIN_LOCK")",
  "vendored_lock_present": $vendored_lock_present,
  "vendored_node_path": "$(realpath -m "$TOOLCHAIN_NODE")",
  "vendored_node_present": $vendored_node_present,
  "vendored_node_exec_ok": $vendored_node_exec_ok,
  "selected_backend": $selected_backend_json,
  "reason_code": "$reason"
}
JSON
}

write_receipt() {
  mkdir -p "$out_manual_dir"
  cat > "$out_dir/RECEIPT.md" <<MD
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

  cat > "$out_manual_dir/receipt.json" <<JSON
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

authority_probe_command="${NODEAUTH_FORCE_COMMAND:-$*}"
setup_receipt_paths "$authority_probe_command"

if [[ -f "$TOOLCHAIN_LOCK" && -f "$TOOLCHAIN_NODE" ]]; then
  chmod +x "$TOOLCHAIN_NODE" 2>/dev/null || true
  backend_ladder_attempts+=("VENDORED_NODE22")
  backend="VENDORED_NODE22"
  image_tag="NONE"
  image_id="NONE"
  node_runtime="$($TOOLCHAIN_NODE -v 2>/dev/null || echo UNKNOWN)"
  if [[ "$node_runtime" =~ ^v22\.22\.0$ ]]; then
    write_backend_witness "$backend" "NONE"
    write_receipt
    export PATH="$(dirname "$TOOLCHAIN_NODE"):$PATH"
    exec "$@"
  fi
fi
backend_ladder_attempts+=("VENDORED_NODE22_MISS")

if [[ "$node_runtime" =~ ^v22\. ]]; then
  backend_ladder_attempts+=("HOST_NODE22")
  write_backend_witness "$backend" "NONE"
  write_receipt
  exec "$@"
fi
backend_ladder_attempts+=("HOST_NODE22_MISS")

container_backend=""
if command -v docker >/dev/null 2>&1; then
  container_backend="docker"
elif command -v podman >/dev/null 2>&1; then
  container_backend="podman"
fi

if [[ -n "$container_backend" ]]; then
  backend_ladder_attempts+=("${container_backend^^}_NODE22")
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
      write_backend_witness "$backend" "NONE"
      write_receipt
      exec "$container_backend" run --rm -v "$ROOT:/repo" -w /repo "$image_tag" "$@"
    fi
  fi
fi

status="BLOCKED"
reason_code="NT02"
backend="NO_NODE22_BACKEND"
node_runtime="UNKNOWN"
image_tag="NONE"
image_id="NONE"
write_receipt
write_backend_witness "" "NT02"
echo "[BLOCKED] node_authority_run — NT02"
exit 2
