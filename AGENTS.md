# AGENTS.md — Agent OS SSOT

> **Single source of truth** for all AI agent runs on Treasure Engine.
> CLAUDE.md links here; do not duplicate rules.

---

## BOOT SEQUENCE (mandatory)

```
npm run -s verify:fast
```

If blocked: `npm run -s epoch:victory:triage`

---

## CORE RULES

| Rule | Description |
|------|-------------|
| R1 | No PASS/READY/DONE without evidence + commands + EC |
| R2 | Unknown/unstable → BLOCKED/NEEDS_DATA/FAIL (never fabricate) |
| R3 | CERT lanes offline-only; any net → NETV01 |
| R4 | Determinism ×2; nondeterminism only with diff_paths[] |
| R5 | Write-scope CERT: only `artifacts/**` and `reports/evidence/EPOCH-*/**` |
| R5.1 | CERT must not write `reports/evidence/EXECUTOR/**` (AUDIT-only SSOT) |
| R6 | Node SSOT 22.22.0; ladder HOST→DOCKER→VENDORED |
| R7 | No destructive git without DESTRUCTIVE_GUARD |
| R8 | PR hygiene: evidence-bloat forbidden; tracked EPOCH files must be 0 |
| R9 | Every fix ships with regression gate + evidence |
| R10 | Report must match schema; missing ONE_NEXT_ACTION → invalid |
| R11 | Profit must-fail default; live unlock only via explicit file contract |
| R12 | AGENTS.md is the SSOT for AI runs (this file) |
| R13 | No runtime snapshots in EXECUTOR/docs; runtime goes to EPOCH only |
| R14 | Apply actions require double-key unlock (flag + token file) |

---

## MODES

| Mode | Description |
|------|-------------|
| CERT | Offline-only; strict write-scope; close-chain allowed |
| CLOSE | Subset CERT; fast close; no exporters/bulk packs |
| AUDIT | SSOT docs only (EXECUTOR/docs); no runtime snapshots; no CERT scripts |
| RESEARCH | Internet only via double-key; no CERT scripts |
| ACCEL | Speed experiments; never authoritative |

---

## KEY COMMANDS

```bash
# Fast gate (always run first)
npm run -s verify:fast

# Cockpit overview
npm run -s ops:cockpit

# TimeMachine heartbeat ledger
npm run -s ops:timemachine

# Autopilot court (dry-run)
npm run -s ops:autopilot

# Autopilot court (apply - requires double-key unlock)
npm run -s ops:autopilot -- --apply

# Triage if blocked
npm run -s epoch:victory:triage
```

---

## NETWORK DOUBLE-KEY UNLOCK

To enable network in RESEARCH mode, both must be present:
1. Pass flag `--enable-network` to command
2. File `artifacts/incoming/ALLOW_NETWORK` with content: `ALLOW_NETWORK: YES`

---

## APPLY DOUBLE-KEY UNLOCK

To enable destructive/apply actions, both must be present:
1. Pass flag `--apply` to command
2. File `artifacts/incoming/APPLY_AUTOPILOT` with content: `APPLY_AUTOPILOT: YES`

---

## EVIDENCE PROTOCOL

- Every execution cycle -> `reports/evidence/EPOCH-<RUN_ID>/`
- All gate runs write logs under that cycle folder
- Required: machine-readable gate outputs, checksums, summaries, verdict
- PASS/BLOCKED claims must cite concrete evidence file paths

---

## REPORT SCHEMA (required fields)

1. SNAPSHOT
2. WHAT_CHANGED (paths)
3. COMMANDS_EXECUTED (exact + exit codes)
4. GATE_MATRIX (PASS/BLOCKED/FAIL + reason_code + surface)
5. EVIDENCE_PATHS
6. VERDICT (honest)
7. ONE_NEXT_ACTION (single script-only command)

---

## REGRESSION GATES

| Gate ID | npm script |
|---------|-----------|
| RG_AGENT01_AGENTS_PRESENT | `verify:regression:agent01-agents-present` |
| RG_AGENT02_CLAUDE_MD_DRIFT | `verify:regression:agent02-claude-md-drift` |
| RG_TIME01_STABLE_TICK_ORDER | `verify:regression:time01-stable-tick-order` |
| RG_TIME02_NO_TIME_FIELDS | `verify:regression:time02-no-time-fields` |
| RG_AUTO01_MODE_ROUTER | `verify:regression:auto01-mode-router` |
| RG_AUTO02_NO_CERT_IN_RESEARCH | `verify:regression:auto02-no-cert-in-research` |
| RG_AUTO03_PR_CLEANROOM_APPLIED | `verify:regression:auto03-pr-cleanroom-applied` |
| RG_CERT_EXECUTOR_WRITE01 | `verify:regression:cert-executor-write-forbidden` |
| RG_AUDIT_NO_CERT01 | `verify:regression:audit-no-cert` |
| RG_NET_TOOLCHAIN01_NO_NET_IN_VERIFY_FAST | `verify:regression:net-toolchain01-no-net-in-verify-fast` |
| RG_LIQ_LOCK01_NORMALIZED_HASH_MATCH | `verify:regression:liq-lock01-normalized-hash-match` |
| RG_LIQ_SSOT01_SCHEMA_ALIGNMENT | `verify:regression:liq-ssot01-schema-alignment` |
| RG_AGENT03_NO_LEGACY_CONTRADICTIONS | `verify:regression:agent03-no-legacy-contradictions` |
| RG_DATA_EVT01_EVENT_EMISSION | `verify:regression:data-evt01-event-emission` |

---

## STOP RULES

- Stop and publish diagnostic when critical gates fail twice without clear root cause
- Do not claim completion without reproducible logs and validated checksums
- Do not retry the same failing command without diagnosing root cause

---

## SSOT HIERARCHY

```
AGENTS.md          <- this file (primary SSOT for AI)
CLAUDE.md          <- exec summary + link here
docs/AI_RUNBOOK.md <- detailed operational runbook
docs/AI_TEMPLATES/ <- report/evidence templates
```

---

# PURPOSE
This policy defines autonomous closeout behavior for TREASURE ENGINE with Truth Layer enforcement.

# SAFETY & OFFLINE POLICY
- Offline-first by default; network operations require double-key unlock (flag `--enable-network` + file `artifacts/incoming/ALLOW_NETWORK`).
- Never commit secrets, tokens, or live-trading credentials.
- Live trading must remain disabled by default.
- Never commit `node_modules/`; binary archives must be written to `artifacts/incoming/` and kept gitignored.

# EVIDENCE PROTOCOL (legacy)
- Every execution cycle must use `reports/evidence/<EVIDENCE_EPOCH>/`.
- All gate runs must write logs under that cycle folder.
- Required evidence must include machine-readable gate outputs, checksums, summaries, and verdict.
- PASS/BLOCKED claims must cite concrete evidence file paths.

# ANTI-REGRESSION DOCTRINE
- Required gates must run in deterministic, reproducible mode.
- Two-run anti-flake is mandatory where policy requires repeat verification.
- Multi-seed stability checks are required where randomness exists.
- Ledger updates are allowed only after required gates pass in the same evidence cycle.

# AUTONOMOUS EPOCH EXECUTION
- Maintain specs and ledger for all epochs in scope.
- Execute gates in declared order and repair root cause on failure.
- Keep patches minimal and focused on failing invariants.

# OUTPUT STANDARD
- Report exact commands executed, gate outcomes, and evidence locations.
- Publish checksum outputs for source/evidence/export artifacts.
- Record final verdict with PASS or BLOCKED and supporting paths.

# STOP RULES
- Stop and publish a diagnostic when critical gates fail twice without clear root cause.
- Do not claim completion without reproducible logs and validated checksums.
