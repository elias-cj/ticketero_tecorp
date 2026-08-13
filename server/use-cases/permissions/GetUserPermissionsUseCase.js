/**
 * GetUserPermissionsUseCase
 * 
 * Devuelve los permisos de un usuario agrupados por módulo.
 * Ejecuta un JOIN directo contra la base de datos para evitar
 * depender de la sintaxis PostgREST de relaciones anidadas.
 */
export class GetUserPermissionsUseCase {
  constructor({ dbQuery }) {
    this.dbQuery = dbQuery;
  }

  /**
   * @param {string[]} roleIds - IDs de los roles del usuario
   * @returns {Promise<Record<string, string[]>>} Mapa { módulo: [acciones] }
   */
  async execute(roleIds) {
    if (!roleIds || roleIds.length === 0) return {};

    const placeholders = roleIds.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `
      SELECT m.nombre AS modulo, a.nombre AS accion
      FROM public.permisos_rol pr
      JOIN public.permisos   p ON pr.permiso_id = p.id
      JOIN public.modulos    m ON p.modulo_id   = m.id
      JOIN public.acciones   a ON p.accion_id   = a.id
      WHERE pr.rol_id IN (${placeholders})
    `;

    const { rows } = await this.dbQuery(sql, roleIds);

    const merged = {};
    for (const row of rows) {
      const mod = row.modulo;
      const act = row.accion;
      if (!mod || !act) continue;
      if (!merged[mod]) merged[mod] = [];
      if (!merged[mod].includes(act)) merged[mod].push(act);
    }
    return merged;
  }
}
