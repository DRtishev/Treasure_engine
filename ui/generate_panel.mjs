// ui/generate_panel.mjs (E2.1 PENALIZED METRICS)
import fs from "fs";
function readJson(p){ try{ if(!fs.existsSync(p)) return null; return JSON.parse(fs.readFileSync(p,"utf8")); }catch{ return null; } }
function esc(s){ return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }

const courtReport=readJson("reports/court_report.json");
const courtById=new Map();
if(courtReport&&Array.isArray(courtReport.hacks)){ for(const h of courtReport.hacks) courtById.set(h.id,h); }

const HACK_IDS = ['HACK_A2', 'HACK_A3', 'HACK_B1', 'HACK_B3'];
const tiles=HACK_IDS.map(hackId=>{ 
  const court=courtById.get(hackId); 
  const decision=court?court.decision:"MISSING"; 
  const reasons=court&&Array.isArray(court.reasons)?court.reasons:[]; 
  
  let expectancyBase = 'n/a';
  let penalizedExpBase = 'n/a';
  let maxDDHostile = 'n/a';
  let realityGap = 'n/a';
  let source = 'UNKNOWN';
  let tradesBase = 'n/a';
  let penaltyTotal = 'n/a';
  let topPenalties = [];
  
  try {
    const baseReport = readJson(`reports/${hackId.toLowerCase()}_base_report.json`);
    const hostileReport = readJson(`reports/${hackId.toLowerCase()}_hostile_report.json`);
    
    if (baseReport && baseReport.summary) {
      expectancyBase = baseReport.summary.expectancy_per_trade.toFixed(6);
      penalizedExpBase = (baseReport.summary.penalized_expectancy_per_trade ?? baseReport.summary.expectancy_per_trade).toFixed(6);
      source = baseReport.source || 'UNKNOWN';
      const f = (baseReport.summary.trade_count_filled ?? baseReport.summary.trade_count ?? null);
      const t = (baseReport.summary.trade_count_total ?? null);
      tradesBase = (f !== null && t !== null) ? `${f}/${t}` : (f !== null ? String(f) : 'n/a');
      
      const pb = baseReport.summary.penalty_breakdown;
      if (pb) {
        penaltyTotal = pb.total.toFixed(6);
        const penalties = [
          {name: 'reject', val: pb.reject?.contrib ?? 0},
          {name: 'slip', val: pb.slippage?.contrib ?? 0},
          {name: 'rtt', val: pb.rtt?.contrib ?? 0},
          {name: 'maxDD', val: pb.maxdd?.contrib ?? 0},
          {name: 'gap', val: pb.reality_gap?.contrib ?? 0}
        ];
        penalties.sort((a,b) => b.val - a.val);
        topPenalties = penalties.slice(0, 3).map(p => `${p.name}:${p.val.toFixed(4)}`);
      }
    }
    if (hostileReport) {
      maxDDHostile = (hostileReport.summary.max_drawdown_pct * 100).toFixed(2) + '%';
      const pbh = hostileReport.summary.penalty_breakdown;
      if (pbh && pbh.reality_gap) {
        realityGap = pbh.reality_gap.raw.toFixed(2);
      }
    }
  } catch (err) {
    // Metrics not available
  }
  
  return {id:hackId,decision,reasons,expectancyBase,penalizedExpBase,maxDDHostile,realityGap,source,tradesBase,penaltyTotal,topPenalties}; 
});

const isSynthetic = tiles.some(t => t.source === 'SYNTHETIC');

const html=`<!doctype html>
<html lang="ru"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Treasure Engine — E2.1 PENALIZED METRICS</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif;margin:20px;line-height:1.35}
.header{display:flex;gap:16px;flex-wrap:wrap;align-items:baseline}
.badge{padding:4px 10px;border:1px solid #111;border-radius:999px;display:inline-block;font-size:11px}
.badge.synthetic{background:#fff3cd;border-color:#856404;color:#856404}
.badge.allowed{background:#d4edda;border-color:#155724;color:#155724}
.badge.blocked{background:#f8d7da;border-color:#721c24;color:#721c24}
.badge.needs-data{background:#fff3cd;border-color:#856404;color:#856404}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;margin-top:14px}
.card{border:1px solid #111;border-radius:14px;padding:12px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;white-space:pre-wrap}
.small{font-size:12px;opacity:0.85}
.metric{margin-top:8px;padding:6px;background:#f8f9fa;border-radius:6px}
.metric-label{font-weight:600;font-size:11px;text-transform:uppercase;color:#666}
.metric-value{font-size:14px;font-weight:500}
hr{border:none;border-top:1px solid #111;margin:16px 0}
</style></head>
<body>
<div class="header">
  <h2 style="margin:0">E2.1 PENALIZED METRICS</h2>
  <span class="badge">Court: ${esc(courtReport ? "OK" : "MISSING")}</span>
  ${isSynthetic ? '<span class="badge synthetic">⚠️ SYNTHETIC DATA</span>' : ''}
</div>
<div class="grid">${tiles.map(t=>`
<div class="card">
  <div><b>${esc(t.id)}</b></div>
  <div style="margin-top:6px">
    <span class="badge ${t.decision === 'ALLOWED' ? 'allowed' : (t.decision === 'BLOCKED' ? 'blocked' : 'needs-data')}">
      ${esc(t.decision)}
    </span>
  </div>
  <div class="metric">
    <div class="metric-label">Trades (base) filled/total</div>
    <div class="metric-value">${esc(t.tradesBase)}</div>
  </div>
  <div class="metric">
    <div class="metric-label">Expectancy RAW</div>
    <div class="metric-value">${esc(t.expectancyBase)}</div>
  </div>
  <div class="metric">
    <div class="metric-label">Expectancy PENALIZED</div>
    <div class="metric-value">${esc(t.penalizedExpBase)}</div>
  </div>
  <div class="metric">
    <div class="metric-label">Penalty Total</div>
    <div class="metric-value">${esc(t.penaltyTotal)}</div>
  </div>
  <div class="metric">
    <div class="metric-label">Top Penalties</div>
    <div class="metric-value small">${t.topPenalties.length ? esc(t.topPenalties.join(', ')) : 'n/a'}</div>
  </div>
  <div class="metric">
    <div class="metric-label">Max DD (hostile)</div>
    <div class="metric-value">${esc(t.maxDDHostile)}</div>
  </div>
  <div class="metric">
    <div class="metric-label">Reality Gap</div>
    <div class="metric-value">${esc(t.realityGap)}</div>
  </div>
  <div style="margin-top:8px" class="small"><b>Reasons</b></div>
  <div class="mono">${t.reasons.length?esc(t.reasons.join("\n")):"(none)"}</div>
</div>`).join("")}</div>
<hr/>
<div class="card"><div><b>E2.1 PENALIZED METRICS Console</b></div>
<div class="mono" style="margin-top:8px">[E2.1] Raw vs Penalized expectancy
[E2.1] Penalty breakdown: reject/slip/rtt/maxDD/gap
[E2.1] Court judges on penalized_expectancy
${isSynthetic ? '[E2.1] ⚠️ SYNTHETIC DATA ONLY' : ''}</div></div>
</body></html>`;

fs.writeFileSync("ui/panel.html",html);
console.log("WROTE: ui/panel.html");
