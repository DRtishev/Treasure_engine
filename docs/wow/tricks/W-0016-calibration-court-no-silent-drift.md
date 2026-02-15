# W-0016 Calibration Court: No Silent Drift

W-ID: W-0016
Category: Governance
Problem: Envelope calibration can drift silently between epochs.
Solution: Court gate requires deterministic calibration hashes, breaking-change checks, and migration notes discipline.
Contract (PASS commands): npm run -s verify:wow && WOW_USED=W-0003,W-0015,W-0016 npm run -s verify:wow:usage
Minimal diff: Add E77 calibration court with deterministic diff/changelog evidence.
Risks: Governance overhead for tiny calibration edits.
Rollback: Disable strict court checks only via explicit epoch policy update.
Where used: E77 calibration court + CALIBRATION_* evidence.
