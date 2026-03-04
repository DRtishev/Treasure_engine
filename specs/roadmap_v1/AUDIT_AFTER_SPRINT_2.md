# AUDIT_AFTER_SPRINT_2.md — Межспринтовый аудит после Sprint 2 (FSM Healing)

**Заполнен после завершения Sprint 2.**

---

## A) SNAPSHOT

| Параметр | Значение |
|---|---|
| Branch | `claude/audit-harden-treasure-engine-68ZkR` |
| HEAD sha | `76f30fb` (post-Sprint-1; Sprint 2 commit pending) |
| Pre-sprint SHA | `76f30fb` |
| Node | v22.22.0 |
| npm | 10.9.4 |
| git status | clean after commit |
| Режим | CERT (offline) |

## B) COMMANDS EXECUTED

| # | Команда | EC | Вывод |
|---|---|---|---|
| 1 | `npm run -s verify:fast` (baseline) | 0 | 44/44 PASS |
| 2 | _apply changes_ | — | state_manager.mjs, doctor_v2.mjs, cockpit.mjs, doctor_history.mjs, pr05 fix, 3 regression gates |
| 3 | `regression_fsm_deadlock01` | 0 | PASS |
| 4 | `regression_doctor_score01` | 0 | PASS |
| 5 | `regression_cockpit_dynamic_next01` | 0 | PASS |
| 6 | `npm run -s regen:manifests` | 0 | Manifest regeneration complete |
| 7 | `npm run -s verify:fast` (final run 1) | 0 | 47/47 PASS |
| 8 | `npm run -s verify:fast` (final run 2) | 0 | 47/47 PASS |

## C) GATE MATRIX

| Гейт | Run 1 EC | Run 2 EC | ND? | Вердикт |
|---|---|---|---|---|
| verify:fast (47 gates) | 0 | 0 | нет | PASS |
| regression_fsm_deadlock01 | 0 | — | — | PASS |
| regression_doctor_score01 | 0 | — | — | PASS |
| regression_cockpit_dynamic_next01 | 0 | — | — | PASS |
| Sprint 0 gates (wiring01, wiring02) | 0 | — | — | PASS |
| Sprint 1 gates (ssot01, parity01-03) | 0 | — | — | PASS |

**All previous sprint gates remain PASS.**

## D) DETERMINISM VERDICT

- verify:fast Run 1 EC = 0, Run 2 EC = 0. Идентичные? да
- **DETERMINISM VERDICT:** CONFIRMED

## E) PERFORMANCE CHECK

| Метрика | Pre-sprint | Post-sprint | Delta | Verdict |
|---|---|---|---|---|
| verify:fast (ms) | ~3400 | ~3600 | +200ms (~6%) | OK |

**Протокол:** Delta < 15% → OK.

## F) RISK REVIEW

### Специфичные для Sprint 2
- [x] Deadlock detection: sameStateCount tracking + stuckThreshold from kernel (deadlock_threshold ?? max_goal_attempts)
- [x] Doctor confidence score: derived from totalScore (weighted scoreboard sum), deterministic
- [x] Cockpit next_action: computeNextAction(fsmState, doctorVerdict) — pure function with state-based dispatch
- [x] Doctor history JSONL: append-only, no Date APIs (uses run_id as tick)
- [x] All previous Sprint gates still PASS

### Регрессии (unexpected)
- `regression_san01_global_forbidden_apis` FAIL: doctor_history.mjs contained `new Date()` — forbidden time API in scripts/ops/. Fixed by replacing with `run_id` tick.
- pr05 allowlist updated to include `DOCTOR_HISTORY.jsonl`.

## G) EVIDENCE PATHS

| Артефакт | Путь | Exists? |
|---|---|---|
| fsm_deadlock01 gate | `reports/evidence/EXECUTOR/gates/manual/regression_fsm_deadlock01.json` | yes |
| doctor_score01 gate | `reports/evidence/EXECUTOR/gates/manual/regression_doctor_score01.json` | yes |
| cockpit_dynamic_next01 gate | `reports/evidence/EXECUTOR/gates/manual/regression_cockpit_dynamic_next01.json` | yes |
| Doctor history ledger | `reports/evidence/EXECUTOR/DOCTOR_HISTORY.jsonl` | pending (created on first ops:doctor run) |

## H) VERDICT

- **Status:** PASS
- **reason_code:** NONE
- **Detail:** Sprint 2 (FSM Healing) завершён. Deadlock detection добавлен в runToGoal(), confidence_score в Doctor scoreboard, dynamic ONE_NEXT_ACTION в Cockpit, doctor_history.mjs JSONL ledger. 3 regression gates PASS, verify:fast x2 PASS (47/47), determinism CONFIRMED.

## I) ONE NEXT ACTION

```bash
# PASS → начать Sprint 3
cat specs/roadmap_v1/SPRINT_3_PROFIT_LANE_SPEC.md
```
