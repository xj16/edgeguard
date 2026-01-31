type Bucket = { tokens: number; lastMs: number };

export type RateLimitConfig = {
  rps: number;   // refill rate per second
  burst: number; // max tokens
};

export type AllowResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export class RateLimiter {
  private cfg: RateLimitConfig;
  private buckets = new Map<string, Bucket>();

  constructor(cfg: RateLimitConfig) {
    this.cfg = cfg;
  }

  allow(key: string): AllowResult {
    const now = Date.now();
    let b = this.buckets.get(key);
    if (!b) {
      b = { tokens: this.cfg.burst, lastMs: now };
      this.buckets.set(key, b);
    }

    // refill
    const elapsed = (now - b.lastMs) / 1000;
    b.tokens = Math.min(this.cfg.burst, b.tokens + elapsed * this.cfg.rps);
    b.lastMs = now;

    if (b.tokens >= 1) {
      b.tokens -= 1;
      return { ok: true };
    }

    const missing = 1 - b.tokens;
    const retry = missing / this.cfg.rps;
    return { ok: false, retryAfterSeconds: Math.max(0.1, retry) };
  }
}
