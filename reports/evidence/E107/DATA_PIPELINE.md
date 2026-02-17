# E107 DATA PIPELINE

## Track 1: Real Data Capsule Pipeline

### Components
- scripts/data/e107_fetch_ohlcv.mjs: Fetch OHLCV from exchange (ENABLE_NET=1 required)
- scripts/data/e107_normalize_to_chunks.mjs: Normalize into chunked JSONL

### Fixture Test
- input: data/fixtures/e107/e107_ohlcv_fixture.json
- rows: 20
- chunks: 1
- output: data/fixtures/e107/normalized/chunks/

### Determinism Proof
- manifest_hash: 4c6822f33940cbebd89b3213b69197aff0e80dbb1d17dd365a1e5f19158d398e
- chunk_count: 1
- chunk_0001.jsonl: rows=20 sha256=d3a112461ff5b95b088c4b7d0a1b52ffc0d6913f829c17321b641ec2169dd88c

### Network Isolation
- e107_fetch_ohlcv.mjs: ENABLE_NET=1 guard (line 7)
- e107_normalize_to_chunks.mjs: No network dependencies
- Verified by e107_no_net_in_tests_contract.mjs

## Verdict
PASS - Data pipeline deterministic, network isolated
