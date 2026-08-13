// Cache en memoria para permisos de usuarios con TTL de 60 segundos
const userPermissionCache = new Map();
const CACHE_TTL_MS = 60000;

export function createAuthMiddleware({ tokenService, userRepository }) {
  return async (req, res, next) => {
    const authorization = req.headers.authorization || req.headers['x-access-token'];
    const token = typeof authorization === 'string' && authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : authorization;

    if (!token) {
      if (req.isPublicEndpoint) return next();
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Autenticación requerida.' });
    }

    const payload = tokenService.verify(token);
    if (!payload || !payload.sub) {
      if (req.isPublicEndpoint) return next();
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Sesión no válida o expirada.' });
    }

    try {
      const userId = payload.sub;
      const now = Date.now();
      const cached = userPermissionCache.get(userId);

      let userAccess;
      if (cached && cached.expiresAt > now) {
        userAccess = cached.access;
      } else {
        const userRow = await userRepository.findById(userId);
        if (!userRow || !userRow.esta_activo) {
          userPermissionCache.delete(userId);
          if (req.isPublicEndpoint) return next();
          return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Usuario inactivo o no encontrado.' });
        }

        const isSuperAdmin = await userRepository.checkIsSuperAdmin(userId);
        const { roles, permissions } = await userRepository.getUserRolesAndPermissions(userId);

        userAccess = {
          ...userRow,
          is_super_admin: isSuperAdmin,
          roles,
          permissions,
        };

        userPermissionCache.set(userId, {
          access: userAccess,
          expiresAt: now + CACHE_TTL_MS,
        });
      }

      req.user = userAccess;
      return next();
    } catch (error) {
      console.error('Error al validar sesión:', error.message);
      if (req.isPublicEndpoint) return next();
      return res.status(503).json({ message: 'Error interno al validar credenciales.' });
    }
  };
}

export function clearUserCache(userId) {
  if (userId) userPermissionCache.delete(userId);
  else userPermissionCache.clear();
}
