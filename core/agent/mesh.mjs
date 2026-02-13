import fs from 'node:fs';
import crypto from 'node:crypto';
import { replayNormalizedDataset } from '../data/replay_engine.mjs';

function hash(x) { return crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'); }

export function runAgentMesh({ datasetId = 'epoch46-mini', provider = 'fixture', seed = 4501, eventLogPath } = {}) {
  const replay = replayNormalizedDataset({ datasetId, provider });
  const events = [];
  const researcher = replay.stream.slice(0, 3).map((c, i) => ({
    experiment_id: `exp_${i + 1}`,
    hypothesis: c.close > c.open ? 'momentum' : 'mean_revert',
    symbol: c.symbol,
    ts: c.ts_close,
    seed
  }));
  events.push({ type: 'researcher.proposed', seed, payload: researcher, fingerprint: hash(researcher) });

  const policy = { network_allowed: process.env.ENABLE_NETWORK === '1', max_experiments: 5, risk_fsm_bypass: false };
  const sentinelVerdict = {
    accepted: researcher.length <= policy.max_experiments && !policy.risk_fsm_bypass,
    reasons: ['bounded_template', 'offline_safe']
  };
  events.push({ type: 'sentinel.validated', seed, payload: sentinelVerdict, fingerprint: hash(sentinelVerdict) });

  const packaged = {
    experiment_count: researcher.length,
    accepted: sentinelVerdict.accepted,
    replay_fingerprint: replay.fingerprint
  };
  events.push({ type: 'packager.evidence', seed, payload: packaged, fingerprint: hash(packaged) });

  if (eventLogPath) {
    fs.writeFileSync(eventLogPath, events.map((e, idx) => JSON.stringify({ seq: idx + 1, ...e })).join('\n') + '\n');
  }

  return { events, output: packaged, output_fingerprint: hash(packaged), replay_fingerprint: replay.fingerprint };
}

export function replayAgentMeshFromLog(eventLogPath) {
  const lines = fs.readFileSync(eventLogPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const packaged = lines.find((e) => e.type === 'packager.evidence')?.payload;
  return { output: packaged, output_fingerprint: hash(packaged), event_count: lines.length };
}
