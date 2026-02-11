// core/portfolio/portfolio_allocator.mjs
// EPOCH-18: deterministic allocation capped by risk constraints.

export class PortfolioAllocator {
  constructor(options = {}) {
    this.totalCapitalUsd = Number.isFinite(options.totalCapitalUsd) ? options.totalCapitalUsd : 10000;
    this.maxPerIntentUsd = Number.isFinite(options.maxPerIntentUsd) ? options.maxPerIntentUsd : 1000;
    this.maxPortfolioAllocationPct = Number.isFinite(options.maxPortfolioAllocationPct) ? options.maxPortfolioAllocationPct : 1;
  }

  allocate(intents = []) {
    const totalBudget = this.totalCapitalUsd * this.maxPortfolioAllocationPct;
    let remaining = totalBudget;

    return intents.map((intent) => {
      const requested = Number.isFinite(intent.size_usd) ? intent.size_usd : 0;
      const cappedByIntent = Math.min(requested, this.maxPerIntentUsd);
      const allocated_notional = Math.max(0, Math.min(cappedByIntent, remaining));
      remaining -= allocated_notional;

      return {
        intent_id: intent.intent_id,
        strategy_id: intent.strategy_id,
        requested_notional: requested,
        allocated_notional,
        cap_reason: allocated_notional < requested ? 'risk_cap_applied' : 'none',
      };
    });
  }
}

export default PortfolioAllocator;
