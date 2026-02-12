# EDGE Anti-Patterns Matrix (Operational)

| Anti-pattern | Detection (detector/test) | Mitigation | Proof (gate/evidence) |
|---|---|---|---|
| Look-ahead leakage | Leakage sentinel with future-shifted negative control | Enforce point-in-time join + split hash locks | `verify:epoch31` and `verify:epoch37` logs + sentinel report |
| Evidence theater (claims without logs) | Missing required files in evidence checklist | Block PASS if any required artifact absent | `VERDICT.md` references file list + `SHA256SUMS.txt` |
| Non-deterministic replay | Two-run digest mismatch under same seed | Canonical serialization + pinned seed + stable ordering | `verify_specs_run1.log`, `verify_specs_run2.log`, replay diff |
| Hidden network dependency | Gate fails when network disabled | Wrap optional network checks behind `ENABLE_NETWORK_TESTS=1` | offline gate log shows PASS with network disabled |
| Silent schema drift | Contract validation failure on required fields | Schema version bump + migration notes | contract validation report under epoch evidence |
| Kill-switch bypass language | Fuzzy stop rules without BLOCKED action | Add explicit BLOCKED and rollback triggers | epoch Stop Rules section + gate FAIL condition |
| Overfit acceptance | High in-sample score without CPCV/DSR | Require CPCV, PBO, DSR thresholds | `verify:epoch37` overfit court report |
| Shadow trading by mistake | Non-zero orders in shadow mode | hard `orders_submitted=0` assertion | `verify:epoch39` shadow ledger |
| Hash drift from path variance | Different hashes for same logical files | Path normalization + LF normalization | hash manifest reproducibility report |
| Optional risk controls | Missing brake action despite gap breach | deterministic action matrix by band | `verify:epoch38` gap-to-action report |
