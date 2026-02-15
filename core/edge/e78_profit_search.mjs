#!/usr/bin/env node
import path from 'node:path';
import crypto from 'node:crypto';
import { parseEdgeFixtureCsv } from './e75_profit_harness.mjs';

const round=(v,d=8)=>{const f=10**d;return Math.round(v*f)/f;};

function metrics(trades){
  const trade_count=trades.length, net_pnl=round(trades.reduce((a,b)=>a+b,0));
  const wins=trades.filter((x)=>x>0).length, winrate=round(trade_count?wins/trade_count:0,8);
  const pos=trades.filter((x)=>x>0).reduce((a,b)=>a+b,0), neg=Math.abs(trades.filter((x)=>x<0).reduce((a,b)=>a+b,0));
  const pf=round(neg?pos/neg:0,8), expectancy=round(trade_count?net_pnl/trade_count:0,8);
  let eq=0,peak=0,dd=0; for(const t of trades){eq=round(eq+t);peak=Math.max(peak,eq);dd=Math.max(dd,round(peak-eq));}
  return {trade_count,net_pnl,winrate,profit_factor:pf,expectancy,max_drawdown:dd};
}

function runFamily(rows, family, p, envMult){
  const trades=[];
  for(let i=2;i<rows.length;i++){
    const a=rows[i-2].mid,b=rows[i-1].mid,c=rows[i].mid;
    let signal=0;
    if(family==='trend') signal=((c-b)/b>p.t)?1:(((c-b)/b<-p.t)?-1:0);
    if(family==='meanrev') signal=((c-b)/b>p.t)?-1:(((c-b)/b<-p.t)?1:0);
    if(family==='breakout'){const hh=Math.max(a,b), ll=Math.min(a,b); signal=c>hh*(1+p.t)?1:(c<ll*(1-p.t)?-1:0);}    
    if(!signal) continue;
    const next=i+1<rows.length?rows[i+1].mid:c;
    const gross=(next-c)*signal*p.size;
    const cost=Math.abs(c*p.size)*(p.fee_bps*envMult/10000 + p.slip_bps*envMult/10000);
    trades.push(round(gross-cost));
  }
  return metrics(trades);
}

export function runE78ProfitSearch(opts={}){
  const seed=Number(opts.seed??12345);
  const datasets=[['v1','core/edge/fixtures/edge_magic_v1.csv'],['v2','core/edge/fixtures/edge_magic_v2.csv'],['stress_chop','core/edge/fixtures/edge_magic_stress_chop.csv'],['stress_flashcrash','core/edge/fixtures/edge_magic_stress_flashcrash.csv'],['stress_spread','core/edge/fixtures/edge_magic_stress_spread.csv']].map(([id,rel])=>({id,rows:parseEdgeFixtureCsv(path.resolve(rel))}));
  const families=[['trend',[{id:'t1',t:0.0012,size:0.09,fee_bps:5.4,slip_bps:2.6},{id:'t2',t:0.0018,size:0.12,fee_bps:5.4,slip_bps:2.9}]],['meanrev',[{id:'m1',t:0.0014,size:0.08,fee_bps:5.4,slip_bps:2.7},{id:'m2',t:0.0019,size:0.11,fee_bps:5.4,slip_bps:3.0}]],['breakout',[{id:'b1',t:0.0010,size:0.1,fee_bps:5.4,slip_bps:2.8},{id:'b2',t:0.0015,size:0.13,fee_bps:5.4,slip_bps:3.1}]]];
  const envs={BEST:0.85,MEDIAN:1.0,WORST:1.35};
  const candidates=[];
  for(const [family,grid] of families){for(const p of grid){
    const byEnv={};
    for(const [env,m] of Object.entries(envs)){
      const agg=[];
      for(const d of datasets){const mt=runFamily(d.rows,family,p,m); byEnv[env]=byEnv[env]||{trade_count:0,net_pnl:0,expectancy:0,profit_factor:0,max_drawdown:0}; byEnv[env].trade_count+=mt.trade_count; byEnv[env].net_pnl=round(byEnv[env].net_pnl+mt.net_pnl); byEnv[env].expectancy=round(byEnv[env].expectancy+mt.expectancy); byEnv[env].profit_factor=round(byEnv[env].profit_factor+mt.profit_factor); byEnv[env].max_drawdown=Math.max(byEnv[env].max_drawdown,mt.max_drawdown);} 
      byEnv[env].expectancy=round(byEnv[env].expectancy/datasets.length); byEnv[env].profit_factor=round(byEnv[env].profit_factor/datasets.length);
    }
    let reason='OK'; if(byEnv.WORST.trade_count<8) reason='INVALID_SAMPLE'; else if(byEnv.BEST.net_pnl>0 && byEnv.WORST.net_pnl<0) reason='NOT_ROBUST';
    const robust_score=round(Math.min(byEnv.WORST.profit_factor,3)*(byEnv.WORST.trade_count/120));
    candidates.push({candidate_id:`${family}:${p.id}`,family,reason_code:reason,robust_score,metrics:byEnv});
  }}
  candidates.sort((a,b)=>b.robust_score-a.robust_score||b.metrics.WORST.net_pnl-a.metrics.WORST.net_pnl||a.candidate_id.localeCompare(b.candidate_id));
  const fp=crypto.createHash('sha256').update(JSON.stringify({seed,c:candidates.map(x=>[x.candidate_id,x.reason_code,x.robust_score,x.metrics.WORST.net_pnl])})).digest('hex');
  return {seed,candidates,profit_search_fingerprint:fp};
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(runE78ProfitSearch(),null,2));
