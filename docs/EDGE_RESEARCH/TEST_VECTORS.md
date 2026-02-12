# EDGE Test Vectors (Spec-Only Fixtures)

Format rule for fingerprint expectations:
- `expected_fingerprint = sha256(canonical_json(<declared_material>))`
- Same input set + seed must reproduce identical fingerprint.

## E31
- Must-pass: future rows unchanged => feature at `t` unchanged.
- Must-fail: mutate future row (`ts>t`) and feature at `t` changes.

## E32
- Must-pass: non-zero spread fixture yields non-zero effective slippage.
- Must-fail: simulator returns zero slippage under non-zero spread and latency.

## E33
- Must-pass: backward-compatible param update increments MINOR.
- Must-fail: breaking param/schema change with non-MAJOR bump.

## E34
- Must-pass: identical signal+context yields byte-identical Intent payload.
- Must-fail: stale signal violating freshness threshold still emitted as executable intent.

## E35
- Must-pass: allocation respects leverage/concentration caps and HALTED blocking.
- Must-fail: unconstrained sizing exceeds cap without rejection.

## E36
- Must-pass: severe trigger escalates FSM per transition policy.
- Must-fail: HALTED mode bypassed without cooldown+ack+replay pass.

## E37
- Must-pass: clean dataset passes leakage battery.
- Must-fail: injected label leakage not detected.

## E38
- Must-pass: elevated gap_score triggers WARNING/REDUCE/FULL_STOP per thresholds.
- Must-fail: FULL_STOP condition occurs but risk mode does not escalate to HALTED.

## E39
- Must-pass: shadow run emits intents with `orders_submitted=0`.
- Must-fail: any non-zero order submission or enabled order adapter in shadow.

## E40
- Must-pass: clean-clone replay reproduces certification fingerprint.
- Must-fail: certification produced with missing epoch gate evidence or hash mismatch.
