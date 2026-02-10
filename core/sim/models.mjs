// core/sim/models.mjs
// Execution mode profiles

export const MODE_PROFILES = {
  optimistic: { slip_mean: 1, slip_std: 1, reject_prob: 0.01, latency_mean: 50, latency_std: 20 },
  base: { slip_mean: 3, slip_std: 2, reject_prob: 0.03, latency_mean: 150, latency_std: 50 },
  hostile: { slip_mean: 8, slip_std: 5, reject_prob: 0.08, latency_mean: 400, latency_std: 200 }
};

export function sampleSpreadProxy(mode, rng) {
  const profiles = { optimistic: 0.0002, base: 0.0005, hostile: 0.0015 };
  return profiles[mode] || 0.0005;
}
