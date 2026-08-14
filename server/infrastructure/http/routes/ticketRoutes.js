import { Router } from 'express';

export function createTicketRoutes({ ticketController, authMiddleware }) {
  const router = Router();

  router.get('/tickets', authMiddleware, (req, res, next) => ticketController.getTickets(req, res, next));
  router.post('/tickets', (req, res, next) => ticketController.createTicket(req, res, next));
  router.patch('/tickets/:ticketId/close', authMiddleware, (req, res, next) => ticketController.closeTicket(req, res, next));
  router.post('/tickets/:ticketId/escalate', authMiddleware, (req, res, next) => ticketController.escalateTicket(req, res, next));

  return router;
}
