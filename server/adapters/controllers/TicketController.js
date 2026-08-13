export class TicketController {
  constructor({ createTicketUseCase, getTicketsPagingUseCase, closeTicketUseCase }) {
    this.createTicketUseCase = createTicketUseCase;
    this.getTicketsPagingUseCase = getTicketsPagingUseCase;
    this.closeTicketUseCase = closeTicketUseCase;
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

      return res.json(result.data); // Mantiene compatibilidad con el array devuelto si la app espera array
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
}
