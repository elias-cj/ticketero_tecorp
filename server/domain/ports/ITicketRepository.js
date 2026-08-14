/**
 * @interface ITicketRepository
 * Definición del contrato de persistencia para la entidad Ticket.
 */
export class ITicketRepository {
  async findById(id) {
    throw new Error('Método no implementado');
  }

  async findPaging({ filters, pagination, order }) {
    throw new Error('Método no implementado');
  }

  async create(ticketData) {
    throw new Error('Método no implementado');
  }

  async update(id, ticketData) {
    throw new Error('Método no implementado');
  }

  async closeTicket(id, { solucion_id, descripcion_solucion, usuario_id }) {
    throw new Error('Método no implementado');
  }

  async escalateTicket(id, { reason, usuario_id }) {
    throw new Error('Método no implementado');
  }
}
