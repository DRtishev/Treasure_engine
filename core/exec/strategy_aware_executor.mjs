// core/exec/strategy_aware_executor.mjs
// EPOCH-18: orchestrator + conversion + allocation facade.

import { StrategyOrchestrator } from '../strategy/strategy_orchestrator.mjs';
import { signalToIntent } from './signal_converter.mjs';
import { PortfolioAllocator } from '../portfolio/portfolio_allocator.mjs';
import { scoreSignalFreshness } from '../edge/execution_realism.mjs';

export class StrategyAwareExecutor {
  constructor(options = {}) {
    this.orchestrator = options.orchestrator || new StrategyOrchestrator({ seed: options.seed });
    this.allocator = options.allocator || new PortfolioAllocator(options.allocation || {});
  }

  prepareIntents(signals = [], options = {}) {
    const nowMs = Number.isFinite(options.now_ms) ? options.now_ms : null;
    const ranked = this.orchestrator.rankSignals(signals)
      .map((signal) => {
        const freshness = nowMs === null
          ? { freshness_score: 1, action: 'ALLOW', age_ms: 0 }
          : scoreSignalFreshness(signal, { now_ms: nowMs });
        const confidence = Number.isFinite(signal.confidence) ? signal.confidence : 0;
        const adjusted_confidence = freshness.action === 'DOWNWEIGHT'
          ? confidence * freshness.freshness_score
          : confidence;
        return { ...signal, confidence: adjusted_confidence, freshness };
      })
      .filter((signal) => signal.freshness.action !== 'BLOCK');

    const intents = ranked.map((signal, idx) => signalToIntent(signal, {
      ...options,
      order_seq: idx,
    }));
    const allocations = this.allocator.allocate(intents);

    return intents.map((intent) => {
      const alloc = allocations.find((a) => a.intent_id === intent.intent_id);
      const size_usd = alloc?.allocated_notional ?? 0;
      const size = intent.price > 0 ? size_usd / intent.price : 0;
      return {
        ...intent,
        size_usd,
        size,
        freshness: intent.freshness || ranked.find((s) => s.strategy_id === intent.strategy_id && s.symbol === intent.symbol)?.freshness,
        allocation: alloc,
      };
    });
  }
}

export default StrategyAwareExecutor;
