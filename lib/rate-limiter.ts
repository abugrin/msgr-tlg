/**
 * Delay-based rate limiter that ensures a minimum gap between calls.
 * Supports dynamic RPS change for fallback on rate-limit errors.
 */
export class RateLimiter {
  private lastCall = Date.now();
  private intervalMs: number;

  constructor(maxRps: number) {
    this.intervalMs = Math.ceil(1000 / maxRps);
  }

  setMaxRps(maxRps: number): void {
    this.intervalMs = Math.ceil(1000 / maxRps);
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCall;
    if (elapsed < this.intervalMs) {
      await new Promise((r) => setTimeout(r, this.intervalMs - elapsed));
    }
    this.lastCall = Date.now();
  }
}
