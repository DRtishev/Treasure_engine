#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "[FAIL] executor_with_node22.sh — OP01: missing command" >&2
  BOOTSTRAP_STAGE=precheck BOOTSTRAP_EVENT=fail BOOTSTRAP_ERROR_CLASS=OP01 node scripts/verify/env_node22_bootstrap_gate.mjs || true
  exit 1
fi

TARGET_NODE="v22.22.0"
START_EPOCH="$(date +%s)"
NVM_SH="$HOME/.nvm/nvm.sh"

emit_gate() {
  local stage="$1"
  local event="$2"
  local klass="$3"
  local now elapsed
  now="$(date +%s)"
  elapsed=$((now - START_EPOCH))
  BOOTSTRAP_STAGE="$stage" BOOTSTRAP_EVENT="$event" BOOTSTRAP_ERROR_CLASS="$klass" BOOTSTRAP_ELAPSED_SEC="$elapsed" BOOTSTRAP_NODE_VERSION="$(node -v 2>/dev/null || echo unknown)" node scripts/verify/env_node22_bootstrap_gate.mjs || true
}

if [[ "$(node -v 2>/dev/null || true)" == "$TARGET_NODE" ]]; then
  emit_gate "precheck" "success" "NONE"
  exec "$@"
fi

if [[ ! -f "$NVM_SH" ]]; then
  emit_gate "source_nvm" "fail" "ENV01"
  exit 1
fi

if ! timeout 240s bash -lc "source '$NVM_SH' && nvm install 22.22.0 >/dev/null"; then
  rc=$?
  if [[ $rc -eq 124 ]]; then
    emit_gate "nvm_install" "timeout" "ENV02"
  else
    emit_gate "nvm_install" "fail" "ENV01"
  fi
  exit 1
fi

if ! timeout 240s bash -lc "source '$NVM_SH' && nvm use 22.22.0 >/dev/null"; then
  rc=$?
  if [[ $rc -eq 124 ]]; then
    emit_gate "nvm_use" "timeout" "ENV02"
  else
    emit_gate "nvm_use" "fail" "ENV01"
  fi
  exit 1
fi

if [[ "$(bash -lc "source '$NVM_SH' && nvm use 22.22.0 >/dev/null && node -v")" != "$TARGET_NODE" ]]; then
  emit_gate "verify_version" "fail" "ENV01"
  exit 1
fi

emit_gate "complete" "success" "NONE"
NODE22_WRAPPED_TIMEOUT="${NODE22_WRAPPED_TIMEOUT:-900s}"
if timeout "$NODE22_WRAPPED_TIMEOUT" bash -lc "source '$NVM_SH' && nvm use 22.22.0 >/dev/null && exec \"\$@\"" bash "$@"; then
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
