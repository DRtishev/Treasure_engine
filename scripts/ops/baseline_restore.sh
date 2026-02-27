#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
git restore --source=HEAD --worktree --staged reports/evidence artifacts
echo "[PASS] ops_baseline_restore — NONE"
