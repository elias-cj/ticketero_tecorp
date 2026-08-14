import { NotFoundError, ValidationError } from '../../domain/errors/DomainError.js';

export class EscalateTicketUseCase {
  constructor({ ticketRepository }) {
    this.ticketRepository = ticketRepository;
  }

  async execute({ ticketId, reason, usuario_id }) {
    if (!ticketId) {
      throw new ValidationError('El ID del ticket es obligatorio.');
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      throw new ValidationError('El motivo de escalado es obligatorio (mínimo 3 caracteres).');
    }

    const existing = await this.ticketRepository.findById(ticketId);
    if (!existing) {
      throw new NotFoundError(`El ticket con ID ${ticketId} no existe.`);
    }

    const escalatedTicket = await this.ticketRepository.escalateTicket(ticketId, {
      reason: reason.trim(),
      usuario_id: usuario_id || null,
    });

    return escalatedTicket;
  }
}
