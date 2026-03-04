# SDD-000: Treasure Engine Master Roadmap

> Software Design Document | Version 1.0.0
> Date: 2026-03-03 | Classification: INTERNAL
> Author: AI Architect (CERT mode) | Approver: DRtishev

---

## 1. Executive Summary

Treasure Engine is a deterministic, fail-closed algorithmic trading system built as a biological organism metaphor. The system operates in offline-first CERT mode with multi-layered verification gates, a dual-FSM nervous system (organism + candidate lifecycle), and a proof-of-work evidence protocol.

This roadmap defines 4 sprints from **reanimation** (current BLOCKED state) through **first dollar** (micro-live trading). Each sprint has its own SDD specification with detailed technical design, acceptance criteria, and regression gates.

### Current System State (Evidence-Driven)

| Subsystem | Status | Blocker |
|-----------|--------|---------|
| verify:fast | **PASS x2** | Resolved (toolchain bootstrapped, PR05/REASON01 fixed) |
| ops:life | **CRASH** EC=1 | MINE-01: `budget_ms` matches forbidden timestamp pattern |
| ops:doctor | **FAIL** EC=1 | Depends on ops:life (BOOT_FAIL) |
| ops:cockpit | PASS EC=0 | FSM=CERTIFYING, readiness=NEEDS_DATA |
| ops:timemachine | PASS EC=0 | -- |
| ops:autopilot | PASS EC=0 | DRY_RUN mode |
| Regression gates | 37/37 PASS | -- |

### Architecture Overview

```
                        TREASURE ENGINE ORGANISM
    +----------------------------------------------------------+
    |                                                          |
    |   NERVOUS SYSTEM (FSM Kernel)                           |
    |   7 states x 7 transitions + circuit breakers           |
    |   BOOT -> CERTIFYING -> CERTIFIED -> EDGE_READY         |
    |                                                          |
    |   ORGANS                                                 |
    |   +----------+  +--------+  +----------+  +---------+  |
    |   | Backtest |  | Doctor |  | EventBus |  | Cockpit |  |
    |   | Engine   |  | OS v3  |  | v1       |  | HUD     |  |
    |   +----------+  +--------+  +----------+  +---------+  |
    |   +----------+  +--------+  +----------+  +---------+  |
    |   | Data     |  | Risk   |  | Strategy |  | Edge    |  |
    |   | Organ    |  |Fortress|  | Sweep    |  | Lab     |  |
    |   +----------+  +--------+  +----------+  +---------+  |
    |                                                          |
    |   IMMUNE SYSTEM                                          |
    |   Doctor probes + Chaos gates + Reflex registry          |
    |   + Adaptive memory + Escalation triggers                |
    |                                                          |
    |   FLEET INTELLIGENCE (MetaAgent)                         |
    |   Candidate FSM (8 states) + GraduationCourt (5 exams)  |
    |   Fleet policy: max_active=10, risk_budget=1.0           |
    |                                                          |
    |   VERIFICATION LAYER                                     |
    |   37+ regression gates | x2 determinism | evidence SSOT |
    +----------------------------------------------------------+
```

---

## 2. Sprint Architecture

### Sprint Dependency Graph

```
Sprint 0: REANIMATION
    |
    | DoD: verify:fast x2 PASS + ops:life EC=0 + ops:doctor EC=0
    |
    v
Sprint 1: ORGANISM ALIVE
    |
    | DoD: SAN01 core scope + courts wired + determinism strict
    |
    v
Sprint 2: BACKTEST + DATA
    |
    | DoD: market impact model + 2+ data feeds + paper setup
    |
    v
Sprint 3: PROFIT LANE
    |
    | DoD: acquire -> lock -> replay -> paper -> micro-live
    |
    v
    [FIRST $]
```

### Sprint Index

| Sprint | SDD | Title | Duration | Gate Count | Risk |
|--------|-----|-------|----------|------------|------|
| 0 | [SDD-001](SDD_SPRINT_0_REANIMATION.md) | Reanimation | 1-2 days | 3 new gates | Low |
| 1 | [SDD-002](SDD_SPRINT_1_ORGANISM_ALIVE.md) | Organism Alive | 3-7 days | 5 new gates | Medium |
| 2 | [SDD-003](SDD_SPRINT_2_BACKTEST_DATA.md) | Backtest + Data | 1-3 weeks | 4 new gates | Medium-High |
| 3 | [SDD-004](SDD_SPRINT_3_PROFIT_LANE.md) | Profit Lane | 1-2 months | 6 new gates | High |

---

## 3. Critical MINES Registry

### P0 (System Down)

| ID | Mine | Location | Sprint | Impact |
|----|------|----------|--------|--------|
| MINE-01 | `budget_ms` matches `EVT_SCHEMA_ERROR` forbidden timestamp pattern | state_manager.mjs:460 | 0 | ops:life CRASH |
| MINE-02 | Vendored node toolchain missing | artifacts/toolchains/ | 0 | verify:fast BLOCKED |
| MINE-03 | ops:doctor depends on ops:life | doctor_v2.mjs | 0 | BOOT_FAIL cascade |

### P1 (Correctness Risk)

| ID | Mine | Location | Sprint | Impact |
|----|------|----------|--------|--------|
| MINE-04 | core/ not scanned for determinism (SAN01) | core/**/*.mjs | 1 | 439 Date.now() calls unaudited |
| MINE-05 | DeterministicClock defaults to Date.now() | core/sys/clock.mjs:12 | 1 | Silent nondeterminism |
| MINE-06 | Backtest determinism x2 dead (ajv import chain) | core/edge/ | 1 | Cannot prove reproducibility |
| MINE-09 | Edge Lab courts not wired in sweep | strategy_sweep | 1 | Unvalidated candidates |

### P2 (Technical Debt)

| ID | Mine | Location | Sprint | Impact |
|----|------|----------|--------|--------|
| MINE-07 | ajv ReDoS vulnerability | node_modules/ajv | 0 | CVE-2024-GHSA |
| MINE-08 | Regression net-toolchain01 FAIL with EC=0 | regression script | 0 | Gate integrity |
| MINE-10 | Placeholder SHA256 hashes | EDGE_PROFIT_00/ | 0 | Evidence fabrication risk |
| MINE-11 | 4 profit candidates NEEDS_DATA | profit ledger | 2 | Pipeline stalled |
| MINE-12 | Fill probe runner stub | execution/ | 2 | No fill verification |
| MINE-13 | Profit ledger stale (Nov 2023) | profit/ | 2 | Outdated metrics |

### P3 (Improvement)

| ID | Mine | Location | Sprint | Impact |
|----|------|----------|--------|--------|
| MINE-14 | Fee multiplier 1.667x < 2.0x | edge_lab | 3 | Overly optimistic costs |
| MINE-15 | mode_fsm.mjs 3x Date.now() | mode_fsm.mjs | 1 | Minor nondeterminism |

---

## 4. Upgrade Backlog (ROI-Ranked)

### Tier 1: Immediate (ROI > 5.0)

| # | Upgrade | Impact | Effort | Risk | ROI | Sprint |
|---|---------|--------|--------|------|-----|--------|
| U-01 | Fix budget_ms -> budget_millis | 10 | 1 | 1 | 10.0 | 0 |
| U-02 | Fix regression EC anomaly | 7 | 1 | 1 | 7.0 | 0 |
| U-03 | Fix DeterministicClock default | 8 | 1 | 2 | 4.0 | 1 |
| U-04 | Remove placeholder hashes | 6 | 1 | 1 | 6.0 | 0 |
| U-05 | npm audit fix (ajv) | 5 | 1 | 1 | 5.0 | 0 |

### Tier 2: Critical Infrastructure (ROI 2.0-5.0)

| # | Upgrade | Impact | Effort | Risk | ROI | Sprint |
|---|---------|--------|--------|------|-----|--------|
| U-06 | Bootstrap vendored toolchain | 10 | 2 | 2 | 2.5 | 0 |
| U-07 | Backtest determinism x2 | 9 | 2 | 2 | 2.25 | 1 |
| U-08 | Extend SAN01 to core/ | 9 | 3 | 3 | 1.0 | 1 |
| U-09 | Wire Edge Lab courts | 8 | 4 | 3 | 0.67 | 1 |
| U-10 | mode_fsm.mjs inject clock | 5 | 2 | 1 | 2.5 | 1 |

### Tier 3: Profit Advancement

| # | Upgrade | Impact | Effort | Risk | ROI | Sprint |
|---|---------|--------|--------|------|-----|--------|
| U-11 | Data: funding rates | 8 | 3 | 2 | 1.3 | 2 |
| U-12 | Data: open interest | 7 | 3 | 2 | 1.2 | 2 |
| U-13 | Square-root market impact | 9 | 3 | 3 | 1.0 | 2 |
| U-14 | Fill probe implementation | 7 | 4 | 3 | 0.6 | 2 |
| U-15 | Profit ledger refresh | 6 | 2 | 1 | 3.0 | 2 |
| U-16 | Paper trading harness | 8 | 4 | 3 | 0.7 | 2-3 |

### Tier 4: Operational Excellence

| # | Upgrade | Sprint |
|---|---------|--------|
| U-17 | Parallel gate execution | 3+ |
| U-18 | Evidence pruning automation | 3+ |
| U-19 | CI/CD pipeline | 3+ |
| U-20 | Cockpit visualization | 3+ |
| U-21 | Canary deployment framework | 3 |
| U-22 | Orphan detection (SANM01) | 1 |
| U-23 | Event schema allowlist | 1 |
| U-24 | Clock fallback elimination (12x) | 1 |
| U-25 | perf_engine randomness audit | 1 |

### Tier 5: Strategic

| # | Upgrade | Sprint |
|---|---------|--------|
| U-26 | Multi-exchange normalization | 3+ |
| U-27 | Walk-forward optimization | 3+ |
| U-28 | Monte Carlo CI | 3+ |
| U-29 | Regime-aware sizing | 3+ |
| U-30 | Real-time monitoring | 3+ |
| U-31 | Execution analytics | 3+ |
| U-32 | Strategy rotation FSM | 3+ |
| U-33 | Distributed data storage | 3+ |
| U-34 | Auto-documentation | 3+ |
| U-35 | Operator alerting | 3+ |

---

## 5. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js (vendored) | 22.22.0 | Deterministic execution |
| Package Manager | npm | 10.9.4 | Dependency management |
| Prod Dependencies | undici, ws | latest | HTTP client, WebSocket |
| Dev Dependencies | ajv | 8.x | JSON schema validation |
| Optional | better-sqlite3 | latest | Local persistence |
| Total Packages | 45 transitive | -- | Minimal footprint |

### Code Metrics

| Metric | Value |
|--------|-------|
| Total files | ~6,918 |
| .mjs modules | 1,418 |
| npm scripts | 1,002 |
| Closed epochs | 65+ |
| Regression gates | 37+ |
| Lines of code (estimate) | ~200,000 |

---

## 6. Governance & Quality

### SSOT Hierarchy

```
AGENTS.md                          <- Rules R1-R14 (supreme authority)
  |
  +-- CLAUDE.md                    <- AI exec summary
  +-- specs/fsm_kernel.json        <- Organism FSM
  +-- specs/candidate_fsm_kernel.json <- Candidate FSM
  +-- specs/policy_kernel.json     <- Mode/zone policy
  +-- specs/doctor_manifest.json   <- Health probes
  +-- specs/fleet_policy.json      <- MetaAgent config
  +-- specs/data_lanes.json        <- Data lane registry
  +-- specs/reason_code_taxonomy.json <- 256+ reason codes
  +-- specs/epochs/LEDGER.json     <- Epoch registry (65 closed)
  +-- truth/                       <- JSON schemas
```

### Quality Gates

| Gate Category | Count | x2 Required | Fail Mode |
|---------------|-------|-------------|-----------|
| Toolchain | 5 | No | BLOCKED EC=2 |
| Regression | 20+ | No | FAIL EC=1 |
| Policy | 4 | No | FAIL EC=1 |
| Evidence | 3 | No | FAIL EC=1 |
| Determinism | 2 | Yes | FAIL EC=1 |
| Security | 3 | No | FAIL EC=1 |
| **Total** | **37+** | -- | -- |

### Determinism Contract

| Aspect | Mechanism | Status |
|--------|-----------|--------|
| Clock | DeterministicClock + injection | DEGRADED (defaults to Date.now) |
| RNG | DeterministicRNG + seed | ALIVE |
| Network | TREASURE_NET_KILL=1 | ALIVE |
| Timestamps | FP01 forbidden pattern | ALIVE |
| Sorting | Tick-ordered (no mtime) | ALIVE |
| Evidence | SHA256 chain + Merkle | ALIVE |

---

## 7. Risk Register

### Cross-Sprint Risks

| ID | Risk | Probability | Impact | Mitigation | Sprint |
|----|------|-------------|--------|------------|--------|
| R-01 | DeterministicClock silent fallback | High | High | Sprint 1: assert in CERT | 1 |
| R-02 | 439 Date.now() in core/ unaudited | High | High | Sprint 1: SAN01 expansion | 1 |
| R-03 | ajv import chain breaks backtest x2 | Medium | High | Sprint 1: isolate ajv | 1 |
| R-04 | Real expectancy < simulated | Medium | Critical | Sprint 3: paper proving | 3 |
| R-05 | Exchange API rate limiting | Medium | Medium | Sprint 2: adaptive backoff | 2 |
| R-06 | Testnet != mainnet fills | Medium | Medium | Sprint 3: fill probe | 3 |
| R-07 | Evidence bloat (6918 files) | Low | Medium | Pruning automation | 3+ |
| R-08 | Single-exchange dependency | Low | High | Multi-exchange (Tier 5) | 3+ |

---

## 8. Timeline Visualization

```
Week 0         Sprint 0: REANIMATION
               Fix 3 blockers, health button alive
               Gate: verify:fast x2 + ops:life + ops:doctor
               =============>

Week 1-2       Sprint 1: ORGANISM ALIVE
               Determinism strict, SAN01 core, courts wired
               Gate: 5 new regression gates
               ========================>

Week 2-5       Sprint 2: BACKTEST + DATA
               Market impact, 2+ data feeds, paper setup
               Gate: data quorum + impact model x2
               ====================================>

Week 5-12      Sprint 3: PROFIT LANE
               Acquire -> Lock -> Replay -> Paper -> Micro-live
               Gate: governance approval + paper evidence
               |  ACQUIRE    |  LOCK  |     PAPER 30d+      | MICRO |
               ====================================================>
                                                         FIRST $
```

---

## 9. Document Index

| Document | Path | Purpose |
|----------|------|---------|
| This document | artifacts/specs/SDD_MASTER_ROADMAP.md | Master roadmap & architecture |
| Sprint 0 SDD | artifacts/specs/SDD_SPRINT_0_REANIMATION.md | Reanimation specification |
| Sprint 1 SDD | artifacts/specs/SDD_SPRINT_1_ORGANISM_ALIVE.md | Organism alive specification |
| Sprint 2 SDD | artifacts/specs/SDD_SPRINT_2_BACKTEST_DATA.md | Backtest + data specification |
| Sprint 3 SDD | artifacts/specs/SDD_SPRINT_3_PROFIT_LANE.md | Profit lane specification |
| Audit Report | artifacts/audit/TREASURE_ENGINE_AUDIT_REPORT.md | Evidence-driven audit |
| Upgrade Backlog | artifacts/audit/UPGRADE_BACKLOG.md | ROI-ranked upgrades |
| Repo Map | artifacts/audit/REPO_MAP.md | Repository structure |

---

## 10. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Architect | AI (CERT mode) | 2026-03-03 | -- |
| Owner | DRtishev | -- | PENDING |

---

*Generated: 2026-03-03 | Mode: CERT (offline) | Evidence: artifacts/audit/*
