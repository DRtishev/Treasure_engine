// core/exec/strategy_aware_executor.mjs
// EPOCH-18: orchestrator + conversion + allocation facade.

import { StrategyOrchestrator } from '../strategy/strategy_orchestrator.mjs';
import { signalToIntent } from './signal_converter.mjs';
import { PortfolioAllocator } from '../portfolio/portfolio_allocator.mjs';

export class StrategyAwareExecutor {
  constructor(options = {}) {
    this.orchestrator = options.orchestrator || new StrategyOrchestrator({ seed: options.seed });
    this.allocator = options.allocator || new PortfolioAllocator(options.allocation || {});
  }

  prepareIntents(signals = [], options = {}) {
    const ranked = this.orchestrator.rankSignals(signals);
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
        allocation: alloc,
      };
    });
  }
}

export default StrategyAwareExecutor;
