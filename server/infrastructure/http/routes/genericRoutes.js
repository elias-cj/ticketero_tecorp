import { Router } from 'express';
import { dbQuery } from '../../database/db.js';
import { GetUserPermissionsUseCase } from '../../../use-cases/permissions/GetUserPermissionsUseCase.js';

const ALLOWED_TABLES = new Set([
  'tickets', 'tareas', 'asignados_tarea', 'horarios', 'turnos', 'usuarios',
  'detalles_tecnico', 'roles_usuario', 'roles', 'permisos', 'permisos_rol',
  'modulos', 'acciones', 'call_centers', 'tipos_problema', 'categorias_problema',
  'estados_ticket', 'prioridades_ticket', 'soluciones', 'inventario', 'licencias',
  'informacion_empresa', 'registros_auditoria', 'logs_auditoria', 'faqs'
]);

const PUBLIC_TABLES = new Set([
  'call_centers', 'tipos_problema', 'categorias_problema', 'estados_ticket',
  'prioridades_ticket', 'informacion_empresa', 'faqs'
]);

export function createGenericRoutes({ authMiddleware, tokenService }) {
  const router = Router();
  const permissionsUseCase = new GetUserPermissionsUseCase({ dbQuery });

  // ── RPC Handler (/rpc/:fn y /rest/v1/rpc/:fn) ──────────────────────────────

  const handleRpc = async (req, res) => {
    const fnName = req.params.fn;

    // Intercept: RPC manejado directamente en el servidor (no PL/pgSQL)
    if (fnName === 'obtener_permisos_usuario') {
      try {
        const roleIds = req.body?.p_role_ids;
        if (!Array.isArray(roleIds) || roleIds.length === 0) {
          return res.json({});
        }
        const result = await permissionsUseCase.execute(roleIds);
        return res.json(result);
      } catch (error) {
        console.error('Error al obtener permisos:', error.message);
        return res.status(400).json({ message: error.message });
      }
    }

    if (!/^[a-z_][a-z0-9_]*$/.test(fnName)) {
      return res.status(400).json({ message: 'Procedimiento almacenado no válido.' });
    }

    try {
      const body = req.body || {};
      const keys = Object.keys(body);

      let query;
      let values = [];
      if (keys.length === 0) {
        query = `SELECT public.${fnName}() AS result`;
      } else {
        const namedParams = keys.map((key, i) => `${key} => $${i + 1}`).join(', ');
        query = `SELECT public.${fnName}(${namedParams}) AS result`;
        values = keys.map((k) => body[k]);
      }

      const { rows } = await dbQuery(query, values);
      const rawResult = rows[0]?.result !== undefined ? rows[0].result : (rows[0] || rows);

      // Si es login_seguro exitoso, inyectar el token JWT firmado por TokenService
      if (fnName === 'login_seguro' && rawResult && rawResult.success && rawResult.user) {
        const token = tokenService.sign({
          sub: rawResult.user.id,
          email: rawResult.user.email,
        });
        rawResult.token = token;
        rawResult.access_token = token;
      }

      return res.json(rawResult);
    } catch (error) {
      console.error(`Error al ejecutar RPC ${fnName}:`, error.message);
      return res.status(400).json({ message: error.message || 'Error al ejecutar procedimiento.' });
    }
  };

  const rpcAuthCheck = (req, res, next) => {
    if (['login_seguro', 'obtener_metricas_dashboard'].includes(req.params.fn)) {
      req.isPublicEndpoint = true;
    }
    return authMiddleware(req, res, next);
  };

  router.post('/rest/v1/rpc/:fn', rpcAuthCheck, handleRpc);
  router.post('/rpc/:fn', rpcAuthCheck, handleRpc);

  // ── Auth check para tablas ────────────────────────────────────────────────────

  const checkTableAuth = (req, res, next) => {
    const table = req.params.table;
    if (PUBLIC_TABLES.has(table) && req.method === 'GET') {
      req.isPublicEndpoint = true;
    }
    return authMiddleware(req, res, next);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────

  /** Parsea filtros PostgREST del query string y devuelve { whereClauses, values } */
  const parseFilters = (query) => {
    const whereClauses = [];
    const values = [];

    const entries = [];
    for (const [key, rawVal] of Object.entries(query)) {
      if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) continue;
      if (!/^[a-z_][a-z0-9_]*$/.test(key)) continue;

      if (Array.isArray(rawVal)) {
        for (const item of rawVal) {
          entries.push([key, String(item)]);
        }
      } else {
        entries.push([key, String(rawVal)]);
      }
    }

    for (const [key, val] of entries) {
      if (val.startsWith('eq.')) {
        values.push(val.slice(3));
        whereClauses.push(`"${key}" = $${values.length}`);
      } else if (val.startsWith('neq.')) {
        values.push(val.slice(4));
        whereClauses.push(`"${key}" != $${values.length}`);
      } else if (val.startsWith('ilike.')) {
        values.push(val.slice(6));
        whereClauses.push(`"${key}" ILIKE $${values.length}`);
      } else if (val.startsWith('in.')) {
        const items = val.slice(3).replace(/^\(/, '').replace(/\)$/, '').split(',')
          .map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
        if (items.length > 0) {
          const placeholders = items.map((_, i) => `$${values.length + i + 1}`).join(', ');
          values.push(...items);
          whereClauses.push(`"${key}" IN (${placeholders})`);
        }
      } else if (val.startsWith('gte.')) {
        values.push(val.slice(4));
        whereClauses.push(`"${key}" >= $${values.length}`);
      } else if (val.startsWith('gt.')) {
        values.push(val.slice(3));
        whereClauses.push(`"${key}" > $${values.length}`);
      } else if (val.startsWith('lte.')) {
        values.push(val.slice(4));
        whereClauses.push(`"${key}" <= $${values.length}`);
      } else if (val.startsWith('lt.')) {
        values.push(val.slice(3));
        whereClauses.push(`"${key}" < $${values.length}`);
      } else if (val.startsWith('is.')) {
        const isVal = val.slice(3);
        if (isVal === 'null') whereClauses.push(`"${key}" IS NULL`);
        else if (isVal === 'true') whereClauses.push(`"${key}" IS TRUE`);
        else if (isVal === 'false') whereClauses.push(`"${key}" IS FALSE`);
      } else {
        values.push(val);
        whereClauses.push(`"${key}" = $${values.length}`);
      }
    }
    return { whereClauses, values };
  };

  /** Parsea el parámetro 'order' de PostgREST y devuelve una cláusula ORDER BY */
  const parseOrder = (orderParam) => {
    if (!orderParam) return '';
    const parts = String(orderParam).split(',').map((seg) => {
      const [col, ...mods] = seg.trim().split('.');
      if (!/^[a-z_][a-z0-9_]*$/.test(col)) return null;
      const dir = mods.includes('desc') ? 'DESC' : 'ASC';
      const nulls = mods.includes('nullsfirst') ? 'NULLS FIRST'
        : (mods.includes('nullslast') ? 'NULLS LAST' : '');
      return `"${col}" ${dir}${nulls ? ' ' + nulls : ''}`;
    }).filter(Boolean);
    return parts.length > 0 ? `ORDER BY ${parts.join(', ')}` : '';
  };

  const getSelectQuery = (table) => {
    switch (table) {
      case 'tickets':
        return `
          SELECT t.*,
            (SELECT row_to_json(st.*) FROM (SELECT nombre FROM public.estados_ticket WHERE id = t.estado_id) st) AS estados_ticket,
            (SELECT row_to_json(tp.*) FROM (SELECT nombre FROM public.tipos_problema WHERE id = t.tipo_problema_id) tp) AS tipos_problema,
            (SELECT row_to_json(cc.*) FROM (SELECT id, nombre, codigo, pais FROM public.call_centers WHERE id = t.centro_contacto_id) cc) AS call_centers,
            (SELECT row_to_json(u.*) FROM (SELECT nombre_completo, telefono FROM public.usuarios WHERE id = t.solicitante_id) u) AS solicitante,
            (SELECT row_to_json(u2.*) FROM (SELECT nombre_completo, telefono FROM public.usuarios WHERE id = t.tecnico_asignado_id) u2) AS tecnico,
            (SELECT row_to_json(u2.*) FROM (SELECT nombre_completo, telefono FROM public.usuarios WHERE id = t.tecnico_asignado_id) u2) AS tecnico_asignado,
            (SELECT row_to_json(s.*) FROM (SELECT titulo, descripcion FROM public.soluciones WHERE id = t.solucion_id) s) AS soluciones
          FROM public.tickets t
        `;
      case 'tipos_problema':
        return `
          SELECT tp.*,
            (SELECT row_to_json(cp.*) FROM (SELECT id, nombre FROM public.categorias_problema WHERE id = tp.categoria_id) cp) AS categorias_problema
          FROM public.tipos_problema tp
        `;
      case 'tareas':
        return `
          SELECT tr.*,
            (SELECT COALESCE(json_agg(at.*), '[]'::json) FROM (SELECT tecnico_id, asignado_en FROM public.asignados_tarea WHERE tarea_id = tr.id) at) AS asignados_tarea,
            (SELECT row_to_json(st.*) FROM (SELECT nombre FROM public.estados_ticket WHERE id = tr.estado_id) st) AS estados_ticket
          FROM public.tareas tr
        `;
      case 'horarios':
        return `
          SELECT h.*,
            (SELECT row_to_json(u.*) FROM (SELECT nombre_completo FROM public.usuarios WHERE id = h.tecnico_id) u) AS usuarios,
            (SELECT row_to_json(tu.*) FROM (SELECT nombre, hora_inicio, hora_fin FROM public.turnos WHERE id = h.turno_id) tu) AS turnos
          FROM public.horarios h
        `;
      case 'permisos':
        return `
          SELECT p.*,
            (SELECT row_to_json(m.*) FROM (SELECT id, nombre FROM public.modulos WHERE id = p.modulo_id) m) AS modulos,
            (SELECT row_to_json(a.*) FROM (SELECT id, nombre FROM public.acciones WHERE id = p.accion_id) a) AS acciones
          FROM public.permisos p
        `;
      case 'usuarios':
        return `
          SELECT u.*,
            (SELECT COALESCE(json_agg(ru.*), '[]'::json) FROM (
              SELECT ru_inner.usuario_id, ru_inner.rol_id, ru_inner.asignado_en,
                     (SELECT row_to_json(r.*) FROM (SELECT id, nombre, descripcion, esta_activo FROM public.roles WHERE id = ru_inner.rol_id) r) AS roles
              FROM public.roles_usuario ru_inner WHERE ru_inner.usuario_id = u.id
            ) ru) AS roles_usuario
          FROM public.usuarios u
        `;
      default:
        return `SELECT tbl.* FROM public."${table}" tbl`;
    }
  };

  // ── GET (SELECT) ──────────────────────────────────────────────────────────────

  const handleGetTable = async (req, res) => {
    const table = req.params.table;
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(404).json({ message: 'Recurso no disponible.' });
    }

    try {
      let limit = 1000;
      let offset = 0;

      if (req.query.limit) {
        limit = Math.min(Math.max(1, Number.parseInt(req.query.limit, 10)), 10000);
      }
      if (req.query.offset) {
        offset = Math.max(0, Number.parseInt(req.query.offset, 10));
      }

      const rangeHeader = req.headers['range'] || req.headers['content-range'];
      if (rangeHeader && typeof rangeHeader === 'string') {
        const match = rangeHeader.match(/(\d+)-(\d+)/);
        if (match) {
          const start = Number.parseInt(match[1], 10);
          const end = Number.parseInt(match[2], 10);
          if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
            offset = start;
            limit = end - start + 1;
          }
        }
      }

      const { whereClauses, values } = parseFilters(req.query);
      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const orderSql = parseOrder(req.query.order);

      values.push(limit);
      const limitIdx = values.length;
      values.push(offset);
      const offsetIdx = values.length;

      const baseQuery = getSelectQuery(table);
      const querySql = `SELECT sub.* FROM (${baseQuery}) sub ${whereSql} ${orderSql} LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

      const { rows } = await dbQuery(querySql, values);
      return res.json(rows);
    } catch (error) {
      console.error(`Error al consultar tabla ${table}:`, error.message);
      return res.status(400).json({ message: error.message });
    }
  };

  // ── POST (INSERT) ─────────────────────────────────────────────────────────────

  const handlePostTable = async (req, res) => {
    const table = req.params.table;
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(404).json({ message: 'Recurso no disponible.' });
    }

    try {
      const rows = Array.isArray(req.body) ? req.body : [req.body];
      if (rows.length === 0) return res.status(400).json({ message: 'Cuerpo vacío.' });

      const allResults = [];
      for (const row of rows) {
        const keys = Object.keys(row).filter((k) => /^[a-z_][a-z0-9_]*$/.test(k));
        if (keys.length === 0) continue;

        const columns = keys.map((k) => `"${k}"`).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map((k) => row[k]);

        const sql = `INSERT INTO public."${table}" (${columns}) VALUES (${placeholders}) RETURNING *`;
        const { rows: inserted } = await dbQuery(sql, values);
        allResults.push(...inserted);
      }

      return res.status(201).json(allResults);
    } catch (error) {
      console.error(`Error al insertar en ${table}:`, error.message);
      return res.status(400).json({ message: error.message });
    }
  };

  // ── PATCH (UPDATE) ────────────────────────────────────────────────────────────

  const handlePatchTable = async (req, res) => {
    const table = req.params.table;
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(404).json({ message: 'Recurso no disponible.' });
    }

    try {
      const body = req.body || {};
      const updateKeys = Object.keys(body).filter((k) => /^[a-z_][a-z0-9_]*$/.test(k));
      if (updateKeys.length === 0) return res.status(400).json({ message: 'Sin campos para actualizar.' });

      const setClauses = [];
      const values = [];
      for (const key of updateKeys) {
        values.push(body[key]);
        setClauses.push(`"${key}" = $${values.length}`);
      }

      const { whereClauses, values: filterValues } = parseFilters(req.query);
      // Re-index filter placeholders to continue after SET values
      const reindexedWhere = whereClauses.map((clause) => {
        return clause.replace(/\$(\d+)/g, (_, num) => `$${Number(num) + values.length}`);
      });
      values.push(...filterValues);

      if (reindexedWhere.length === 0) {
        return res.status(400).json({ message: 'Se requieren filtros para UPDATE (ej: ?id=eq.xxx).' });
      }

      const sql = `UPDATE public."${table}" SET ${setClauses.join(', ')} WHERE ${reindexedWhere.join(' AND ')} RETURNING *`;
      const { rows } = await dbQuery(sql, values);
      return res.json(rows);
    } catch (error) {
      console.error(`Error al actualizar ${table}:`, error.message);
      return res.status(400).json({ message: error.message });
    }
  };

  // ── DELETE ────────────────────────────────────────────────────────────────────

  const handleDeleteTable = async (req, res) => {
    const table = req.params.table;
    if (!ALLOWED_TABLES.has(table)) {
      return res.status(404).json({ message: 'Recurso no disponible.' });
    }

    try {
      const { whereClauses, values } = parseFilters(req.query);
      if (whereClauses.length === 0) {
        return res.status(400).json({ message: 'Se requieren filtros para DELETE (ej: ?id=eq.xxx).' });
      }

      const sql = `DELETE FROM public."${table}" WHERE ${whereClauses.join(' AND ')} RETURNING *`;
      const { rows } = await dbQuery(sql, values);
      return res.status(200).json(rows);
    } catch (error) {
      console.error(`Error al eliminar en ${table}:`, error.message);
      return res.status(400).json({ message: error.message });
    }
  };

  // ── Montar rutas REST genéricas ───────────────────────────────────────────────

  router.get('/rest/v1/:table', checkTableAuth, handleGetTable);
  router.get('/api/:table', checkTableAuth, handleGetTable);

  router.post('/rest/v1/:table', checkTableAuth, handlePostTable);
  router.post('/api/:table', checkTableAuth, handlePostTable);

  router.patch('/rest/v1/:table', checkTableAuth, handlePatchTable);
  router.patch('/api/:table', checkTableAuth, handlePatchTable);

  router.delete('/rest/v1/:table', checkTableAuth, handleDeleteTable);
  router.delete('/api/:table', checkTableAuth, handleDeleteTable);

  return router;
}
