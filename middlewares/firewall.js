const { logRequest } = require('../utils/logger');
const redis = require('../utils/redisClient');

const WINDOW_SIZE = 60; // seconds
const MAX_REQUESTS = 5;
const MAX_VIOLATIONS = 3; // block after 3 violations
const BLOCK_DURATION = 600; // seconds (10 minutes)
const VIOLATION_WINDOW = 600; // seconds (10 minutes)

const firewall = async (req, res, next) => {
  const clientIP =
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.ip;
    console.log('Incoming request from IP:', clientIP);

    
console.log(`Firewall check: IP = ${clientIP}, URL = ${req.originalUrl}`);
  
  // ✅ Bypass firewall for admin routes
  if (req.originalUrl.includes('/admin')) {
  console.log('Bypassing firewall for admin route');
  return next();
}


  const isBlocked = await redis.get(`blocked:${clientIP}`);
  if (isBlocked) {
    logRequest(req, 'BLOCKED');
    return res.status(429).json({
      error: 'Too many requests — IP temporarily blocked for 10 minutes.',
    });
  }

  const now = Date.now();
  const key = `requests:${clientIP}`;

  // Get recent timestamps within window
  let timestamps = await redis.lrange(key, 0, -1);
  timestamps = timestamps
    .map(ts => parseInt(ts))
    .filter(ts => now - ts < WINDOW_SIZE * 1000);

  if (timestamps.length >= MAX_REQUESTS) {
    const violationKey = `violations:${clientIP}`;
    const currentViolations = parseInt(await redis.get(violationKey)) || 0;
    const newViolations = currentViolations + 1;

    await redis.set(violationKey, newViolations, 'EX', VIOLATION_WINDOW);

    if (newViolations >= MAX_VIOLATIONS) {
      await redis.set(`blocked:${clientIP}`, 'true', 'EX', BLOCK_DURATION);
      logRequest(req, 'BLOCKED');
      return res.status(429).json({
        error: 'Too many requests — IP temporarily blocked for 10 minutes.',
        blocked: true,
      });
    }

    // Dynamic wait time
    const oldest = Math.min(...timestamps);
    const timeToWaitMs = WINDOW_SIZE * 1000 - (now - oldest);
    const timeToWaitSec = Math.ceil(timeToWaitMs / 1000);

    logRequest(req, 'RATE_LIMIT_EXCEEDED');
    return res.status(429).json({
      error: 'Rate limit exceeded — Slow down.',
      waitBeforeRetryMs: timeToWaitMs,
      message: `Wait at least ${timeToWaitSec} seconds to avoid being blocked.`,
      violations: newViolations,
    });
  }

  // Allow and store timestamp
  await redis.rpush(key, now);
  await redis.expire(key, WINDOW_SIZE);

  logRequest(req, 'ALLOWED');
  next();
};

module.exports = firewall;
