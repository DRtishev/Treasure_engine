# REGRESSION_DEC01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3053d6c7678c
NEXT_ACTION: npm run -s verify:regression:dec01-decimal-sort-total-order

## TOTAL_ORDER_PROPERTIES
- Reflexivity: cmp(a,a) == 0
- Antisymmetry: sign(cmp(a,b)) == -sign(cmp(b,a))
- Transitivity: a≤b ∧ b≤c → a≤c
- Totality: either cmp(a,b)≤0 or cmp(b,a)≤0

## CHECKS
- [PASS] equal_integers: compareDecimalStr("50000","50000") → 0 (expected 0) OK
- [PASS] equal_decimals: compareDecimalStr("1.5","1.5") → 0 (expected 0) OK
- [PASS] trailing_zeros_equal: compareDecimalStr("50000.00","50000") → 0 (expected 0) OK
- [PASS] equal_small_decimal: compareDecimalStr("0.001","0.001") → 0 (expected 0) OK
- [PASS] int_50000_gt_49900: compareDecimalStr("50000","49900") → 1 (expected 1) OK
- [PASS] int_49900_lt_50000: compareDecimalStr("49900","50000") → -1 (expected -1) OK
- [PASS] int_9_lt_10: compareDecimalStr("9","10") → -1 (expected -1) OK
- [PASS] int_10_gt_9: compareDecimalStr("10","9") → 1 (expected 1) OK
- [PASS] int_100_gt_99: compareDecimalStr("100","99") → 1 (expected 1) OK
- [PASS] int_1M_gt_999999: compareDecimalStr("1000000","999999") → 1 (expected 1) OK
- [PASS] int_999999_lt_1M: compareDecimalStr("999999","1000000") → -1 (expected -1) OK
- [PASS] dec_50050.5_gt_50050.25: compareDecimalStr("50050.5","50050.25") → 1 (expected 1) OK
- [PASS] dec_50050.25_lt_50050.5: compareDecimalStr("50050.25","50050.5") → -1 (expected -1) OK
- [PASS] dec_1.9_gt_1.10: compareDecimalStr("1.9","1.10") → 1 (expected 1) OK
- [PASS] dec_1.10_lt_1.9: compareDecimalStr("1.10","1.9") → -1 (expected -1) OK
- [PASS] dec_0.001_lt_0.01: compareDecimalStr("0.001","0.01") → -1 (expected -1) OK
- [PASS] dec_0.01_gt_0.001: compareDecimalStr("0.01","0.001") → 1 (expected 1) OK
- [PASS] dec_0.1_eq_0.10: compareDecimalStr("0.1","0.10") → 0 (expected 0) OK
- [PASS] dec_1.000_eq_1: compareDecimalStr("1.000","1") → 0 (expected 0) OK
- [PASS] neg_minus1_lt_0: compareDecimalStr("-1","0") → -1 (expected -1) OK
- [PASS] pos_0_gt_minus1: compareDecimalStr("0","-1") → 1 (expected 1) OK
- [PASS] neg_minus5_lt_minus3: compareDecimalStr("-5","-3") → -1 (expected -1) OK
- [PASS] neg_minus3_gt_minus5: compareDecimalStr("-3","-5") → 1 (expected 1) OK
- [PASS] neg_dec_minus1.5_lt_minus1.2: compareDecimalStr("-1.5","-1.2") → -1 (expected -1) OK
- [PASS] antisym_int_pair: antisymmetry ("50000","49900"): cmp(a,b)=1 cmp(b,a)=-1 OK
- [PASS] antisym_dec_pair: antisymmetry ("1.9","1.10"): cmp(a,b)=1 cmp(b,a)=-1 OK
- [PASS] antisym_neg_pair: antisymmetry ("-5","-3"): cmp(a,b)=-1 cmp(b,a)=1 OK
- [PASS] antisym_single_digit_vs_two: antisymmetry ("9","10"): cmp(a,b)=-1 cmp(b,a)=1 OK
- [PASS] antisym_dec_frac_pair: antisymmetry ("50050.5","50050.25"): cmp(a,b)=1 cmp(b,a)=-1 OK
- [PASS] antisym_equal_antisym: antisymmetry ("50000","50000"): cmp(a,b)=0 cmp(b,a)=0 OK
- [PASS] transitive_int_ascending: transitivity ("49800"≤"49900"≤"50000"): cmp(a,b)=-1 cmp(b,c)=-1 cmp(a,c)=-1 OK
- [PASS] transitive_int_descending: transitivity ("50200"≤"50100"≤"50000"): cmp(a,b)=1 cmp(b,c)=1 cmp(a,c)=1 OK
- [PASS] transitive_dec_mixed: transitivity ("1.10"≤"1.9"≤"2.0"): cmp(a,b)=-1 cmp(b,c)=-1 cmp(a,c)=-1 OK
- [PASS] transitive_small_decimals: transitivity ("0.001"≤"0.01"≤"0.1"): cmp(a,b)=-1 cmp(b,c)=-1 cmp(a,c)=-1 OK
- [PASS] transitive_neg_to_pos: transitivity ("-10"≤"-5"≤"5"): cmp(a,b)=-1 cmp(b,c)=-1 cmp(a,c)=-1 OK
- [PASS] bids_sorted_desc: bids DESC: 50000,49950,49850 — OK
- [PASS] asks_sorted_asc: asks ASC: 50050,50150 — OK
- [PASS] decimal_bids_sorted_desc: decimal bids DESC: 50000.25,49999.75,49999.5 — OK

## FAILED
- NONE
