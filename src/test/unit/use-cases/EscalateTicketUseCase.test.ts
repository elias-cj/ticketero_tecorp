import { describe, it, expect, vi } from 'vitest';
import { EscalateTicketUseCase } from '../../../../server/use-cases/tickets/EscalateTicketUseCase.js';
import { ValidationError, NotFoundError } from '../../../../server/domain/errors/DomainError.js';

describe('EscalateTicketUseCase (Unit Tests)', () => {
  it('debe lanzar ValidationError si falta el ID o motivo', async () => {
    const mockRepo = { findById: vi.fn(), escalateTicket: vi.fn() };
    const useCase = new EscalateTicketUseCase({ ticketRepository: mockRepo as any });

    await expect(useCase.execute({ ticketId: '', reason: 'Falla técnica', usuario_id: 'u1' }))
      .rejects.toThrow(ValidationError);

    await expect(useCase.execute({ ticketId: 't1', reason: '  ', usuario_id: 'u1' }))
      .rejects.toThrow(ValidationError);
  });

  it('debe lanzar NotFoundError si el ticket original no existe', async () => {
    const mockRepo = {
      findById: vi.fn().mockResolvedValue(null),
      escalateTicket: vi.fn(),
    };
    const useCase = new EscalateTicketUseCase({ ticketRepository: mockRepo as any });

    await expect(useCase.execute({ ticketId: 'non-existent', reason: 'Falla grave de red', usuario_id: 'u1' }))
      .rejects.toThrow(NotFoundError);
  });

  it('debe llamar a escalateTicket del repositorio y retornar el resultado cuando todo es válido', async () => {
    const mockCreated = { id: 'new-ticket-it', titulo: 'Ticket escalado', escalados: true };
    const mockRepo = {
      findById: vi.fn().mockResolvedValue({ id: 't1', titulo: 'Problema en router' }),
      escalateTicket: vi.fn().mockResolvedValue(mockCreated),
    };
    const useCase = new EscalateTicketUseCase({ ticketRepository: mockRepo as any });

    const result = await useCase.execute({
      ticketId: 't1',
      reason: 'Requiere soporte de infraestructura nivel 2',
      usuario_id: 'u1',
    });

    expect(mockRepo.findById).toHaveBeenCalledWith('t1');
    expect(mockRepo.escalateTicket).toHaveBeenCalledWith('t1', {
      reason: 'Requiere soporte de infraestructura nivel 2',
      usuario_id: 'u1',
    });
    expect(result).toEqual(mockCreated);
  });
});
