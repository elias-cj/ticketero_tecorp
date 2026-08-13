import { NotFoundError, ValidationError } from '../../domain/errors/DomainError.js';

export class CloseTicketUseCase {
  constructor({ ticketRepository }) {
    this.ticketRepository = ticketRepository;
  }

  async execute({ ticketId, solucion_id, descripcion_solucion, usuario_id }) {
    if (!descripcion_solucion || descripcion_solucion.trim().length < 5) {
      throw new ValidationError('Se requiere una descripción de solución obligatoria al cerrar el ticket (mínimo 5 caracteres).');
    }

    const existing = await this.ticketRepository.findById(ticketId);
    if (!existing) {
      throw new NotFoundError(`El ticket con ID ${ticketId} no existe.`);
    }

    const updated = await this.ticketRepository.closeTicket(ticketId, {
      solucion_id: solucion_id || null,
      descripcion_solucion: descripcion_solucion.trim(),
      usuario_id,
    });

    return updated;
  }
}
