import express from 'express';
import cors from 'cors';
import { dbQuery } from '../../database/db.js';
import { TokenService } from '../../security/TokenService.js';
import { PgUserRepository } from '../../../adapters/repositories/PgUserRepository.js';
import { PgTicketRepository } from '../../../adapters/repositories/PgTicketRepository.js';
import { AuthenticateUserUseCase } from '../../../use-cases/auth/AuthenticateUserUseCase.js';
import { CreateTicketUseCase } from '../../../use-cases/tickets/CreateTicketUseCase.js';
import { GetTicketsPagingUseCase } from '../../../use-cases/tickets/GetTicketsPagingUseCase.js';
import { CloseTicketUseCase } from '../../../use-cases/tickets/CloseTicketUseCase.js';
import { EscalateTicketUseCase } from '../../../use-cases/tickets/EscalateTicketUseCase.js';
import { AuthController } from '../../../adapters/controllers/AuthController.js';
import { TicketController } from '../../../adapters/controllers/TicketController.js';
import { createAuthMiddleware } from '../../middlewares/AuthMiddleware.js';
import { createRateLimiter } from '../../middlewares/RateLimiterMiddleware.js';
import { errorHandlerMiddleware } from '../../middlewares/ErrorHandlerMiddleware.js';
import { createAuthRoutes } from './authRoutes.js';
import { createTicketRoutes } from './ticketRoutes.js';
import { createGenericRoutes } from './genericRoutes.js';

export function createExpressApp() {
  const app = express();

  // Configuración para proxies inversos
  app.set('trust proxy', 1);

  // CORS Configuration
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredOrigins = (process.env.CLIENT_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = configuredOrigins.length > 0
    ? configuredOrigins
    : (isProduction ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080']);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || !isProduction) {
        return callback(null, true);
      }
      return callback(new Error('Acceso no permitido por política CORS'));
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Inyección de Dependencias
  const tokenService = new TokenService();
  const userRepository = new PgUserRepository(dbQuery);
  const ticketRepository = new PgTicketRepository(dbQuery);

  const authenticateUserUseCase = new AuthenticateUserUseCase({ userRepository, tokenService });
  const createTicketUseCase = new CreateTicketUseCase({ ticketRepository });
  const getTicketsPagingUseCase = new GetTicketsPagingUseCase({ ticketRepository });
  const closeTicketUseCase = new CloseTicketUseCase({ ticketRepository });
  const escalateTicketUseCase = new EscalateTicketUseCase({ ticketRepository });

  const authController = new AuthController({ authenticateUserUseCase });
  const ticketController = new TicketController({
    createTicketUseCase,
    getTicketsPagingUseCase,
    closeTicketUseCase,
    escalateTicketUseCase,
  });

  const authMiddleware = createAuthMiddleware({ tokenService, userRepository });
  const authRateLimiter = createRateLimiter({ windowMs: 60000, max: 10, keyPrefix: 'auth-rl' });
  const apiRateLimiter = createRateLimiter({ windowMs: 60000, max: 200, keyPrefix: 'api-rl' });

  app.use(apiRateLimiter);

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

  // Montaje de rutas
  app.use('/auth', createAuthRoutes({ authController, authMiddleware, rateLimiter: authRateLimiter }));
  app.use('/api', createTicketRoutes({ ticketController, authMiddleware }));
  app.use('/', createGenericRoutes({ authMiddleware, tokenService }));

  // Middleware de Manejo de Errores
  app.use(errorHandlerMiddleware);

  return app;
}
