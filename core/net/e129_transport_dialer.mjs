import dns from 'node:dns';
import dnsPromises from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import https from 'node:https';
import { WebSocket } from 'ws';

export function detectProxyShape(env=process.env){
  const raw = env.HTTPS_PROXY || env.HTTP_PROXY || env.ALL_PROXY || '';
  let scheme='NONE';
  try{ scheme = raw ? new URL(raw).protocol.replace(':','').toUpperCase() : 'NONE'; }catch{ scheme='INVALID'; }
  return { raw, scheme, no_proxy: env.NO_PROXY ? 'SET' : 'NONE' };
}

export function httpRequestFallback(url,family){
  return new Promise((resolve,reject)=>{
    const u=new URL(url);
    const req=https.request({hostname:u.hostname,path:u.pathname+u.search,port:u.port||443,method:'GET',timeout:5000,family,headers:{accept:'application/json','user-agent':'treasure-e129/1.0'}},(res)=>{
      const chunks=[]; res.on('data',(c)=>chunks.push(c)); res.on('end',()=>resolve({status:res.statusCode||0,body:Buffer.concat(chunks).toString('utf8'),date:res.headers.date||''}));
    });
    req.on('timeout',()=>{req.destroy(); reject(new Error('E_TIMEOUT'));});
    req.on('error',()=>reject(new Error('E_HTTP_STACK_FAIL')));
    req.end();
  });
}

export async function dialTarget({target,mode,enabled,forceNetDown,forceIpv4,preferIpv6}){
  const out={dns_ok:false,tcp_ok:false,tls_ok:false,http_ok:false,ws_handshake_ok:false,ws_event_ok:false,rest_payload_ok:false,handshake_rtt_ms:'NA',first_event_rtt_ms:'NA',rtt_ms:0,bytes:0,err_code:'NONE',reason_code:'E_NET_BLOCKED',rest_stack:'NA',family:'auto',clock_drift_sec:'NA'};
  const start=Date.now();
  if(mode==='OFFLINE_ONLY'||!enabled||forceNetDown){ out.rtt_ms=Date.now()-start; return out; }
  const u=new URL(target.endpoint); const host=u.hostname; const port=Number(u.port||((u.protocol==='https:'||u.protocol==='wss:')?443:80));
  const family=forceIpv4?4:(preferIpv6?6:0); out.family=family===4?'ipv4':family===6?'ipv6':'auto';
  try{
    if(forceIpv4) dns.setDefaultResultOrder('ipv4first');
    const lookup = family===6 ? await dnsPromises.resolve6(host) : family===4 ? await dnsPromises.resolve4(host) : await dnsPromises.lookup(host);
    out.dns_ok=Array.isArray(lookup)?lookup.length>0:Boolean(lookup?.address);
    if(!out.dns_ok) throw new Error('E_DNS_FAIL');
    await new Promise((resolve,reject)=>{const s=net.connect({host,port,family,timeout:4500},()=>{out.tcp_ok=true; s.destroy(); resolve();}); s.on('timeout',()=>{s.destroy(); reject(new Error(family===6?'E_IPV6_BLACKHOLE':'E_TCP_FAIL'));}); s.on('error',(e)=>reject(new Error(family===4?'E_IPV4_BLOCKED':(e?.code||'E_TCP_FAIL'))));});
    await new Promise((resolve,reject)=>{const s=tls.connect({host,port,servername:host,family,timeout:4500},()=>{out.tls_ok=true; s.destroy(); resolve();}); s.on('timeout',()=>{s.destroy(); reject(new Error('E_TLS_FAIL'));}); s.on('error',()=>reject(new Error('E_TLS_FAIL')));});

    if(target.channel==='REST'){
      let res;
      try{ const r=await fetch(target.endpoint,{method:'GET',headers:{accept:'application/json','user-agent':'treasure-e129/1.0'}}); const body=await r.text(); res={status:r.status,body,date:r.headers.get('date')||''}; out.rest_stack='fetch'; }
      catch{ out.rest_stack='https_request'; res=await httpRequestFallback(target.endpoint,family); }
      out.bytes=Buffer.byteLength(res.body); out.http_ok=res.status>=200&&res.status<300;
      if(res.date){ out.clock_drift_sec=Math.round(Math.abs(Date.now()-Date.parse(res.date))/1000); }
      if(!out.http_ok) throw new Error('E_HTTP_FAIL');
      try{ JSON.parse(res.body); out.rest_payload_ok=true; out.reason_code='E_OK'; }
      catch{ out.reason_code='E_BAD_SCHEMA'; }
    }else{
      await new Promise((resolve,reject)=>{
        const wsStart=Date.now();
        const ws=new WebSocket(target.endpoint,{handshakeTimeout:5000,family});
        const timer=setTimeout(()=>{ws.terminate(); reject(new Error(out.ws_handshake_ok?'E_WS_HANDSHAKE_OK_BUT_NO_EVENT':'E_WS_HANDSHAKE_FAIL'));},7000);
        ws.once('open',()=>{out.ws_handshake_ok=true; out.handshake_rtt_ms=Date.now()-wsStart;});
        ws.once('message',(d)=>{out.ws_event_ok=true; out.first_event_rtt_ms=Date.now()-wsStart; out.bytes+=Buffer.byteLength(String(d)); out.reason_code='E_OK'; clearTimeout(timer); ws.close(); resolve();});
        ws.once('error',()=>{clearTimeout(timer); reject(new Error('E_WS_HANDSHAKE_FAIL'));});
      });
    }
  }catch(e){
    const msg=String(e.message||'E_TIMEOUT');
    out.err_code=msg;
    out.reason_code=['E_DNS_FAIL','E_TCP_FAIL','E_TLS_FAIL','E_HTTP_FAIL','E_TIMEOUT','E_PROXY_FAIL','E_BAD_SCHEMA','E_WS_HANDSHAKE_FAIL','E_WS_HANDSHAKE_OK_BUT_NO_EVENT','E_IPV6_BLACKHOLE','E_IPV4_BLOCKED'].includes(msg)?msg:(msg.includes('ECONN')?'E_TCP_FAIL':'E_TIMEOUT');
  }
  out.rtt_ms=Date.now()-start;
  return out;
}
