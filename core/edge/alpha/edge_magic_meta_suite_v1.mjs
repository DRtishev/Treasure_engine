#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { canonicalStringify } from '../contracts.mjs';

const DATASETS = [
  ['flashcrash', 'core/edge/fixtures/edge_magic_stress_flashcrash.csv'],
  ['chop', 'core/edge/fixtures/edge_magic_stress_chop.csv'],
  ['spread', 'core/edge/fixtures/edge_magic_stress_spread.csv']
].map(([id, rel]) => ({ id, path: path.resolve(rel) }));

const DEC = 8;
function r(v) { const f = 10 ** DEC; return Math.round(v * f) / f; }
function lcg(seed){let s=(seed>>>0)||1;return()=>((s=(1664525*s+1013904223)>>>0)/0x100000000);} 
function parseCsv(csvPath){
  const [h,...rows]=fs.readFileSync(csvPath,'utf8').trim().split(/\r?\n/);
  if(h!=='ts,close,signal') throw new Error('BAD_HEADER');
  return rows.map((line)=>{const [ts,c,s]=line.split(',');return{ts,close:Number(c),signal:Number(s),volume:1};}).sort((a,b)=>a.ts.localeCompare(b.ts));
}

function computeMetrics(rows, cfg, seed){
  const rand=lcg(seed); let pos=0,entry=0,entryI=-1; const rets=[],holds=[]; let impact=0; const eq=[0];
  for(let i=0;i<rows.length;i++){
    const b=rows[i]; const px=r(b.close*(1+r((rand()-0.5)*0.001))); const t=b.signal;
    if(pos===0 && t!==0){pos=t;entry=px;entryI=i;continue;}
    if(pos!==0 && t!==pos){
      const gross=r((px-entry)*pos*cfg.qty);
      const fee=r((Math.abs(px)+Math.abs(entry))*cfg.qty*cfg.fee_bps/10000);
      const slip=r((Math.abs(px)+Math.abs(entry))*cfg.qty*cfg.slip_bps/10000);
      const net=r(gross-fee-slip-cfg.penalty);
      rets.push(net); holds.push(i-entryI); impact=r(impact+fee+slip+cfg.penalty); eq.push(r(eq.at(-1)+net));
      pos=t; entry=px; entryI=t===0?-1:i;
    }
  }
  if(pos!==0){const i=rows.length-1;const b=rows.at(-1);const px=b.close;const gross=r((px-entry)*pos*cfg.qty);const fee=r((Math.abs(px)+Math.abs(entry))*cfg.qty*cfg.fee_bps/10000);const slip=r((Math.abs(px)+Math.abs(entry))*cfg.qty*cfg.slip_bps/10000);const net=r(gross-fee-slip-cfg.penalty);rets.push(net);holds.push(i-entryI+1);impact=r(impact+fee+slip+cfg.penalty);eq.push(r(eq.at(-1)+net));}
  const trades=rets.length,wins=rets.filter(x=>x>0).length,winrate=trades?wins/trades:0;
  const posSum=rets.filter(x=>x>0).reduce((a,b)=>a+b,0), neg=Math.abs(rets.filter(x=>x<0).reduce((a,b)=>a+b,0));
  const pf=neg?posSum/neg:0; let peak=eq[0],maxdd=0; for(const v of eq){peak=Math.max(peak,v);maxdd=Math.max(maxdd,peak-v);} let run=0,worst=0; for(const v of rets){if(v<0){run++;worst=Math.max(worst,run);} else run=0;}
  const mean=trades?rets.reduce((a,b)=>a+b,0)/trades:0; const varr=trades?rets.reduce((a,b)=>a+(b-mean)**2,0)/trades:0;
  return {trades,winrate:r(winrate),profit_factor:r(pf),max_drawdown:r(maxdd),sharpe_simple:r(varr?mean/Math.sqrt(varr):0),expectancy:r(mean),worst_run:worst,avg_hold:r(holds.length?holds.reduce((a,b)=>a+b,0)/holds.length:0),fee_slippage_impact:r(impact),net_pnl:r(eq.at(-1))};
}

export function runEdgeMetaSuiteV1(opts={}){
  const seed=Number(opts.seed??process.env.SEED??12345);
  const cfg={qty:1,fee_bps:8,slip_bps:4,penalty:0.01};
  const base=[];
  for(const d of DATASETS){const rows=parseCsv(d.path); base.push({dataset:d.id,rows,metrics:computeMetrics(rows,cfg,seed+d.id.length)});} 
  base.sort((a,b)=>a.dataset.localeCompare(b.dataset));

  const laws=[];
  // M1 permutation invariance
  for(const b of base){const perm=[...b.rows].sort((x,y)=>y.ts.localeCompare(x.ts));const m=computeMetrics(perm,cfg,seed+b.dataset.length);laws.push({law:'M1',dataset:b.dataset,pass:b.metrics.net_pnl===m.net_pnl&&b.metrics.profit_factor===m.profit_factor,observed_delta:r(Math.abs(b.metrics.net_pnl-m.net_pnl))});}
  // M2 unit scaling invariance (volume scaling should keep ratios)
  for(const b of base){const scaled=b.rows.map((x)=>({...x,volume:10}));const m=computeMetrics(scaled,cfg,seed+b.dataset.length);laws.push({law:'M2',dataset:b.dataset,pass:b.metrics.winrate===m.winrate&&b.metrics.profit_factor===m.profit_factor,observed_delta:r(Math.abs(b.metrics.winrate-m.winrate))});}
  // M3 duplication invariance
  for(const b of base){const dup=[...b.rows,...b.rows.map((x)=>({...x,ts:`${x.ts}-D`}))];const m=computeMetrics(dup,cfg,seed+b.dataset.length);laws.push({law:'M3',dataset:b.dataset,pass:b.metrics.winrate===m.winrate&&b.metrics.expectancy===m.expectancy,observed_delta:r(Math.abs(b.metrics.expectancy-m.expectancy))});}
  // M4 higher fee reduces net pnl
  for(const b of base){const mHi=computeMetrics(b.rows,{...cfg,fee_bps:cfg.fee_bps+20},seed+b.dataset.length);laws.push({law:'M4',dataset:b.dataset,pass:mHi.net_pnl<=b.metrics.net_pnl,observed_delta:r(b.metrics.net_pnl-mHi.net_pnl)});} 
  // M5 wider spread reduces fill quality (higher impact)
  for(const b of base){const mHi=computeMetrics(b.rows,{...cfg,slip_bps:cfg.slip_bps+20},seed+b.dataset.length);laws.push({law:'M5',dataset:b.dataset,pass:mHi.fee_slippage_impact>=b.metrics.fee_slippage_impact,observed_delta:r(mHi.fee_slippage_impact-b.metrics.fee_slippage_impact)});} 
  laws.sort((a,b)=>`${a.law}:${a.dataset}`.localeCompare(`${b.law}:${b.dataset}`));

  const regimes=[];
  for(const b of base){
    const gapRows=b.rows.filter((_,i)=>i%3!==1); // missing candles
    const feeShock=computeMetrics(b.rows,{...cfg,fee_bps:cfg.fee_bps+30},seed+999+b.dataset.length);
    const spreadSpike=computeMetrics(b.rows,{...cfg,slip_bps:cfg.slip_bps+30},seed+888+b.dataset.length);
    const gaps=computeMetrics(gapRows,cfg,seed+777+b.dataset.length);
    regimes.push({dataset:b.dataset,regime:'baseline',metrics:b.metrics});
    regimes.push({dataset:b.dataset,regime:'fee_shock',metrics:feeShock});
    regimes.push({dataset:b.dataset,regime:'spread_spike',metrics:spreadSpike});
    regimes.push({dataset:b.dataset,regime:'missing_candles',metrics:gaps});
  }
  regimes.sort((a,b)=>`${a.dataset}:${a.regime}`.localeCompare(`${b.dataset}:${b.regime}`));

  const aggregate={
    law_pass_rate:r(laws.filter(x=>x.pass).length/laws.length),
    regimes:regimes.length,
    avg_net_pnl:r(regimes.reduce((a,x)=>a+x.metrics.net_pnl,0)/regimes.length)
  };
  const core={suite:'edge_meta_suite_v1',seed,laws,regimes,aggregate};
  const deterministic_fingerprint=crypto.createHash('sha256').update(canonicalStringify(core)).digest('hex');
  return {...core,deterministic_fingerprint};
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(runEdgeMetaSuiteV1(),null,2));
