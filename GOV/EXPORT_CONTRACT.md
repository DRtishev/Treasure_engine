# EXPORT_CONTRACT.md — SSOT

This document is the SSOT for release artifact locations used by EDGE_PROFIT_00 release verification.

CONTRACT_VERSION=1.0.0
EVIDENCE_EPOCH_DEFAULT=EPOCH-EDGE-RC-STRICT-01
FINAL_VALIDATED_PRIMARY_PATH=reports/evidence/${EVIDENCE_EPOCH}/artifacts/FINAL_VALIDATED.tar.gz
EVIDENCE_CHAIN_PRIMARY_PATH=reports/evidence/${EVIDENCE_EPOCH}/artifacts/FINAL_VALIDATED.tar.gz
FINAL_VALIDATED_SHA256_SIDECAR_PATH=reports/evidence/${EVIDENCE_EPOCH}/artifacts/FINAL_VALIDATED.sha256

Notes:
- `npm run -s export:final-validated` writes deterministic tar artifact plus `.sha256` sidecar.
- Release gate must read this file and validate paths from this contract.
