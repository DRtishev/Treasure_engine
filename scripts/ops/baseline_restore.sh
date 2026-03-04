#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
git restore --source=HEAD --worktree --staged reports/evidence artifacts
# Clean untracked + ignored runtime evidence (EPOCH-* dirs are .gitignored)
git clean -fdx reports/evidence/EPOCH-* 2>/dev/null || true
git clean -fdx artifacts/fsm 2>/dev/null || true
echo "[PASS] ops_baseline_restore — NONE"
