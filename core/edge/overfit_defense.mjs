import crypto from 'node:crypto';
import { assertFiniteArray, buildOverfitDefensePayload, fingerprint } from './overfit_defense_contract.mjs';

function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function variance(arr, m = mean(arr)) { return arr.length ? mean(arr.map((x) => (x - m) ** 2)) : 0; }

function sharpe(returns) {
  assertFiniteArray(returns, 'returns');
  const m = mean(returns);
  const v = variance(returns, m);
  const s = Math.sqrt(Math.max(v, 1e-12));
  return m / s;
}

function skewness(returns) {
  const m = mean(returns);
  const s = Math.sqrt(Math.max(variance(returns, m), 1e-12));
  return mean(returns.map((x) => ((x - m) / s) ** 3));
}

function kurtosisExcess(returns) {
  const m = mean(returns);
  const s = Math.sqrt(Math.max(variance(returns, m), 1e-12));
  return mean(returns.map((x) => ((x - m) / s) ** 4)) - 3;
}

function range(start, end) { return Array.from({ length: Math.max(0, end - start) }, (_, i) => i + start); }

export function generateCpcvSplits(timeline, cpcv) {
  const n = timeline.length;
  const { k, purge, embargo, seed } = cpcv;
  if (k < 2 || k > n) throw new Error(`Invalid k=${k} for timeline length=${n}`);
  const foldSize = Math.floor(n / k);
  if (foldSize < 1) throw new Error('Fold size must be >= 1');

  const folds = [];
  let cursor = 0;
  for (let i = 0; i < k; i += 1) {
    const end = i === k - 1 ? n : cursor + foldSize;
    folds.push({ fold_id: i, start: cursor, end });
    cursor = end;
  }

  const splits = folds.map((testFold) => {
    const testIdx = range(testFold.start, testFold.end);
    const blocked = new Set();
    for (const idx of testIdx) {
      for (let p = idx - purge; p <= idx + purge; p += 1) {
        if (p >= 0 && p < n) blocked.add(p);
      }
      for (let e = 1; e <= embargo; e += 1) {
        const emb = idx + e;
        if (emb < n) blocked.add(emb);
      }
    }
    const trainIdx = range(0, n).filter((i) => !blocked.has(i));
    const splitCore = {
      split_id: `split_${testFold.fold_id}`,
      test_range: [testFold.start, testFold.end - 1],
      train_count: trainIdx.length,
      test_count: testIdx.length,
      train_idx: trainIdx,
      test_idx: testIdx
    };
    return { ...splitCore, split_hash: fingerprint(splitCore) };
  });

  const timeline_hash = crypto.createHash('sha256').update(JSON.stringify(timeline)).digest('hex');
  return {
    seed,
    k,
    purge,
    embargo,
    timeline_hash,
    split_count: splits.length,
    splits,
    manifest_hash: fingerprint({ seed, k, purge, embargo, timeline_hash, splits })
  };
}

function metricValue(returns, metric) {
  if (metric === 'MEAN_RETURN') return mean(returns);
  return sharpe(returns);
}

export function computePbo(strategies, splits, metric = 'SHARPE') {
  const rows = splits.map((split) => {
    const trainScores = strategies.map((s) => ({
      id: s.id,
      train_score: metricValue(split.train_idx.map((i) => s.returns[i]), metric),
      test_score: metricValue(split.test_idx.map((i) => s.returns[i]), metric)
    }));
    trainScores.sort((a, b) => b.train_score - a.train_score || a.id.localeCompare(b.id));
    const selected = trainScores[0];
    const testRanked = [...trainScores].sort((a, b) => b.test_score - a.test_score || a.id.localeCompare(b.id));
    const rank = testRanked.findIndex((r) => r.id === selected.id) + 1;
    const overfit = rank > Math.ceil(strategies.length / 2);
    return {
      split_id: split.split_id,
      selected_strategy_id: selected.id,
      selected_train_score: selected.train_score,
      selected_test_score: selected.test_score,
      selected_test_rank: rank,
      strategy_count: strategies.length,
      overfit
    };
  });

  const pbo_estimate = rows.filter((r) => r.overfit).length / Math.max(1, rows.length);
  const testScores = rows.map((r) => r.selected_test_score);
  return {
    pbo_estimate: Number(pbo_estimate.toFixed(6)),
    split_count: rows.length,
    selected_test_score_mean: Number(mean(testScores).toFixed(8)),
    selected_test_score_variance: Number(variance(testScores).toFixed(8)),
    rows
  };
}

export function computeDsr(strategies, metric = 'SHARPE') {
  const trials = strategies.length;
  const scored = strategies.map((s) => {
    const sr = metricValue(s.returns, metric);
    const sk = skewness(s.returns);
    const ke = kurtosisExcess(s.returns);
    const multipleTestingPenalty = Math.log(Math.max(2, trials));
    const nonNormalityPenalty = Math.abs(sk) * 0.1 + Math.max(0, ke) * 0.05;
    const denom = Math.sqrt(1 + multipleTestingPenalty + nonNormalityPenalty);
    const dsr = sr / denom;
    return {
      strategy_id: s.id,
      sharpe: Number(sr.toFixed(8)),
      dsr: Number(dsr.toFixed(8)),
      skewness: Number(sk.toFixed(8)),
      kurtosis_excess: Number(ke.toFixed(8))
    };
  }).sort((a, b) => b.dsr - a.dsr || a.strategy_id.localeCompare(b.strategy_id));

  return {
    assumptions: {
      version: 'conservative-mvp-v1',
      multiple_testing_penalty: 'sqrt(1+ln(trials)) denominator component',
      non_normality_penalty: '0.1*|skew| + 0.05*max(0,kurtosis_excess)',
      deterministic: true
    },
    trials,
    best_strategy_id: scored[0]?.strategy_id || null,
    best_dsr: scored[0]?.dsr ?? 0,
    rows: scored
  };
}

export function runOverfitDefense(input) {
  if (!Array.isArray(input.timeline) || !Array.isArray(input.strategies)) throw new Error('Invalid input structure');
  for (const s of input.strategies) {
    if (s.returns.length !== input.timeline.length) {
      throw new Error(`Strategy ${s.id} returns length mismatch`);
    }
    assertFiniteArray(s.returns, `${s.id}.returns`);
  }

  const splitsManifest = generateCpcvSplits(input.timeline, input.cpcv);
  const pbo = computePbo(input.strategies, splitsManifest.splits, input.selection_metric);
  const dsr = computeDsr(input.strategies, input.selection_metric);

  const overfitWarn = pbo.pbo_estimate >= 0.30;
  const dsrWarn = dsr.best_dsr < 0.25;
  const strict = process.env.OVERFIT_STRICT === '1';
  const verdict = strict && (overfitWarn || dsrWarn) ? 'FAIL' : (overfitWarn || dsrWarn ? 'WARN' : 'PASS');

  const output = {
    splits_manifest: splitsManifest,
    pbo_summary: pbo,
    dsr_summary: dsr,
    thresholds: {
      pbo_warn_threshold: 0.30,
      dsr_warn_floor: 0.25,
      strict_mode_fail: strict
    },
    verdict
  };

  return buildOverfitDefensePayload(input, output);
}
