# OKX_ORDERBOOK_R2_PROCEDURE.md — R2 Exception Handling Policy

STATUS: PREFLIGHT_READY
VERSION: 1.0.0

This document is the normative reference for OKX WebSocket Orderbook R2 exception handling.
All edge-layer code processing OKX book updates MUST anchor to the sections below.

---

## #no-update

**Anchor:** `docs/OKX_ORDERBOOK_R2_PROCEDURE.md#no-update`

### Sequence-Number No-Update (seq_no_update)

OKX may send a message where the sequence number (`seqId`) equals the previous `seqId`.
This indicates **no change** has occurred to the orderbook since the last update.

**Policy:**

- Detect: `msg.seqId === state.lastSeqId && msg.seqId !== 0`
- Action: **SKIP** — do not apply any update to the local orderbook snapshot.
- Do NOT increment internal update counter.
- Do NOT reset the snapshot.
- Log: `NO_UPDATE seqId=<n>` at DEBUG level only.
- Reason code: `OKX_SEQ_NO_UPDATE`

**Evidence fixture:** `artifacts/fixtures/okx/orderbook/no_update/`

---

## #seq-reset

**Anchor:** `docs/OKX_ORDERBOOK_R2_PROCEDURE.md#seq-reset`

### Sequence Reset (seq_reset)

OKX may reset the sequence counter, sending a full snapshot (action=`snapshot`) after
a period of incremental updates. This signals that the consumer MUST discard local state.

**Policy:**

- Detect: `msg.action === 'snapshot'` received AFTER initial bootstrap
- Action: **RESET** — clear current orderbook state; apply the new snapshot as baseline.
- Set `state.lastSeqId = msg.seqId`
- Log: `SEQ_RESET seqId=<n>` at INFO level.
- Reason code: `OKX_SEQ_RESET`
- After reset: resume normal incremental processing.

**Evidence fixture:** `artifacts/fixtures/okx/orderbook/seq_reset/`

---

## #empty-updates

**Anchor:** `docs/OKX_ORDERBOOK_R2_PROCEDURE.md#empty-updates`

### Empty Update Messages (empty_updates)

OKX may send update messages where `bids` and `asks` arrays are both empty.
This is a heartbeat-like message and must be handled without modifying book state.

**Policy:**

- Detect: `msg.action === 'update' && msg.bids.length === 0 && msg.asks.length === 0`
- Action: **IGNORE** — do not modify local orderbook.
- Do NOT treat as NO_UPDATE (seqId may advance).
- Update `state.lastSeqId = msg.seqId` to avoid false seq-gap alerts.
- Log: `EMPTY_UPDATE seqId=<n>` at DEBUG level only.
- Reason code: `OKX_EMPTY_UPDATE`

**Evidence fixture:** `artifacts/fixtures/okx/orderbook/empty_updates/`

---

## General R2 Exception Matrix

| Condition | Detect | Action | reason_code |
|-----------|--------|--------|-------------|
| No-update | seqId unchanged | SKIP update | OKX_SEQ_NO_UPDATE |
| Seq reset | action=snapshot (post-boot) | RESET snapshot | OKX_SEQ_RESET |
| Empty update | bids=[] AND asks=[] | IGNORE (advance seqId) | OKX_EMPTY_UPDATE |

---

## SSOT Reference

- `specs/data_capabilities.json` — OKX orderbook capability flags
- `specs/data_lanes.json` — okx_orderbook_ws lane + r2_exception_policy_refs
- This file — normative anchor for all R2 policy refs
