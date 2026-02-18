#!/usr/bin/env node
import fs from 'node:fs';
const t=fs.readFileSync('reports/evidence/E123/CONNECTIVITY_DIAG_V2.md','utf8');
for (const h of ['provider','channel','endpoint','ok','reason_code','rtt_ms','ts_utc','mode','quorum_group']) if(!t.includes(h)) throw new Error(`E123_DIAG_HEADER_MISSING:${h}`);
const allowed=['E_NET_BLOCKED','E_DNS_FAIL','E_TIMEOUT','E_TLS_FAIL','E_HTTP_NOK','E_WS_NO_EVENT','E_SCHEMA_FAIL','E_EMPTY','SKIPPED_BY_MODE','OK'];
for (const m of t.match(/\|[^\n]+\|/g)||[]) {
  const cols=m.split('|').map(x=>x.trim());
  if(cols.length<10||cols[0]!=='') continue;
  const rc=cols[5];
  if (!rc || rc==='reason_code' || rc==='---') continue;
  if (!allowed.includes(rc)) throw new Error(`E123_DIAG_REASON_INVALID:${rc}`);
}
