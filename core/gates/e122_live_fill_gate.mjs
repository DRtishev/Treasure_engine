export function evaluateE122LiveFillGate({ mode, terminalStatus, ledgerFills, liveProofStatus }) {
  if (terminalStatus === 'FILLED' && ledgerFills > 0 && liveProofStatus === 'PASS') {
    return { status: 'PASS', reason_code: 'OK_FILLED_LEDGER_MATCH', verdict: 'PASS' };
  }
  if (mode === 'ONLINE_OPTIONAL' && terminalStatus !== 'FILLED') {
    return { status: 'WARN', reason_code: 'E_OPTIONAL_NO_FILL', verdict: 'WARN' };
  }
  return { status: 'FAIL', reason_code: 'E_NO_FILLED_OR_LEDGER_MISMATCH', verdict: 'FAIL' };
}
