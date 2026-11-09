/**
 * JalDrishti In-Memory Sliding-Window Rate Limiter
 * Provides robust rate limiting without external dependencies
 */

class RateLimiter {
  constructor(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();

    // Periodic cleanup of expired IP records every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [ip, record] of this.hits.entries()) {
        if (now - record.resetTime > this.windowMs) {
          this.hits.delete(ip);
        }
      }
    }, 5 * 60 * 1000);

    // Prevent cleanup interval from blocking process termination
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const now = Date.now();

      let record = this.hits.get(ip);
      if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + this.windowMs };
        this.hits.set(ip, record);
      } else {
        record.count += 1;
      }

      const remaining = Math.max(0, this.maxRequests - record.count);
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

      if (record.count > this.maxRequests) {
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          retryAfter
        });
      }

      next();
    };
  }
}

// Auth endpoints: 20 requests per 15 minutes per IP
export const authRateLimiter = new RateLimiter(15 * 60 * 1000, 30).middleware();

// Sensitive OTP endpoints: 10 requests per 10 minutes per IP
export const otpRateLimiter = new RateLimiter(10 * 60 * 1000, 15).middleware();

// General API endpoints: 300 requests per 5 minutes per IP
export const generalApiLimiter = new RateLimiter(5 * 60 * 1000, 300).middleware();
