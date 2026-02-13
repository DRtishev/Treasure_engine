# Canary Policy (E52)

## Modes
- `SHADOW`: observe and evaluate only; no submission plan written.
- `PAPER`: run E51 paper harness metrics; still no submission plan.
- `GUARDED_LIVE`: write hypothetical `submission_plan.json` with `submitted=false` and `submitted_actions=0`.

## Gating thresholds
- Reality gap monitor: pause when `reality_gap > max_reality_gap`.
- Risk monitor: enforce E44 hard-stop policy; pause when hard-stop event count exceeds `max_risk_events`.
- Exposure cap: `max_exposure_usd` controls max notional in hypothetical intent planning.

## Auto-pause conditions
- Crisis mode injected (deterministic fixture) with kill-switch enabled.
- Reality gap threshold breach.
- Risk limit breach.

## Kill-switch
- Always enabled by default.
- Any pause condition sets state to paused and forbids submit behavior.

## Safety invariants
- No network access unless `ENABLE_NETWORK=1`.
- No real submit path: `submitted` is always `false`.
- Deterministic clocks only; no wall-clock dependency.


## Pause-recover protocol (E56)
- Any pause reason code enters `RECOVERY` state immediately.
- Recovery enforces deterministic cooldown (`cooldown_bars=2`, `cooldown_ms=2000` in fixture flow).
- Recovery ladder is fixed: `RECOVERY -> COOLDOWN -> SHADOW -> PAPER -> PRIOR_MODE`.
- If E44 hard stop exists, prior mode transition is logged as blocked (`exposure_blocked=true`) and exposure stays fused off.
- Recovery is shadow/paper only and never submits actions.
