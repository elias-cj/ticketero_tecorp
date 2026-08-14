import { IUserRepository } from '../../domain/ports/IUserRepository.js';

export class PgUserRepository extends IUserRepository {
  constructor(dbQuery) {
    super();
    this.dbQuery = dbQuery;
  }

  async findByEmail(email) {
    const { rows } = await this.dbQuery(
      `SELECT id, nombre_completo, email, password, esta_activo, debe_cambiar_password, url_avatar, telefono, creado_en 
       FROM public.usuarios 
       WHERE email = $1 AND esta_activo = TRUE 
       LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    return rows[0] || null;
  }

  async findById(id) {
    const { rows } = await this.dbQuery(
      'SELECT id, nombre_completo, email, telefono, url_avatar, esta_activo, debe_cambiar_password, creado_en FROM public.usuarios WHERE id = $1 LIMIT 1',
      [id]
    );
    return rows[0] || null;
  }

  async getUserRolesAndPermissions(userId) {
    const { rows } = await this.dbQuery(
      `
      SELECT r.id AS rol_id, r.nombre AS rol_nombre, r.descripcion AS rol_descripcion,
             m.nombre AS modulo, a.nombre AS accion
      FROM public.roles_usuario ru
      JOIN public.roles r ON r.id = ru.rol_id AND r.esta_activo = TRUE
      LEFT JOIN public.permisos_rol pr ON pr.rol_id = r.id
      LEFT JOIN public.permisos p ON p.id = pr.permiso_id
      LEFT JOIN public.modulos m ON m.id = p.modulo_id
      LEFT JOIN public.acciones a ON a.id = p.accion_id
      WHERE ru.usuario_id = $1
    `,
      [userId]
    );

    const roles = [];
    const seenRoles = new Set();
    const permissions = {};

    for (const row of rows) {
      if (!seenRoles.has(row.rol_id)) {
        roles.push({ id: row.rol_id, nombre: row.rol_nombre, descripcion: row.rol_descripcion });
        seenRoles.add(row.rol_id);
      }
      if (row.modulo && row.accion) {
        permissions[row.modulo] ||= [];
        if (!permissions[row.modulo].includes(row.accion)) {
          permissions[row.modulo].push(row.accion);
        }
      }
    }

    return { roles, permissions };
  }

  async checkIsSuperAdmin(userId) {
    const { rows } = await this.dbQuery(
      `
      SELECT EXISTS (
        SELECT 1
        FROM public.roles_usuario ru
        JOIN public.roles r ON r.id = ru.rol_id
        WHERE ru.usuario_id = $1
          AND r.esta_activo = TRUE
          AND LOWER(TRIM(r.nombre)) IN ('administrador supremo', 'superadmin', 'superadm', 'supremo')
      ) AS is_super_admin
    `,
      [userId]
    );
    return Boolean(rows[0]?.is_super_admin);
  }
}
