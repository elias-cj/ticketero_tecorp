import { Router } from 'express';

export function createAuthRoutes({ authController, authMiddleware, rateLimiter }) {
  const router = Router();

  router.post('/login', rateLimiter, (req, res, next) => authController.login(req, res, next));
  router.get('/me', authMiddleware, (req, res, next) => authController.me(req, res, next));

  return router;
}
