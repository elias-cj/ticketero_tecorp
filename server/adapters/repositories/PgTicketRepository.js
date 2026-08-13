import { ITicketRepository } from '../../domain/ports/ITicketRepository.js';

export class PgTicketRepository extends ITicketRepository {
  constructor(dbQuery) {
    super();
    this.dbQuery = dbQuery;
  }

  async findById(id) {
    const { rows } = await this.dbQuery(
      `SELECT t.*, 
              st.nombre AS estado_nombre, 
              tp.nombre AS tipo_problema_nombre, 
              cc.nombre AS centro_contacto_nombre,
              u.nombre_completo AS tecnico_nombre
       FROM public.tickets t
       LEFT JOIN public.estados_ticket st ON st.id = t.estado_id
       LEFT JOIN public.tipos_problema tp ON tp.id = t.tipo_problema_id
       LEFT JOIN public.call_centers cc ON cc.id = t.centro_contacto_id
       LEFT JOIN public.usuarios u ON u.id = t.tecnico_asignado_id
       WHERE t.id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  async findPaging({ filters = {}, pagination, order = 'creado_en DESC' }) {
    const values = [];
    const whereClauses = [];

    if (filters.estado_id) {
      values.push(filters.estado_id);
      whereClauses.push(`t.estado_id = $${values.length}`);
    }
    if (filters.centro_contacto_id) {
      values.push(filters.centro_contacto_id);
      whereClauses.push(`t.centro_contacto_id = $${values.length}`);
    }
    if (filters.tecnico_asignado_id) {
      values.push(filters.tecnico_asignado_id);
      whereClauses.push(`t.tecnico_asignado_id = $${values.length}`);
    }
    if (filters.search) {
      values.push(`%${filters.search}%`);
      whereClauses.push(`(t.titulo ILIKE $${values.length} OR t.numero_ticket ILIKE $${values.length} OR t.nombre_solicitante ILIKE $${values.length})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await this.dbQuery(
      `SELECT COUNT(*)::int AS total FROM public.tickets t ${whereSql}`,
      values
    );
    const total = countResult.rows[0]?.total || 0;

    const dataValues = [...values, pagination.pageSize, pagination.offset];
    const limitIndex = values.length + 1;
    const offsetIndex = values.length + 2;

    const querySql = `
      SELECT t.*, 
             st.nombre AS estado_nombre, 
             tp.nombre AS tipo_problema_nombre, 
             cc.nombre AS centro_contacto_nombre,
             u.nombre_completo AS tecnico_nombre
      FROM public.tickets t
      LEFT JOIN public.estados_ticket st ON st.id = t.estado_id
      LEFT JOIN public.tipos_problema tp ON tp.id = t.tipo_problema_id
      LEFT JOIN public.call_centers cc ON cc.id = t.centro_contacto_id
      LEFT JOIN public.usuarios u ON u.id = t.tecnico_asignado_id
      ${whereSql}
      ORDER BY t.creado_en DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const { rows } = await this.dbQuery(querySql, dataValues);

    return { data: rows, total };
  }

  async create(ticket) {
    const query = `
      INSERT INTO public.tickets (
        titulo, descripcion, centro_contacto_id, tipo_problema_id,
        nombre_solicitante, extension, puesto_trabajo, modalidad_trabajo,
        ip_vpn, cantidad_afectados, estado_id, creado_en, actualizado_en
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
              (SELECT id FROM public.estados_ticket WHERE LOWER(nombre) = 'abierto' LIMIT 1),
              NOW(), NOW())
      RETURNING *
    `;

    const values = [
      ticket.titulo,
      ticket.descripcion,
      ticket.centro_contacto_id,
      ticket.tipo_problema_id,
      ticket.nombre_solicitante,
      ticket.extension,
      ticket.puesto_trabajo,
      ticket.modalidad_trabajo,
      ticket.ip_vpn,
      ticket.cantidad_afectados !== null ? String(ticket.cantidad_afectados) : null,
    ];

    const { rows } = await this.dbQuery(query, values);
    return rows[0];
  }

  async closeTicket(id, { solucion_id, descripcion_solucion, usuario_id }) {
    const query = `
      UPDATE public.tickets
      SET estado_id = (SELECT id FROM public.estados_ticket WHERE LOWER(nombre) = 'cerrado' LIMIT 1),
          solucion_id = $2,
          descripcion_solucion = $3,
          fecha_cierre = NOW(),
          actualizado_en = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await this.dbQuery(query, [id, solucion_id, descripcion_solucion]);
    return rows[0] || null;
  }
}
