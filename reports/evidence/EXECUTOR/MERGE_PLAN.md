# MERGE_PLAN.md — WOW + Data Organ Merge Staging

STATUS: COMPLETE
BRANCH: claude/merge-staging-wow-data-organ-3ymaK
HEAD_SHA: 692d9de68bc6daa99aefc854294c1e2d1ae11910
DATE: 2026-02-28

---

## 1. BRANCH INVENTORY

| Branch | HEAD SHA | Short Description | Superset of |
|--------|----------|-------------------|-------------|
| origin/main | 40c3f98 | Merged WOW organism (EventBus/TimeMachine/Autopilot/Cockpit/Candidates) via PR #82 | — |
| origin/claude/data-organ-r1-sabotage-fix-H3pBX | 39e1005 | Sabotage fixes: toolchain ensure, liq_side hash parity, SSOT align, DATA_ORGAN events | — |
| origin/claude/data-organ-scale-H3pBX | 692d9de | Scale: BUS03, Lane Registry, readiness scorecard, cockpit fixes + all of sabotage-fix | sabotage-fix (confirmed) |
| origin/MAIN_COPY | d16ff87 | Stale snapshot of old main (pre-profit-epoch-baseline) | — (historical) |
| origin/claude/agent-os-timemachine-yo06o | 8357593 | WOW Organism: EventBus/TimeMachine/Autopilot/Cockpit/Life + Candidate Registry | MERGED INTO MAIN (PR #82) |

---

## 2. BRANCH RELATIONSHIPS

### Merge-base analysis

```
merge-base(main, sabotage-fix) = 40c3f98  (= origin/main itself)
merge-base(main, scale)        = 40c3f98  (= origin/main itself)
merge-base(sabotage-fix, scale) = 39e1005 (= HEAD of sabotage-fix)
```

### Key finding: scale is a strict superset of sabotage-fix

```
Commits in scale beyond main (3 total):
  44c771e  fix: data-organ-r1 sabotage fixes + eventbus solder (all 4 sabotages + phase 5)
  39e1005  chore: update EXECUTOR evidence receipts from gate runs
  692d9de  feat: Scale the Organism — BUS03 + Lane Registry + Cockpit Readiness Scorecard

Commits in sabotage-fix beyond main (2 total):
  44c771e  fix: data-organ-r1 sabotage fixes + eventbus solder (all 4 sabotages + phase 5)
  39e1005  chore: update EXECUTOR evidence receipts from gate runs
```

`sabotage-fix` has zero (0) commits not already in `scale`.
Proof: `git log --oneline origin/sabotage-fix ^origin/scale` → (empty)

### agent-os branch

Already merged into `main` via PR #82 on 2026-02-28.
Not in scope — no action required.

### MAIN_COPY branch

Old snapshot at `d16ff87` (pre-profit-epoch, ~PR #70 era). Stale. No action.

---

## 3. CHOSEN STRATEGY

**OPTION A — Single merge (scale is superset)**

Rationale:
- `agent-os` already in `main` ✓
- `scale` already contains all of `sabotage-fix` ✓
- One merge instead of three → minimal conflict surface
- Fast-forward merge = no merge commit = linear history preserved

### Merge order executed

```
Base: origin/main (40c3f98) = claude/merge-staging-wow-data-organ-3ymaK initial state
Step 1: git merge --no-edit origin/claude/data-organ-scale-H3pBX
        Result: Fast-forward to 692d9de (NO CONFLICTS)
```

### Conflicts

**None.** Fast-forward merge — clean linear history.

---

## 4. FILES CHANGED (merge delta vs main)

48 files changed, 2726 insertions(+), 206 deletions(-)

Key additions:
- `scripts/edge/data_organ/event_emitter.mjs` — DATA_ORGAN EventEmitter
- `scripts/ops/node_toolchain_ensure.mjs` — offline-only toolchain gate (sabotage fix)
- `scripts/ops/node_toolchain_acquire.mjs` — updated with double-key lock
- `scripts/ops/cockpit.mjs` — readiness scorecard integration
- `scripts/ops/eventbus_v1.mjs` — BUS03 stable aggregation
- `scripts/verify/regression_bus03_aggregator_stable_order.mjs` — BUS03 gate
- `scripts/verify/regression_lane01_registry_present.mjs` — LANE01 gate
- `scripts/verify/regression_lane02_code_matches_registry.mjs` — LANE02 gate
- `scripts/verify/regression_lane03_no_dup_schema_version.mjs` — LANE03 gate
- `scripts/verify/regression_cockpit06_readiness_scorecard_present.mjs` — COCKPIT06 gate
- `scripts/verify/regression_agent03_no_legacy_contradictions.mjs` — AGENT03 gate
- `scripts/verify/regression_data_evt01_event_emission.mjs` — DATA_EVT01 gate
- `scripts/verify/regression_liq_lock01_normalized_hash_match.mjs` — LIQ hash gate
- `scripts/verify/regression_liq_ssot01_schema_alignment.mjs` — LIQ SSOT gate
- `scripts/verify/regression_net_toolchain01_no_net_in_verify_fast.mjs` — net-kill gate
- `specs/data_lanes.json` + `specs/data_lanes.schema.json` — Lane Registry

---

## 5. GATE SCOREBOARD (post-merge)

| Gate | Command | EC | Status | reason_code |
|------|---------|-----|--------|-------------|
| verify:fast (run 1) | npm run -s verify:fast | 0 | PASS | NONE |
| verify:fast (run 2) | npm run -s verify:fast | 0 | PASS | NONE (determinism confirmed) |
| ops:life | npm run -s ops:life | 0 | PASS | NONE (6/6 steps PASS) |
| verify:public:data:readiness | npm run -s verify:public:data:readiness | 2 | NEEDS_DATA | RDY01 (no live data feeds — expected in clean repo) |
| ops:cockpit | npm run -s ops:cockpit | 0 | PASS | NONE |
| regression_agent03 | npm run -s verify:regression:agent03-no-legacy-contradictions | 0 | PASS | NONE |
| regression_bus03 | npm run -s verify:regression:bus03-aggregator-stable-order | 0 | PASS | NONE |
| regression_lane01 | npm run -s verify:regression:lane01-registry-present | 0 | PASS | NONE |
| regression_lane02 | npm run -s verify:regression:lane02-code-matches-registry | 0 | PASS | NONE |
| regression_lane03 | npm run -s verify:regression:lane03-no-dup-schema-version | 0 | PASS | NONE |

**Note on NEEDS_DATA:** `verify:public:data:readiness` returning EC=2/RDY01 is expected baseline behavior.
No live data feeds (Binance/Bybit/OKX) are connected in this offline CERT environment.
`ops:cockpit` correctly surfaces `readiness: NEEDS_DATA` without failing.

---

## 6. OPS:LIFE STEPS (post-merge)

| Step | Gate | Status |
|------|------|--------|
| S01 | verify:fast | PASS |
| S02 | ops:eventbus:smoke (5 events) | PASS |
| S03 | ops:timemachine (10 ticks) | PASS |
| S04 | ops:autopilot [DRY_RUN, mode=CERT] | PASS |
| S05 | ops:cockpit (8 gates, 0 failed) | PASS |
| S06 | ops:candidates (0 candidates) | PASS |

---

## 7. EVIDENCE PATHS

```
reports/evidence/EPOCH-LIFE-692d9de68bc6/
reports/evidence/EPOCH-COCKPIT-692d9de68bc6/
reports/evidence/EPOCH-TIMEMACHINE-692d9de68bc6/
reports/evidence/EPOCH-AUTOPILOTV2-692d9de68bc6/
reports/evidence/EPOCH-REGISTRY-692d9de68bc6/
reports/evidence/EPOCH-EVENTBUS-692d9de68bc6/
reports/evidence/EXECUTOR/REGRESSION_BUS03.md
reports/evidence/EXECUTOR/REGRESSION_COCKPIT06.md
reports/evidence/EXECUTOR/REGRESSION_LANE01.md
reports/evidence/EXECUTOR/REGRESSION_LANE02.md
reports/evidence/EXECUTOR/REGRESSION_LANE03.md
```

---

## 8. VERDICT

**MERGE: COMPLETE — GREEN**

The merge-staging branch `claude/merge-staging-wow-data-organ-3ymaK` is ready.
All critical gates PASS. `verify:public:data:readiness` is NEEDS_DATA (expected, not a regression).

Phase 1 complete. Branch is ready for Phase 2 fixes (Perplexity delta + mine sweep).

---

## 9. ONE_NEXT_ACTION

```bash
npm run -s verify:fast
```
