# Epoch Specs Index

## You are here
- Baseline status: EPOCH-BOOT.3 complete
- Next implementation target: EPOCH-17

## Dependency graph
- EPOCH-17 (Safety integration) → foundation for controlled execution
- EPOCH-18 (Strategy orchestration) depends on EPOCH-17 execution safety
- EPOCH-19 (Governance/mode workflow) depends on EPOCH-17 + EPOCH-18 signals/execution
- EPOCH-20 (Monitoring/performance) depends on stable governance + strategy runtime
- EPOCH-21 (Production-readiness checklist) depends on all previous epochs

## Specs
- [EPOCH-17](./EPOCH-17.md)
- [EPOCH-18](./EPOCH-18.md)
- [EPOCH-19](./EPOCH-19.md)
- [EPOCH-20](./EPOCH-20.md)
- [EPOCH-21](./EPOCH-21.md)

Each epoch includes:
- implementation spec (`EPOCH-XX.md`)
- task checklist (`EPOCH-XX_TODO.md`)
- gate plan (`EPOCH-XX_GATES.md`)
- evidence requirements (`EPOCH-XX_EVIDENCE.md`)


## Detailed dependency file
- [EPOCH_DEPENDENCY_GRAPH](./EPOCH_DEPENDENCY_GRAPH.md)
