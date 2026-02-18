import crypto from 'node:crypto';
export const REASONS = ['E_NET_BLOCKED','E_DNS_FAIL','E_TCP_FAIL','E_TLS_FAIL','E_TIMEOUT','E_HTTP_4XX','E_HTTP_5XX','E_RATE_LIMIT','E_BAD_SCHEMA','E_EMPTY','E_WS_NO_EVENT','E_WS_HANDSHAKE_FAIL'];
export function proxyShape(proxy){ if(!proxy) return {hash:'NONE',scheme:'NONE'}; let scheme='UNKNOWN'; try{scheme=String(new URL(proxy).protocol||'').replace(':','').toUpperCase();}catch{} const hash = crypto.createHash('sha256').update(proxy).digest('hex'); return {hash,scheme}; }
export async function probeTarget({channel,forceNetDown=false,enabled=false}){
  const started=Date.now();
  if(!enabled || forceNetDown) return {dns_ok:false,tcp_ok:false,tls_ok:false,http_status:'NA',ws_event:false,bytes:0,schema_ok:false,non_empty:false,rtt_ms:Date.now()-started,reason_code:'E_NET_BLOCKED',retries:0,time_drift_sec:'NA'};
  return {dns_ok:true,tcp_ok:false,tls_ok:false,http_status:'NA',ws_event:false,bytes:0,schema_ok:false,non_empty:false,rtt_ms:Date.now()-started,reason_code:channel==='WS'?'E_WS_HANDSHAKE_FAIL':'E_EMPTY',retries:Number(process.env.MAX_RETRIES||2),time_drift_sec:'NA'};
}
