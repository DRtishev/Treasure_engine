# TREASURE ENGINE — OPERATOR RUNBOOK (MOBILE-FIRST)

## PHASE 0: WHERE AM I?

```bash
npm run -s doctor
```

Read the output. It always has these fields (copy-pasteable check):

| Field | Meaning |
|---|---|
| `MODE` | AUTHORITATIVE_PASS / BLOCKED / STALE |
| `NEXT_ACTION` | The ONE command you must run next |
| `AUTHORITATIVE` | true = full chain verified; false = need to run mega |
| `CAPSULE_PRESENT` | Is the pinned node tarball here? |
| `BOOTSTRAPPED_NODE_PRESENT` | Is the extracted node binary here? |
| `REASON_CODE` | Why you are in this state |

**If AUTHORITATIVE=true**: You are ready. Run NEXT_ACTION.
**If AUTHORITATIVE=false**: Run NEXT_ACTION exactly once.

---

## PHASE 1: COMMON STATES AND ACTIONS

### BLOCKED / CACHE_MISSING
```bash
CI=true npm run -s verify:mega
```

### BLOCKED / CACHE_STALE_FILESYSTEM
The capsule or boot node was deleted since last authoritative run.
```bash
CI=true npm run -s verify:mega
```
If it fails with NEED_NODE_TARBALL, you need the capsule (see Phase 2).

### STALE
Cache is more than 24 hours old.
```bash
CI=true npm run -s verify:mega
```

### BLOCKED / NEED_NODE_TARBALL
You are missing the pinned node capsule. See Phase 2.

---

## PHASE 2: GET THE CAPSULE

Place the pinned node tarball in the correct location:
```
artifacts/incoming/node/<capsule-name>
```
Then:
```bash
CI=true npm run -s verify:mega
```

To download (requires network flags):
```bash
ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1 ONLINE_OPTIONAL=1 CI=true npm run -s verify:mega
```

---

## PHASE 3: EXPORT EVIDENCE (AFTER AUTHORITATIVE PASS)

```bash
npm run -s verify:mega:export
```

---

## PHASE 4: VERIFY CONTRACTS AND SEAL

```bash
npm run -s verify:mega:contracts
npm run -s verify:mega:seal_x2
```

Both must exit 0.

---

## PHASE 5: VERIFY CHECKSUMS

```bash
sha256sum -c reports/evidence/FINAL_MEGA/SHA256SUMS.md
```

All lines must say OK.

---

## EVIDENCE LOCATION

All evidence is in `reports/evidence/FINAL_MEGA/`. Key files:

- `VERDICT.md` — final authoritative/probe verdict
- `CONTRACTS.md` — all contract checks (PASS/FAIL per contract)
- `TRUTH_CACHE.md` — cached authority state (in E142_MEGA/)
- `AUTHORITY_MODEL.md` — the full authority chain explained
- `SHA256SUMS.md` — hashes of all evidence files

---

## WHAT "AUTHORITATIVE" MEANS

All of these must be true simultaneously:
1. Capsule present AND sha256 matches pinned hash
2. Bootstrap node extracted and healthy
3. Bridge (pinned node -v) exits 0
4. Representative gate (e137_run.mjs via pinned node) exits 0

Doctor cross-validates the cached state against live filesystem every read.
If artifacts disappear after an authoritative run: `CACHE_STALE_FILESYSTEM`.

---

## NETWORK MODES

| NET_CLASS | Meaning |
|---|---|
| `OFFLINE` | No proxy, no network flags |
| `PROXY_ONLY` | Proxy detected, net flags not set |
| `ONLINE_LIMITED` | Flags set but WS blocked |
| `ONLINE_OK` | Full network available |

Default: OFFLINE (safe). Network tests require explicit opt-in.
