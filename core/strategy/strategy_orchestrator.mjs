// core/strategy/strategy_orchestrator.mjs
// EPOCH-18: deterministic strategy signal selection.

function stableStringHash(value) {
  const str = String(value ?? '');
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class StrategyOrchestrator {
  constructor(options = {}) {
    this.seed = Number.isFinite(options.seed) ? options.seed : Number(process.env.SEED || 12345);
  }

  rankSignals(signals = []) {
    return [...signals]
      .map((s, idx) => ({ ...s, _idx: idx }))
      .sort((a, b) => {
        const cA = Number.isFinite(a.confidence) ? a.confidence : 0;
        const cB = Number.isFinite(b.confidence) ? b.confidence : 0;
        if (cB !== cA) return cB - cA;

        const pA = Number.isFinite(a.priority) ? a.priority : 0;
        const pB = Number.isFinite(b.priority) ? b.priority : 0;
        if (pB !== pA) return pB - pA;

        const keyA = `${a.strategy_id || ''}:${a.symbol || ''}:${a.side || ''}:${this.seed}`;
        const keyB = `${b.strategy_id || ''}:${b.symbol || ''}:${b.side || ''}:${this.seed}`;
        const hA = stableStringHash(keyA);
        const hB = stableStringHash(keyB);
        if (hA !== hB) return hA - hB;

        return a._idx - b._idx;
      })
      .map(({ _idx, ...s }) => s);
  }

  selectTop(signals = [], limit = 1) {
    const ranked = this.rankSignals(signals);
    return ranked.slice(0, Math.max(0, limit));
  }
}

export default StrategyOrchestrator;
