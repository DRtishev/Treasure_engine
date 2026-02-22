# NODE_TRUTH_GATE.md

STATUS: FAIL
REASON_CODE: NT02
RUN_ID: cad9c4ea3904
NEXT_ACTION: Install Node 22.x to match NODE_TRUTH.md, or update NODE_TRUTH.md via PROPOSE→APPLY→RECEIPT protocol.

## Gate Results

| Field | Value |
|-------|-------|
| status | FAIL |
| reason_code | NT02 |
| running_node | v20.19.6 |
| running_family | 20 |
| allowed_family | 22 |
| node_truth_found | true |

## Message

Node mismatch: running v20.19.6 (family 20) vs NODE_TRUTH.md allowed_family=22. Align the running Node version or update NODE_TRUTH.md via APPLY protocol.

## Evidence Paths

- reports/evidence/INFRA_P0/gates/manual/node_truth_gate.json
- reports/evidence/INFRA_P0/NODE_TRUTH_GATE.md
