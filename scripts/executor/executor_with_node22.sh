#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "[FAIL] executor_with_node22.sh — OP01: missing command" >&2
  BOOTSTRAP_STAGE=precheck BOOTSTRAP_EVENT=fail BOOTSTRAP_ERROR_CLASS=OP01 node scripts/verify/env_node22_bootstrap_gate.mjs || true
  exit 1
fi

START_EPOCH="$(date +%s)"

emit_gate() {
  local stage="$1"
  local event="$2"
  local klass="$3"
  local now elapsed
  now="$(date +%s)"
  elapsed=$((now - START_EPOCH))
  BOOTSTRAP_STAGE="$stage" BOOTSTRAP_EVENT="$event" BOOTSTRAP_ERROR_CLASS="$klass" BOOTSTRAP_ELAPSED_SEC="$elapsed" BOOTSTRAP_NODE_VERSION="$(node -v 2>/dev/null || echo unknown)" node scripts/verify/env_node22_bootstrap_gate.mjs || true
}

emit_gate "precheck" "success" "NONE"
NODE22_WRAPPED_TIMEOUT="${NODE22_WRAPPED_TIMEOUT:-900s}"
if timeout "$NODE22_WRAPPED_TIMEOUT" bash scripts/ops/node_authority_run.sh "$@"; then
  emit_gate "wrapped_cmd" "success" "NONE"
  exit 0
else
  rc=$?
  if [[ $rc -eq 124 ]]; then
    emit_gate "wrapped_cmd" "timeout" "ENV02"
  else
    emit_gate "wrapped_cmd" "fail" "ENV01"
  fi
  exit 1
fi
