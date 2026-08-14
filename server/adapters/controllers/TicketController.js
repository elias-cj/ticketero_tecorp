export class TicketController {
  constructor({ createTicketUseCase, getTicketsPagingUseCase, closeTicketUseCase, escalateTicketUseCase }) {
    this.createTicketUseCase = createTicketUseCase;
    this.getTicketsPagingUseCase = getTicketsPagingUseCase;
    this.closeTicketUseCase = closeTicketUseCase;
    this.escalateTicketUseCase = escalateTicketUseCase;
  }

  async getTickets(req, res, next) {
    try {
      const { page, pageSize, order, estado_id, centro_contacto_id, tecnico_asignado_id, search } = req.query;

      const result = await this.getTicketsPagingUseCase.execute({
        filters: {
          estado_id,
          centro_contacto_id,
          tecnico_asignado_id,
          search,
        },
        page,
        pageSize,
        order,
      });

      return res.json({
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async createTicket(req, res, next) {
    try {
      const created = await this.createTicketUseCase.execute(req.body);
      return res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }

  async closeTicket(req, res, next) {
    try {
      const { ticketId } = req.params;
      const { solucion_id, descripcion_solucion } = req.body;
      const usuario_id = req.user?.id;

      const updated = await this.closeTicketUseCase.execute({
        ticketId,
        solucion_id,
        descripcion_solucion,
        usuario_id,
      });

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  async escalateTicket(req, res, next) {
    try {
      const { ticketId } = req.params;
      const { reason } = req.body;
      const usuario_id = req.user?.id;

      const escalated = await this.escalateTicketUseCase.execute({
        ticketId,
        reason,
        usuario_id,
      });

      return res.status(201).json(escalated);
    } catch (error) {
      next(error);
    }
  }
}
