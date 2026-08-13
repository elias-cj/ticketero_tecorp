import { describe, it, expect, vi } from 'vitest';
import { CreateTicketUseCase } from '../../../../server/use-cases/tickets/CreateTicketUseCase.js';

describe('CreateTicketUseCase (Unit Tests)', () => {
  it('debe crear un ticket correctamente validando la entidad de dominio', async () => {
    const mockTicketRepository = {
      create: vi.fn().mockImplementation(async (ticket) => ({
        ...ticket,
        id: 'generated-uuid-ticket-1',
        numero_ticket: 'TCK-00001',
      })),
      findById: vi.fn(),
      findPaging: vi.fn(),
      closeTicket: vi.fn(),
    };

    const useCase = new CreateTicketUseCase({ ticketRepository: mockTicketRepository });

    const inputData = {
      titulo: 'Error de Red VPN',
      descripcion: 'No hay acceso al servidor de archivos.',
      centro_contacto_id: '55fb75f5-7061-4bdb-85cb-6f58f5d7ea57',
      tipo_problema_id: '25f09a2a-6f96-4bf3-8184-7fe13da2df1c',
      nombre_solicitante: 'Carlos Bolivia',
      cantidad_afectados: '15',
    };

    const result = await useCase.execute(inputData);

    expect(mockTicketRepository.create).toHaveBeenCalledOnce();
    expect(result.id).toBe('generated-uuid-ticket-1');
    expect(result.titulo).toBe('Error de Red VPN');
    expect(result.cantidad_afectados).toBe(15);
  });

  it('debe lanzar error de validación de dominio si el título es demasiado corto', async () => {
    const mockTicketRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findPaging: vi.fn(),
      closeTicket: vi.fn(),
    };

    const useCase = new CreateTicketUseCase({ ticketRepository: mockTicketRepository });

    await expect(useCase.execute({ titulo: 'Ab' })).rejects.toThrow('El título del ticket debe tener al menos 3 caracteres.');
  });
});
