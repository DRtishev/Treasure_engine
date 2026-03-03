/**
 * freshness_sentinel.mjs — 3-level TTL data freshness monitoring
 *
 * EPOCH-74: Data Organ Liveness — Requirement R5
 *
 * Monitors data freshness at three levels:
 *   Level 1 — Acquisition: how old is raw data?
 *   Level 2 — Enrichment: how old is enriched output?
 *   Level 3 — Consumption: when was last bar fed to strategy?
 *
 * Exports:
 *   checkFreshness(lanes, enrichments, consumptions, opts?) → { fresh, warnings, expirations, status }
 *   DEFAULT_TTLS — default TTL constants
 *
 * Surface: DATA (pure — no I/O, no net)
 */

export const DEFAULT_TTLS = {
  // Level 1: Acquisition freshness (how old is raw data?)
  acquire: {
    TRUTH: 24 * 3600_000,         // 24h for TRUTH lanes
    HINT: 72 * 3600_000,          // 72h for HINT lanes
    EXPERIMENTAL: 168 * 3600_000, // 7 days for EXPERIMENTAL
  },
  // Level 2: Enrichment freshness (how old is enriched output?)
  enrich: {
    default: 4 * 3600_000,        // 4h — re-enrich if raw updated
  },
  // Level 3: Consumption freshness (when was last bar fed to strategy?)
  consume: {
    fast: 3 * 60_000,             // 3min for 1-min bar strategies
    slow: 3 * 3600_000,           // 3h for 1h bar strategies
  },
};

/**
 * Check data freshness across all three levels.
 *
 * @param {object[]} lanes — [{ lane_id, truth_level, age_ms }]
 * @param {object[]} enrichments — [{ source, raw_updated, enrich_age_ms }]
 * @param {object[]} consumptions — [{ strategy_name, bar_ms, age_ms }]
 * @param {object} [opts]
 * @param {object} [opts.ttls] — override DEFAULT_TTLS
 * @returns {{ fresh: boolean, warnings: object[], expirations: object[], status: string }}
 */
export function checkFreshness(lanes, enrichments, consumptions, opts = {}) {
  const ttls = { ...DEFAULT_TTLS, ...(opts.ttls || {}) };
  const warnings = [];
  const expirations = [];

  // Level 1: Acquisition
  for (const lane of lanes) {
    const age = lane.age_ms;
    const ttl = ttls.acquire[lane.truth_level] || ttls.acquire.HINT;
    const ratio = age / ttl;

    if (ratio >= 1.0) {
      expirations.push({
        level: 'ACQUIRE',
        lane_id: lane.lane_id,
        reason: 'DATA_TTL_EXPIRE',
        age_ms: age,
        ttl_ms: ttl,
      });
    } else if (ratio >= 0.75) {
      warnings.push({
        level: 'ACQUIRE',
        lane_id: lane.lane_id,
        reason: 'DATA_TTL_WARN',
        age_ms: age,
        ttl_ms: ttl,
        remaining_pct: Math.round((1 - ratio) * 100),
      });
    }
  }

  // Level 2: Enrichment
  for (const enrich of enrichments) {
    if (enrich.raw_updated && enrich.enrich_age_ms > ttls.enrich.default) {
      expirations.push({
        level: 'ENRICH',
        source: enrich.source,
        reason: 'ENRICH_STALE',
        age_ms: enrich.enrich_age_ms,
      });
    }
  }

  // Level 3: Consumption
  for (const consume of consumptions) {
    const ttl = consume.bar_ms <= 60_000 ? ttls.consume.fast : ttls.consume.slow;
    if (consume.age_ms > ttl) {
      expirations.push({
        level: 'CONSUME',
        strategy: consume.strategy_name,
        reason: 'DATA_STARVING',
        age_ms: consume.age_ms,
        ttl_ms: ttl,
      });
    }
  }

  return {
    fresh: expirations.length === 0,
    warnings,
    expirations,
    status: expirations.length > 0 ? 'EXPIRED'
      : warnings.length > 0 ? 'AGING'
        : 'FRESH',
  };
}
