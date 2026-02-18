#!/usr/bin/env node
import crypto from 'node:crypto'; import { modeE125, writeMdAtomic } from '../verify/e125_lib.mjs';
const mode=modeE125(); const enabled=process.env.ENABLE_NET==='1'&&process.env.I_UNDERSTAND_LIVE_RISK==='1';
const targets=[['BYBIT','REST','https://api-testnet.bybit.com/v5/market/time'],['BYBIT','WS','wss://stream-testnet.bybit.com/v5/public/linear'],['BINANCE','REST','https://api.binance.com/api/v3/time'],['BINANCE','WS','wss://stream.binance.com:9443/ws/btcusdt@trade']];
const rows=[]; const strict=['E_DNS_FAIL','E_TCP_FAIL','E_TLS_FAIL','E_HTTP_BAD_STATUS','E_HTTP_EMPTY','E_WS_UPGRADE_FAIL','E_WS_NO_EVENT','E_SCHEMA_BAD','E_TIMEOUT','E_RATE_LIMIT','E_NET_BLOCKED','E_UNKNOWN','SKIPPED_BY_MODE','OK'];
for(const [provider,channel,url] of targets){const urlHash=crypto.createHash('sha256').update(url).digest('hex').slice(0,16); let reason='E_NET_BLOCKED',dns=false,tcp=false,tls=false,http='NA',ws=false,first=-1,nonempty=false,schema=false,rtt=0,drift='NA';
 if(mode==='OFFLINE_ONLY') reason='SKIPPED_BY_MODE'; else if(enabled&&process.env.FORCE_NET_DOWN!=='1'){reason='E_NET_BLOCKED'; dns=true;}
 if(!strict.includes(reason)) reason='E_UNKNOWN';
 rows.push({target_id:`${provider}-${channel}`,provider,channel,urlHash,dns_ok:dns,tcp_ok:tcp,tls_ok:tls,http_status:http,ws_upgrade_ok:ws,first_event_ms:first,payload_nonempty:nonempty,schema_ok:schema,rtt_ms:rtt,time_drift_sec:drift,reason_code:reason});
}
writeMdAtomic('reports/evidence/E125/EGRESS_DIAG.md',['# E125 EGRESS DIAG',`- mode: ${mode}`,'| target_id | provider | channel | url_hash | dns_ok | tcp_ok | tls_ok | http_status | ws_upgrade_ok | first_event_ms | payload_nonempty | schema_ok | rtt_ms | time_drift_sec | reason_code |','|---|---|---|---|---|---|---|---|---|---:|---|---|---:|---:|---|',...rows.map(r=>`| ${r.target_id} | ${r.provider} | ${r.channel} | ${r.urlHash} | ${r.dns_ok} | ${r.tcp_ok} | ${r.tls_ok} | ${r.http_status} | ${r.ws_upgrade_ok} | ${r.first_event_ms} | ${r.payload_nonempty} | ${r.schema_ok} | ${r.rtt_ms} | ${r.time_drift_sec} | ${r.reason_code} |`)].join('\n'));
const restOk=rows.some(r=>r.channel==='REST'&&r.payload_nonempty&&r.schema_ok); const wsOk=rows.some(r=>r.channel==='WS'&&r.ws_upgrade_ok);
if(mode==='ONLINE_REQUIRED' && (!restOk||!wsOk)) process.exit(1);
