# EDGE Glossary (Canonical)

This glossary is the single term source for EDGE E31..E40 specs.

| Term | Definition | Micro JSON example | Used in |
|---|---|---|---|
| FeatureFrame | Point-in-time feature row bound to event time and source manifest. | `{"symbol":"BTCUSDT","ts_event":"2026-01-01T00:00:00Z","features":{"ret_1":0.001}}` | E31, E34 |
| Signal | Strategy hypothesis with confidence and reasons. | `{"signal_id":"sig-1","side_hint":"BUY","confidence":0.71}` | E34 |
| Intent | Executable but still constrained order intent from signal. | `{"intent_id":"int-1","side":"BUY","max_slippage_bps":5}` | E34, E39 |
| Order | Exchange-facing object; forbidden in default shadow mode. | `{"order_id":"ord-1","type":"LIMIT","qty":"0.10000000"}` | E39 |
| Fill | Execution result from sim/shadow/live-like adapter. | `{"fill_id":"fill-1","price":"42000.12000000","qty":"0.05000000"}` | E32, E38 |
| RiskState | Runtime safety FSM snapshot and active triggers. | `{"mode":"BRAKE","active_triggers":["gap_high"]}` | E36, E38 |
| GapScore | Scalar drift indicator between simulation and shadow outcomes. | `{"gap_score":0.42,"band":"warning"}` | E38 |
| Fingerprint | SHA-256 digest from canonical payload and declared scope. | `{"algo":"sha256","value":"<hex>"}` | E31..E40 |
| Evidence Pack | Run-scoped proof set for gate outcomes and verdict. | `{"evidence_epoch":"EPOCH-EDGE-SPECS-31-40-IRONCLAD-1"}` | all epochs |
| RunDir | Deterministic output directory for one gate run. | `{"run_dir":"reports/runs/epoch31/12345/default/001"}` | all epochs |
| Seed | Explicit deterministic seed for all stochastic logic. | `{"seed":12345}` | all epochs |
| Manifest | Immutable index with hashes and schema versions. | `{"manifest_sha256":"<hex>","schema_version":"1.0.0"}` | E31, E40 |
| Kill-switch | Hard stop control that blocks order routing immediately. | `{"kill_switch":"manual_hard_stop","state":"ON"}` | E36, E39 |
| Leakage Sentinel | Detector for look-ahead, target bleed, and split contamination. | `{"sentinel":"leakage_v2","status":"PASS"}` | E31, E37 |
| WFO | Walk-forward optimization with strict train/validation chronology. | `{"window_id":"w01","train_end":"2025-06-01"}` | E37 |
| CPCV | Combinatorial purged cross-validation for overfit detection. | `{"splits":8,"purge_bars":48,"embargo_bars":24}` | E37 |
| Shadow-Live | No-order production mirror emitting intents and risk decisions only. | `{"mode":"shadow","orders_submitted":0}` | E39 |
| Canary | Staged allocation release process with rollback gates. | `{"phase":"15pct","rollback":false}` | E39 |
| Freeze | Release lock with immutable digest set and re-run proof. | `{"freeze_id":"edge-freeze-r1","status":"LOCKED"}` | E40 |
