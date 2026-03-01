# R3_PREFLIGHT.md — R3 OKX Live Acquire Preflight v2

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 2c6ea43a6ce4
NEXT_ACTION: npm run -s verify:r3:preflight

## CHECKS
- [PASS] acquire_okx_script_exists: present
- [PASS] net_kill_preload_exists: present
- [PASS] R3_UNLOCK01_missing_allow_file: allow_ref=true exists_check=true file_absent=true
- [PASS] R3_UNLOCK02_bad_content: content_check=true readfile=true wrong_refused=true
- [PASS] R3_UNLOCK03_missing_flag: flag_ref=true argv_includes=true
- [PASS] R3_UNLOCK04_cert_refuses_allow_present: EC=0 (expect 0=NETV01 blocks even with ALLOW_NETWORK on disk)
- [PASS] r3_not_wired_into_daily: not wired — OK

## FAILED
- NONE
