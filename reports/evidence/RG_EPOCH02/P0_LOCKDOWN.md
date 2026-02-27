# P0_LOCKDOWN.md

STATUS: BLOCKED
REASON_CODE: NT01,NET_PROBE01

## Gates
- RG_BYTE01 (`verify:repo:byte-audit:x2`): PASS
- RG_NODE01 (`verify:regression:node-truth-enforcement`): BLOCKED NT01 (runtime node family mismatch vs NODE_TRUTH.md)
- RG_NET02 (`verify:regression:netkill-ledger-enforcement`): PASS
- RG_FOR01 (`verify:regression:execution-forensics-netkill-probe`): FAIL NET_PROBE01 (`net_kill_runtime_probe_result: MISSING` in authoritative classification)

## Deterministic evidence
- `reports/evidence/EXECUTOR/REPO_BYTE_AUDIT.md`
- `reports/evidence/EXECUTOR/REGRESSION_NODE_TRUTH_ENFORCEMENT.md`
- `reports/evidence/EXECUTOR/REGRESSION_NETKILL_LEDGER_ENFORCEMENT.md`
- `reports/evidence/EXECUTOR/REGRESSION_EXECUTION_FORENSICS_NETKILL_PROBE.md`

## Next action
- `npm run -s epoch:victory:triage`
