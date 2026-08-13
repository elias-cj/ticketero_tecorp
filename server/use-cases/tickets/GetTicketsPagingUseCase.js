export class GetTicketsPagingUseCase {
  constructor({ ticketRepository }) {
    this.ticketRepository = ticketRepository;
  }

  async execute({ filters = {}, page = 1, pageSize = 25, order = 'creado_en.desc' }) {
    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const requestedSize = Number.parseInt(pageSize, 10) || 25;
    // Límite máximo estricto de 100 registros por página para proteger la memoria RAM
    const safePageSize = Math.min(Math.max(1, requestedSize), 100);

    const result = await this.ticketRepository.findPaging({
      filters,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        offset: (safePage - 1) * safePageSize,
      },
      order,
    });

    return {
      data: result.data,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / safePageSize) || 1,
      },
    };
  }
}
