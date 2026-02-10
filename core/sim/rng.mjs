// core/sim/rng.mjs
// Seeded PRNG (xorshift128+) for deterministic simulation

export class SeededRNG {
  constructor(seed = 12345) {
    this.state = [seed, seed ^ 0x9e3779b9, seed ^ 0x85ebca6b, seed ^ 0xc2b2ae35];
    // Warm-up
    for (let i = 0; i < 10; i++) this.next();
  }

  next() {
    let s = this.state;
    let t = s[3];
    t ^= t << 11;
    t ^= t >>> 8;
    s[3] = s[2];
    s[2] = s[1];
    s[1] = s[0];
    t ^= s[0];
    t ^= s[0] >>> 19;
    s[0] = t;
    return (t >>> 0) / 4294967296;
  }

  uniform(min = 0, max = 1) {
    return min + this.next() * (max - min);
  }

  normal(mean = 0, std = 1) {
    // Box-Muller transform with log(0) protection
    const u1 = Math.max(this.next(), 1e-12);
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * std;
  }

  choice(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
}
