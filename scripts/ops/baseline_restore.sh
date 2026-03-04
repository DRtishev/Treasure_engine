#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
# Remove stale git index.lock if no other git process is running
if [ -f "$ROOT/.git/index.lock" ]; then
  if ! pgrep -f "git (commit|merge|rebase|stash)" >/dev/null 2>&1; then
    rm -f "$ROOT/.git/index.lock"
  fi
fi
git restore --source=HEAD --worktree --staged reports/evidence artifacts
echo "[PASS] ops_baseline_restore — NONE"
