// Sliding-window rate limiter so we never blow the SoSoValue per-minute budget. Per-process;
// combined with the durable Data Cache upstream, one series/news fetch runs at most once per
// revalidate window across the fleet.
export class SlidingWindowLimiter {
  private hits: number[] = [];
  constructor(
    private readonly limit: number,
    private readonly windowMs: number = 60_000,
  ) {}

  async acquire(): Promise<void> {
    const now = Date.now();
    this.hits = this.hits.filter((t) => now - t < this.windowMs);
    if (this.hits.length >= this.limit) {
      const waitMs = this.windowMs - (now - this.hits[0]) + 5;
      await new Promise((r) => setTimeout(r, Math.max(0, waitMs)));
      return this.acquire();
    }
    this.hits.push(Date.now());
  }
}
