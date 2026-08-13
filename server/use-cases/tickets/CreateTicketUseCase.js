import { Ticket } from '../../domain/entities/Ticket.js';

export class CreateTicketUseCase {
  constructor({ ticketRepository }) {
    this.ticketRepository = ticketRepository;
  }

  async execute(ticketPayload) {
    const entity = new Ticket(ticketPayload);
    const createdTicket = await this.ticketRepository.create(entity);
    return createdTicket;
  }
}
