# EPOCH-54 — Live Shadow Record (Public Market Record/Replay at Scale)

## REALITY SNAPSHOT
- Existing recorder supports basic record/replay but lacks stronger chunk invariants and dedup strictness semantics.
- E54 focuses on data-plane robustness only (no trading).
- Evidence root: `reports/evidence/EPOCH-54/`.

## GOALS
- Prove replay fingerprint invariance across chunk boundaries.
- Enforce explicit dedup policy with strict-mode fail when IDs absent.
- Upgrade recorder manifests with reconnect/gap/dedup/out-of-order counts.

## NON-GOALS
- No trade execution or order submission.
- Network path is optional and not required for CI PASS.
- No provider expansion beyond current fixtures.

## CONSTRAINTS
- Offline fixtures must be sufficient for gate PASS.
- Heuristic dedup usage must be machine-flagged.
- Strict mode must fail when heuristic dedup would be required.

## DESIGN / CONTRACTS
- Dedup contract in `core/edge/public_trade_dedup.mjs`.
- Recorder upgrades in `scripts/data/record_live_public.mjs`.
- Gate output in `scripts/verify/epoch54_live_shadow_record.mjs`.

## PATCH PLAN
- [ ] Implement strict/heuristic dedup policy module.
- [ ] Upgrade recorder chunking + manifest counters.
- [ ] Add rechunk invariant checks in `verify:epoch54`.
- [ ] Add machine outputs and pass gate x2.

## VERIFY
- `npm run verify:epoch54`
- `npm run verify:specs`
- `npm run verify:repo`
- `npm run verify:edge`
- `npm run verify:ledger`
- `npm run verify:release`

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-54/PREFLIGHT.log`
- `reports/evidence/EPOCH-54/COMMANDS.log`
- `reports/evidence/EPOCH-54/SNAPSHOT.md`
- `reports/evidence/EPOCH-54/SUMMARY.md`
- `reports/evidence/EPOCH-54/VERDICT.md`
- `reports/evidence/EPOCH-54/SHA256SUMS.EVIDENCE`
- `reports/evidence/EPOCH-54/pack_index.json`

## STOP RULES
- BLOCKED if rechunk fingerprints diverge.
- BLOCKED if strict dedup expected-fail does not fail.
- BLOCKED if required machine outputs are missing.

## RISK REGISTER
- Fixture-based checks may not expose all network jitter regimes.
- Heuristic dedup key design may need extension for new providers.
- Reconnect behavior validation remains optional outside ENABLE_NETWORK flows.

## ACCEPTANCE CRITERIA
- [ ] Rechunk replay fingerprint invariant passes.
- [ ] Strict dedup works when IDs exist.
- [ ] Heuristic dedup is flagged when IDs are absent.
- [ ] Strict mode expected-fail triggers when heuristic would be used.
- [ ] E54 evidence pack validates via packager.

## NOTES
Network smoke runs are optional and gated by `ENABLE_NETWORK=1`.
