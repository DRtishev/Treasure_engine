# E109 PERF NOTES

## Performance Characteristics
- Capsule build: O(n) normalization + O(n) chunking
- Harvest: O(strategies * folds * grid_size * n) — bounded grid
- Micro-live pilot: O(n) single pass through bars
- Exchange adapter: O(1) per operation (fixture), O(1) + network (live)

## No Regression Risk
E109 adds new modules only (core/live/, scripts/live/, scripts/data/e109_*).
Existing verify chains (E97-E108) are not modified.

## Architecture
- Reality capsules: deterministic NDJSON chunks with stable sha256 per chunk
- Exchange interface: one protocol for fixture/testnet/mainnet
- Fixture exchange: deterministic fills with slippage + fees model
- Live adapter: hard-gated behind ENABLE_NET=1 + CI=false
- Candidate harvest: backtest + WFO + court scoreboard with minimum reality thresholds
