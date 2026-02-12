# EDGE Anti-Patterns Hit List

## Operator Summary
- This is a fail-fast checklist, not a suggestion list.
- Each anti-pattern includes symptom, impact, detection test, mitigation.
- Any detected item must map to a blocking or warning gate state.
- Focus areas: leakage, determinism, realism, risk, governance, evidence integrity.
- Use this list during design review and gate implementation.
- If an item has no detection test, spec is incomplete.
- If an item has no mitigation owner, operations are unsafe.
- Do not waive anti-patterns without written risk acceptance.
- Shadow safety and no-live-default are mandatory.
- Evidence theater is treated as a critical operational defect.

## Where to look next
- Formal gates: `specs/epochs/EPOCH-31.md` ... `EPOCH-40.md`.
- Architecture invariants: `docs/SDD_EDGE_EPOCHS_31_40.md`.

1) **Look-ahead leakage**
- Symptom: feature at time `t` changes when future rows are modified.
- Deadly because: fake alpha, guaranteed live decay.
- Detection: E31 future-mutation sentinel fixture.
- Mitigation: strict `ts<=t` joins and PiT snapshot manifesting.

2) **Survivorship bias**
- Symptom: dead/delisted symbols absent from training sets.
- Deadly because: optimistic performance illusion.
- Detection: dataset completeness audit versus historical universe manifest.
- Mitigation: symbol-universe snapshots by date.

3) **Normalization leakage**
- Symptom: scaler fit stats computed over train+test.
- Deadly because: data snooping in preprocessing.
- Detection: split-aware stat-hash check.
- Mitigation: train-only fit, persisted transform artifacts.

4) **Unstable feature ordering**
- Symptom: same values, different vector ordering, hash drift.
- Deadly because: non-reproducible model and signals.
- Detection: shuffled-input replay should preserve fingerprint.
- Mitigation: `feature_vector_order` contract.

5) **Fantasy fills**
- Symptom: midpoint fills with zero spread/fees under realistic conditions.
- Deadly because: inflated backtest PnL.
- Detection: E32 realism fixture with non-zero spread expected slippage.
- Mitigation: enforce spread+fee+latency minimum model.

6) **Ignoring partial fills**
- Symptom: all orders fill 100% regardless of liquidity.
- Deadly because: false capacity assumptions.
- Detection: illiquid-book fixture requiring partial fill outcome.
- Mitigation: liquidity-bucket partial-fill assumptions.

7) **Latency blindness**
- Symptom: execution ignores queue/latency effects.
- Deadly because: stale intents and adverse selection.
- Detection: latency perturbation test must shift fill quality.
- Mitigation: latency model and SLA drift alarms.

8) **Backtest/live path mismatch**
- Symptom: different code paths for signal or risk logic.
- Deadly because: unverifiable behavior in production.
- Detection: path parity check on canonical fixtures.
- Mitigation: shared contracts and replay parity gates.

9) **Unversioned strategies**
- Symptom: strategy behavior changes without semver bump.
- Deadly because: impossible auditability.
- Detection: registry diff gate on StrategyManifest.
- Mitigation: immutable semver manifests.

10) **Silent breaking changes**
- Symptom: incompatible params/data schema with minor/patch bump.
- Deadly because: runtime misconfiguration.
- Detection: compatibility checker across adjacent versions.
- Mitigation: enforce MAJOR bump policy.

11) **Nondeterministic signal→intent transform**
- Symptom: same inputs produce different intents.
- Deadly because: irreproducible risk posture.
- Detection: deterministic replay diff on intent payload.
- Mitigation: pure function and stable sort/order.

12) **Unbounded Kelly sizing**
- Symptom: leverage spikes from unconstrained fraction.
- Deadly because: blow-up risk.
- Detection: leverage cap invariant tests.
- Mitigation: bounded fractional Kelly with hard caps.

13) **Risk FSM bypass**
- Symptom: system exits HALTED without cooldown and signoff.
- Deadly because: governance collapse.
- Detection: non-bypass transition assertion.
- Mitigation: HALTED exit guard requiring replay + ack.

14) **Gap drift ignored**
- Symptom: large sim-shadow drift without brake escalation.
- Deadly because: regime mismatch not contained.
- Detection: synthetic drift scenario should trigger brake action.
- Mitigation: GapScore thresholds and auto-brake policy.

15) **Shadow places real orders**
- Symptom: order adapter emits live submissions in shadow mode.
- Deadly because: uncontrolled market exposure.
- Detection: assert `orders_submitted==0` and adapter state DISABLED.
- Mitigation: compile-time disable + runtime hard assert.

16) **Canary phase skipping**
- Symptom: direct jump to high allocation percentage.
- Deadly because: untested exposure scaling.
- Detection: phase progression gate with sequence constraints.
- Mitigation: enforce 5→15→35→70→100 progression.

17) **Hidden network dependency**
- Symptom: default gates require internet unexpectedly.
- Deadly because: non-reproducible offline verification.
- Detection: offline CI run with network denied.
- Mitigation: explicit `ENABLE_NETWORK_TESTS=1` guard.

18) **Dependency drift during run**
- Symptom: unpinned package resolution changes behavior.
- Deadly because: irreproducible output fingerprints.
- Detection: lock-hash mismatch gate.
- Mitigation: pinned lockfiles and environment manifests.

19) **Evidence theater**
- Symptom: PASS claim without logs/manifests/verdict.
- Deadly because: false governance confidence.
- Detection: evidence completeness linter.
- Mitigation: block status transitions without evidence set.

20) **Clean-clone irreproducibility**
- Symptom: certification cannot be replayed on fresh clone.
- Deadly because: release cannot be trusted.
- Detection: E40 clean-clone replay gate.
- Mitigation: immutable evidence hashes and reproducible scripts.
