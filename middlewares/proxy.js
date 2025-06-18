const { createProxyMiddleware } = require('http-proxy-middleware');
const { checkHealth } = require('../utils/checkHealth'); // ✅ CORRECT


const userTargets = ['http://localhost:7001', 'http://localhost:7003', 'http://localhost:7005'];
const skillTargets = ['http://localhost:7002', 'http://localhost:7004', 'http://localhost:7006'];

let userIndex = 0;
let skillIndex = 0;
const failureCounts = {}; // For circuit breaker
const circuitBreakerState = {}; // Keeps track of open/closed state

const FAILURE_THRESHOLD = 3;
const COOLDOWN_TIME = 60 * 1000; // 1 minute cooldown

const markFailure = (target) => {
  failureCounts[target] = (failureCounts[target] || 0) + 1;
  if (failureCounts[target] >= FAILURE_THRESHOLD) {
    circuitBreakerState[target] = Date.now();
    console.warn(`🚫 Circuit opened for ${target}`);
  }
};

const isAvailable = (target) => {
  if (!circuitBreakerState[target]) return true;
  const lastFailTime = circuitBreakerState[target];
  if (Date.now() - lastFailTime > COOLDOWN_TIME) {
    delete circuitBreakerState[target];
    failureCounts[target] = 0;
    console.log(`✅ Circuit closed for ${target}`);
    return true;
  }
  return false;
};

const getHealthyTarget = async (targets, indexTracker, type) => {
  const maxRetries = targets.length;
  let count = 0;
  let index = type === 'user' ? userIndex : skillIndex;

  while (count < maxRetries) {
    const target = targets[index];
    if (isAvailable(target) && await checkHealth(target)) {
      if (type === 'user') userIndex = (index + 1) % targets.length;
      else skillIndex = (index + 1) % targets.length;
      return target;
    } else {
      markFailure(target);
    }
    index = (index + 1) % targets.length;
    count++;
  }
  return null; // All instances down
};

const createDynamicProxy = (targets, type, pathPrefix) => {
  return async (req, res, next) => {
    const target = await getHealthyTarget(targets, type === 'user' ? userIndex : skillIndex, type);

    if (!target) {
      return res.status(503).json({ error: 'Service Unavailable', message: `No healthy ${type} service instance available` });
    }

    console.log(`🔁 [${type.toUpperCase()}] Forwarding ${req.method} ${req.originalUrl} to ${target}`);

    return createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: { [`^/api/${pathPrefix}`]: '' },
      onError: (err, req, res) => {
        console.error(`❌ [${type.toUpperCase()}] Proxy error:`, err.message);
        markFailure(target);
        res.status(502).json({ error: 'Bad Gateway', message: err.message });
      }
    })(req, res, next);
  };
};

const userServiceProxy = createDynamicProxy(userTargets, 'user', 'user');
const skillServiceProxy = createDynamicProxy(skillTargets, 'skill', 'skill');

module.exports = { userServiceProxy, skillServiceProxy };
