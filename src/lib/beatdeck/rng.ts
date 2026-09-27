// Seeded randomness, so a run is reproducible from its seed (the Daily Run
// gives everyone the same shuffle) and a saved run resumes exactly.
// mulberry32: tiny, fast, and plenty random for shuffles and shop rolls.

export function nextRandom(state: number): [value: number, state: number] {
  let t = (state + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  t = (state + 0x6d2b79f5) | 0;
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t];
}

/** A stateful generator over a seed; read `.state` back to persist it. */
export class Rng {
  constructor(public state: number) {}
  next(): number {
    const [v, s] = nextRandom(this.state);
    this.state = s;
    return v;
  }
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }
  shuffle<T>(items: readonly T[]): T[] {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

/** Today's date as a seed, the same for every visitor (UTC). */
export function dailySeed(date = new Date()): number {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  return Number(d) * 7919;
}
