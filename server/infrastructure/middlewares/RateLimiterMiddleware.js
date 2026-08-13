export function createRateLimiter({ windowMs = 60000, max = 100, keyPrefix = 'rl' }) {
  const attempts = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts) {
      if (entry.resetAt <= now) attempts.delete(key);
    }
  }, windowMs);
  cleanup.unref();

  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const current = attempts.get(key);

    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      return res.status(429).json({ code: 'TOO_MANY_REQUESTS', message: 'Demasiadas solicitudes. Intente nuevamente más tarde.' });
    }

    return next();
  };
}
