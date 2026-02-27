# P1_STABILIZATION.md

STATUS: PASS
REASON_CODE: NONE

## Gates
- RG_ACQ01 (`verify:regression:acq-unlock-contract`): PASS
- RG_ACQ02 (`verify:regression:acq-network-unreachable-classification`): PASS
- RG_DATA04 (`verify:regression:liq-fixture-offline-x2`): PASS
- readiness (`verify:public:data:readiness`): PASS

## Assertions
- Acquire now classifies network-unreachable as EC=2 + `ACQ_NET01` (NEEDS_NETWORK), not EC=1.
- Double-key unlock enforced: `--enable-network` + allow-file.
- Offline fixture replay is deterministic x2 and net-kill authoritative.
