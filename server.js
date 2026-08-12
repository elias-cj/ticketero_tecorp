import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

dotenv.config();

const { Pool } = pg;
const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'support-connect-api';
const JWT_AUDIENCE = 'support-connect-web';

if (!connectionString) throw new Error('DATABASE_URL es obligatorio. No se permite una conexión por defecto.');
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET es obligatorio y debe tener al menos 32 caracteres aleatorios.');
}

const configuredOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins.length > 0
  ? configuredOrigins
  : (isProduction ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080']);

if (isProduction && allowedOrigins.length === 0) {
  throw new Error('CLIENT_ORIGINS es obligatorio en producción.');
}

const pool = new Pool({ connectionString });
const dbQuery = (text, params = []) => pool.query(text, params);

pool.on('error', (error) => console.error('Error inesperado de PostgreSQL:', error.message));

const TABLES = {
  tickets: {
    module: 'Tickets',
    columns: ['id', 'numero_ticket', 'titulo', 'descripcion', 'estado_id', 'tipo_problema_id', 'solucion_id', 'centro_contacto_id', 'solicitante_id', 'tecnico_asignado_id', 'creado_en', 'actualizado_en', 'extension', 'puesto_trabajo', 'modalidad_trabajo', 'ip_vpn', 'nombre_solicitante', 'registro_estado', 'fecha_asignacion', 'fecha_cierre', 'escalados'],
  },
  tareas: { module: 'Tareas', columns: ['id', 'titulo', 'descripcion', 'estado_id', 'creado_en', 'actualizado_en', 'completado_en'] },
  asignados_tarea: { module: 'Tareas', columns: ['tarea_id', 'tecnico_id', 'asignado_en'] },
  horarios: { module: 'Horarios', columns: ['id', 'tecnico_id', 'turno_id', 'fecha_horario'] },
  turnos: { module: 'Horarios', columns: ['id', 'nombre', 'hora_inicio', 'hora_fin'] },
  usuarios: { module: 'Usuarios', columns: ['id', 'nombre_completo', 'email', 'telefono', 'url_avatar', 'esta_activo', 'creado_en', 'actualizado_en', 'password', 'debe_cambiar_password'] },
  detalles_tecnico: { module: 'Usuarios', columns: ['usuario_id', 'especialidad_id', 'centro_contacto_id'] },
  roles_usuario: { module: 'Roles', columns: ['usuario_id', 'rol_id', 'asignado_por', 'asignado_en'] },
  roles: { module: 'Roles', columns: ['id', 'nombre', 'descripcion', 'esta_activo'] },
  permisos: { module: 'Roles', columns: ['id', 'modulo_id', 'accion_id'] },
  permisos_rol: { module: 'Roles', columns: ['rol_id', 'permiso_id', 'asignado_en'] },
  modulos: { module: 'Roles', columns: ['id', 'nombre', 'descripcion', 'creado_en'] },
  acciones: { module: 'Roles', columns: ['id', 'nombre'] },
  call_centers: { module: 'Call Centers', columns: ['id', 'codigo', 'nombre', 'pais', 'nivel_servicio', 'esta_activo', 'creado_en', 'nombre_corto', 'codigo_telefono', 'color_bandera'], publicRead: true },
  tipos_problema: { module: 'Tipos de Problema', columns: ['id', 'nombre', 'categoria_id', 'esta_activo'], publicRead: true },
  categorias_problema: { module: 'Tipos de Problema', columns: ['id', 'nombre'], publicRead: true },
  estados_ticket: { module: 'Tickets', columns: ['id', 'nombre'], publicRead: true },
  prioridades_ticket: { module: 'Tickets', columns: ['id', 'nombre', 'nivel'], publicRead: true },
  soluciones: { module: 'Soluciones', columns: ['id', 'titulo', 'creado_en', 'esta_activo'] },
  inventario: { module: 'Inventario', columns: ['id', 'nombre', 'categoria_id', 'codigo_nasa', 'numero_serie', 'estado', 'ubicacion', 'usuario_asignado_id', 'creado_en', 'actualizado_en'] },
  licencias: { module: 'Licencias', columns: ['id', 'nombre', 'clave_licencia', 'fecha_expiracion', 'usuario_asignado_id', 'estado', 'notas', 'creado_en', 'actualizado_en'] },
  informacion_empresa: { module: 'Configuración', columns: ['id', 'nombre_comercial', 'razon_social', 'id_fiscal', 'direccion', 'telefono', 'email_contacto', 'logo_url', 'creado_en', 'actualizado_en'], publicRead: true },
  registros_auditoria: { module: 'Configuración', columns: ['id', 'usuario_id', 'accion', 'entidad', 'entidad_id', 'detalles', 'creado_en'] },
  logs_auditoria: { module: 'Configuración', columns: ['id', 'usuario_id', 'accion', 'entidad', 'detalles', 'creado_en'] },
  faqs: { module: 'Soluciones', columns: ['id', 'question', 'answer', 'category', 'order', 'creado_en', 'actualizado_en'] },
};

const ACTION_BY_METHOD = { GET: 'VER', HEAD: 'VER', POST: 'CREAR', PATCH: 'EDITAR', DELETE: 'ELIMINAR' };
const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
const PASSWORD_SCHEMA = z.string().min(12, 'La contraseña debe tener al menos 12 caracteres.').max(128);
const LOGIN_SCHEMA = z.object({ p_email: z.string().email().max(254), p_password: z.string().min(1).max(128) });
const PUBLIC_TICKET_SCHEMA = z.object({
  titulo: z.string().trim().min(3).max(160),
  descripcion: z.string().trim().max(5000).optional().nullable(),
  centro_contacto_id: z.string().uuid(),
  tipo_problema_id: z.string().uuid(),
  nombre_solicitante: z.string().trim().min(2).max(160),
  extension: z.string().trim().max(30).optional().nullable(),
  puesto_trabajo: z.string().trim().max(160).optional().nullable(),
  modalidad_trabajo: z.string().trim().max(50).optional().nullable(),
  ip_vpn: z.string().trim().ip().optional().nullable(),
});

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function constantTimeEqual(a, b) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}

function signToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    sub: userId,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    iat: now,
    exp: now + (8 * 60 * 60),
    jti: crypto.randomUUID(),
  }));
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${headerPart}.${payloadPart}`).digest('base64url');
  if (!constantTimeEqual(signature, expectedSignature)) return null;
  try {
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
    if (header.alg !== 'HS256' || payload.iss !== JWT_ISSUER || payload.aud !== JWT_AUDIENCE || !payload.sub || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function createRateLimiter({ windowMs, max, keyPrefix }) {
  const attempts = new Map();
  const cleanup = setInterval(() => {
    for (const [key, entry] of attempts) if (entry.resetAt <= Date.now()) attempts.delete(key);
  }, windowMs);
  cleanup.unref();
  return (req, res, next) => {
    const key = `${keyPrefix}:${req.ip}`;
    const now = Date.now();
    const current = attempts.get(key);
    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > max) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      return res.status(429).json({ message: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' });
    }
    return next();
  };
}

function getTable(table) {
  return IDENTIFIER.test(table || '') ? TABLES[table] : null;
}

function cleanRow(table, row) {
  if (table !== 'usuarios') return row;
  const { password, ...safeRow } = row;
  return safeRow;
}

function sendDatabaseError(res, error) {
  console.error('Error de base de datos:', error.message);
  return res.status(400).json({ code: error.code || 'BAD_REQUEST', message: 'La solicitud no se pudo procesar.' });
}

async function getUserAccess(userId) {
  const { rows } = await dbQuery(`
    SELECT u.id, EXISTS (
      SELECT 1
      FROM public.roles_usuario ru
      JOIN public.roles r ON r.id = ru.rol_id
      WHERE ru.usuario_id = u.id
        AND r.esta_activo = TRUE
        AND LOWER(r.nombre) IN ('administrador supremo', 'superadmin', 'superadm')
    ) AS is_super_admin
    FROM public.usuarios u
    WHERE u.id = $1 AND u.esta_activo = TRUE
  `, [userId]);
  if (!rows[0]) return null;
  const { permissions } = await getUserRolesAndPermissions(userId);
  return { ...rows[0], permissions };
}

async function getUserRolesAndPermissions(userId) {
  const { rows } = await dbQuery(`
    SELECT r.id, r.nombre, r.descripcion, m.nombre AS modulo, a.nombre AS accion
    FROM public.roles_usuario ru
    JOIN public.roles r ON r.id = ru.rol_id AND r.esta_activo = TRUE
    LEFT JOIN public.permisos_rol pr ON pr.rol_id = r.id
    LEFT JOIN public.permisos p ON p.id = pr.permiso_id
    LEFT JOIN public.modulos m ON m.id = p.modulo_id
    LEFT JOIN public.acciones a ON a.id = p.accion_id
    WHERE ru.usuario_id = $1
  `, [userId]);
  const roles = [];
  const seenRoles = new Set();
  const permissions = {};
  for (const row of rows) {
    if (!seenRoles.has(row.id)) {
      roles.push({ id: row.id, nombre: row.nombre, descripcion: row.descripcion });
      seenRoles.add(row.id);
    }
    if (row.modulo && row.accion) {
      permissions[row.modulo] ||= [];
      if (!permissions[row.modulo].includes(row.accion)) permissions[row.modulo].push(row.accion);
    }
  }
  return { roles, permissions };
}

async function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization || req.headers['x-access-token'];
  const token = typeof authorization === 'string' && authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
  const payload = verifyToken(token);
  if (!payload) {
    if (req.tableConfig?.publicRead) return next();
    return res.status(401).json({ code: 'PGRST301', message: 'Autenticación requerida.' });
  }
  try {
    const access = await getUserAccess(payload.sub);
    if (!access) {
      if (req.tableConfig?.publicRead) return next();
      return res.status(401).json({ code: 'PGRST301', message: 'Sesión no válida o usuario deshabilitado.' });
    }
    req.user = { id: payload.sub, ...access };
    return next();
  } catch (error) {
    if (req.tableConfig?.publicRead) return next();
    console.error('Error al validar sesión:', error.message);
    return res.status(503).json({ message: 'No se pudo validar la sesión.' });
  }
}

function hasPermission(user, module, action) {
  return user.is_super_admin === true || user.is_super_admin === 't' || user.permissions?.[module]?.includes(action);
}

function authorizeTable(req, res, next) {
  const config = getTable(req.params.table);
  if (!config) return res.status(404).json({ message: 'Recurso no disponible.' });
  const action = ACTION_BY_METHOD[req.method];
  if (req.method === 'GET' && (config.publicRead || action === 'VER')) {
    req.tableConfig = config;
    return next();
  }
  if (!action || !hasPermission(req.user, config.module, action)) {
    return res.status(403).json({ message: 'No tienes permiso para esta operación.' });
  }
  req.tableConfig = config;
  return next();
}

function parseQueryFilter(query, allowedColumns) {
  const whereClauses = [];
  const values = [];
  let limit = null;
  let offset = null;
  let orderBy = null;
  const assertColumn = (column) => {
    if (!allowedColumns.includes(column)) throw new Error('Filtro o columna no permitido.');
  };
  for (const [key, rawValue] of Object.entries(query)) {
    if (key === 'select') continue;
    const rawValues = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const rawVal of rawValues) {
      const value = String(rawVal);
      if (key === 'order') {
        const [column, direction = 'asc'] = value.split('.');
        assertColumn(column);
        if (!['asc', 'desc'].includes(direction.toLowerCase())) throw new Error('Orden inválido.');
        orderBy = `"${column}" ${direction.toUpperCase()}`;
        continue;
      }
      if (key === 'limit' || key === 'offset') {
        if (!/^\d+$/.test(value)) throw new Error('Paginación inválida.');
        const parsed = Number.parseInt(value, 10);
        if (key === 'limit') limit = Math.min(parsed, 50000);
        else offset = parsed;
        continue;
      }
      assertColumn(key);
      const add = (operator, parsedValue) => {
        let val = parsedValue;
        if (val === 'true') val = true;
        if (val === 'false') val = false;
        values.push(val);
        whereClauses.push(`"${key}" ${operator} $${values.length}`);
      };
      if (value.startsWith('eq.')) add('=', value.slice(3));
      else if (value.startsWith('neq.')) add('!=', value.slice(4));
      else if (value.startsWith('ilike.')) add('ILIKE', value.slice(6));
      else if (value.startsWith('like.')) add('LIKE', value.slice(5));
      else if (value.startsWith('gte.')) add('>=', value.slice(4));
      else if (value.startsWith('lte.')) add('<=', value.slice(4));
      else if (value.startsWith('gt.')) add('>', value.slice(3));
      else if (value.startsWith('lt.')) add('<', value.slice(3));
      else if (value.startsWith('in.')) {
        const entries = value.slice(3).replace(/^\(/, '').replace(/\)$/, '').split(',').map((entry) => entry.trim().replace(/^"|"$/g, '')).filter(Boolean);
        if (entries.length === 0 || entries.length > 100) throw new Error('Filtro IN inválido.');
        values.push(entries);
        const castType = (key.endsWith('_id') || key === 'id') ? '::uuid[]' : '::text[]';
        whereClauses.push(`"${key}" = ANY($${values.length}${castType})`);
      } else if (value === 'is.null') whereClauses.push(`"${key}" IS NULL`);
      else if (value === 'is.not.null') whereClauses.push(`"${key}" IS NOT NULL`);
      else if (value === 'is.true') whereClauses.push(`"${key}" = TRUE`);
      else if (value === 'is.false') whereClauses.push(`"${key}" = FALSE`);
      else throw new Error('Operador de filtro no permitido.');
    }
  }
  return { whereClauses, values, limit, offset, orderBy };
}

function validateWriteBody(body, allowedColumns) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Cuerpo de solicitud inválido.');
  const keys = Object.keys(body);
  if (keys.length === 0 || keys.length > allowedColumns.length) throw new Error('Campos de solicitud inválidos.');
  for (const key of keys) if (!allowedColumns.includes(key)) throw new Error(`El campo ${key} no está permitido.`);
  return keys;
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || !isProduction || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Total-Count');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  if (isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use(express.json({ limit: '100kb', strict: true }));

app.get('/health', async (_req, res) => {
  try {
    await dbQuery('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.post('/rest/v1/rpc/login_seguro', createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'login' }), async (req, res) => {
  const parsed = LOGIN_SCHEMA.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Credenciales inválidas.' });
  try {
    const { rows } = await dbQuery('SELECT id, nombre_completo, email, telefono, url_avatar, esta_activo, password, debe_cambiar_password FROM public.usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1', [parsed.data.p_email]);
    const user = rows[0];
    const validPassword = Boolean(user?.esta_activo && user.password?.startsWith('$2') && await bcrypt.compare(parsed.data.p_password, user.password));
    if (!validPassword) return res.status(401).json({ success: false, message: 'Correo o contraseña incorrectos.' });
    const { roles, permissions } = await getUserRolesAndPermissions(user.id);
    return res.json({
      success: true,
      token: signToken(user.id),
      user: { id: user.id, nombre_completo: user.nombre_completo, email: user.email, telefono: user.telefono, url_avatar: user.url_avatar, debe_cambiar_password: user.debe_cambiar_password },
      roles,
      permissions,
    });
  } catch (error) {
    console.error('Error de autenticación:', error.message);
    return res.status(503).json({ success: false, message: 'No se pudo procesar la autenticación.' });
  }
});

app.post('/rest/v1/rpc/cambiar_password_seguro', authenticateToken, async (req, res) => {
  const schema = z.object({ p_user_id: z.string().uuid().optional(), p_new_password: PASSWORD_SCHEMA });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success || (parsed.data.p_user_id && parsed.data.p_user_id !== req.user.id)) return res.status(400).json({ success: false, message: 'Solicitud de contraseña inválida.' });
  try {
    const password = await bcrypt.hash(parsed.data.p_new_password, 12);
    await dbQuery('UPDATE public.usuarios SET password = $1, debe_cambiar_password = FALSE, actualizado_en = NOW() WHERE id = $2', [password, req.user.id]);
    return res.json({ success: true, message: 'Contraseña actualizada.' });
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

app.all('/rest/v1/rpc/obtener_metricas_dashboard', authenticateToken, async (_req, res) => {
  try {
    const { rows } = await dbQuery('SELECT public.obtener_metricas_dashboard() AS data');
    return res.json(rows[0]?.data || {});
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

app.post('/rest/v1/tickets', createRateLimiter({ windowMs: 60 * 60 * 1000, max: 12, keyPrefix: 'public-ticket' }), async (req, res, next) => {
  if (req.headers.authorization) return next();
  const parsed = PUBLIC_TICKET_SCHEMA.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Datos de ticket inválidos.' });
  try {
    const { rows: statusRows } = await dbQuery("SELECT id FROM public.estados_ticket WHERE LOWER(nombre) = 'abierto' LIMIT 1");
    if (!statusRows[0]) return res.status(503).json({ message: 'No se pudo iniciar el ticket.' });
    const data = parsed.data;
    const ticketNumber = `TCK-${new Date().getFullYear()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    const { rows } = await dbQuery(`
      INSERT INTO public.tickets (numero_ticket, titulo, descripcion, estado_id, tipo_problema_id, centro_contacto_id, nombre_solicitante, extension, puesto_trabajo, modalidad_trabajo, ip_vpn, registro_estado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'activo')
      RETURNING id, numero_ticket
    `, [ticketNumber, data.titulo, data.descripcion || null, statusRows[0].id, data.tipo_problema_id, data.centro_contacto_id, data.nombre_solicitante, data.extension || null, data.puesto_trabajo || null, data.modalidad_trabajo || null, data.ip_vpn || null]);
    return res.status(201).json(rows[0]);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

app.get('/rest/v1/:table', async (req, res, next) => {
  const config = getTable(req.params.table);
  if (config?.publicRead && !req.headers.authorization) {
    req.tableConfig = config;
    return next();
  }
  return authenticateToken(req, res, () => authorizeTable(req, res, next));
}, async (req, res) => {
  const table = req.params.table;
  const config = req.tableConfig;
  if (!config) return res.status(404).json({ message: 'Recurso no disponible.' });
  try {
    const { whereClauses, values, limit, offset, orderBy } = parseQueryFilter(req.query, config.columns);
    let sql = '';
    if (table === 'tickets') {
      const selectClause = `
        t.id, t.numero_ticket, t.titulo, t.descripcion, t.estado_id, t.tipo_problema_id,
        t.solucion_id, t.centro_contacto_id, t.solicitante_id, t.tecnico_asignado_id, t.creado_en, t.actualizado_en,
        t.extension, t.puesto_trabajo, t.modalidad_trabajo, t.ip_vpn, t.nombre_solicitante, t.registro_estado,
        t.fecha_asignacion, t.fecha_cierre, t.escalados,
        CASE WHEN et.id IS NOT NULL THEN json_build_object('nombre', et.nombre) ELSE NULL END AS estados_ticket,
        CASE WHEN tp.id IS NOT NULL THEN json_build_object('nombre', tp.nombre) ELSE NULL END AS tipos_problema,
        CASE WHEN u.id IS NOT NULL THEN json_build_object('nombre_completo', u.nombre_completo) ELSE NULL END AS tecnico,
        CASE WHEN us.id IS NOT NULL THEN json_build_object('nombre_completo', us.nombre_completo, 'telefono', us.telefono) ELSE NULL END AS solicitante,
        CASE WHEN cc.id IS NOT NULL THEN json_build_object('id', cc.id, 'nombre', cc.nombre, 'codigo', cc.codigo, 'pais', cc.pais, 'nombre_corto', cc.nombre_corto, 'codigo_telefono', cc.codigo_telefono, 'color_bandera', cc.color_bandera) ELSE NULL END AS call_centers,
        CASE WHEN sol.id IS NOT NULL THEN json_build_object('titulo', sol.titulo) ELSE NULL END AS soluciones
      `;
      sql = `
        SELECT ${selectClause}
        FROM public.tickets t
        LEFT JOIN public.estados_ticket et ON et.id = t.estado_id
        LEFT JOIN public.tipos_problema tp ON tp.id = t.tipo_problema_id
        LEFT JOIN public.usuarios u ON u.id = t.tecnico_asignado_id
        LEFT JOIN public.usuarios us ON us.id = t.solicitante_id
        LEFT JOIN public.call_centers cc ON cc.id = t.centro_contacto_id
        LEFT JOIN public.soluciones sol ON sol.id = t.solucion_id
      `;
      const tWhere = whereClauses.map((clause) => clause.replace(/^"([^"]+)"/, 't."$1"'));
      if (tWhere.length) sql += ` WHERE ${tWhere.join(' AND ')}`;
      if (orderBy) sql += ` ORDER BY t.${orderBy}`;
      if (limit !== null) sql += ` LIMIT ${limit}`;
      if (offset !== null) sql += ` OFFSET ${offset}`;
    } else if (table === 'usuarios') {
      const selectClause = `
        u.id, u.nombre_completo, u.email, u.telefono, u.url_avatar, u.esta_activo, u.creado_en, u.actualizado_en, u.debe_cambiar_password,
        COALESCE(
          (
            SELECT json_agg(json_build_object('roles', json_build_object('nombre', r.nombre)))
            FROM public.roles_usuario ru
            JOIN public.roles r ON r.id = ru.rol_id
            WHERE ru.usuario_id = u.id
          ),
          '[]'::json
        ) AS roles_usuario
      `;
      sql = `SELECT ${selectClause} FROM public.usuarios u`;
      const uWhere = whereClauses.map((clause) => clause.replace(/^"([^"]+)"/, 'u."$1"'));
      if (uWhere.length) sql += ` WHERE ${uWhere.join(' AND ')}`;
      if (orderBy) sql += ` ORDER BY u.${orderBy}`;
      if (limit !== null) sql += ` LIMIT ${limit}`;
      if (offset !== null) sql += ` OFFSET ${offset}`;
    } else if (table === 'tipos_problema') {
      const selectClause = `
        tp.id, tp.nombre, tp.categoria_id, tp.esta_activo,
        CASE WHEN cp.id IS NOT NULL THEN json_build_object('id', cp.id, 'nombre', cp.nombre) ELSE NULL END AS categorias_problema
      `;
      sql = `
        SELECT ${selectClause}
        FROM public.tipos_problema tp
        LEFT JOIN public.categorias_problema cp ON cp.id = tp.categoria_id
      `;
      const tpWhere = whereClauses.map((clause) => clause.replace(/^"([^"]+)"/, 'tp."$1"'));
      if (tpWhere.length) sql += ` WHERE ${tpWhere.join(' AND ')}`;
      if (orderBy) sql += ` ORDER BY tp.${orderBy}`;
      if (limit !== null) sql += ` LIMIT ${limit}`;
      if (offset !== null) sql += ` OFFSET ${offset}`;
    } else if (table === 'roles_usuario') {
      const selectClause = `
        ru.usuario_id, ru.rol_id, ru.asignado_por, ru.asignado_en,
        CASE WHEN r.id IS NOT NULL THEN json_build_object('id', r.id, 'nombre', r.nombre) ELSE NULL END AS roles
      `;
      sql = `
        SELECT ${selectClause}
        FROM public.roles_usuario ru
        LEFT JOIN public.roles r ON r.id = ru.rol_id
      `;
      const ruWhere = whereClauses.map((clause) => clause.replace(/^"([^"]+)"/, 'ru."$1"'));
      if (ruWhere.length) sql += ` WHERE ${ruWhere.join(' AND ')}`;
      if (orderBy) sql += ` ORDER BY ru.${orderBy}`;
      if (limit !== null) sql += ` LIMIT ${limit}`;
      if (offset !== null) sql += ` OFFSET ${offset}`;
    } else if (table === 'permisos_rol') {
      const selectClause = `
        pr.rol_id, pr.permiso_id, pr.asignado_en,
        CASE WHEN p.id IS NOT NULL THEN json_build_object(
          'id', p.id,
          'modulos', CASE WHEN m.id IS NOT NULL THEN json_build_object('nombre', m.nombre) ELSE NULL END,
          'acciones', CASE WHEN a.id IS NOT NULL THEN json_build_object('nombre', a.nombre) ELSE NULL END
        ) ELSE NULL END AS permisos
      `;
      sql = `
        SELECT ${selectClause}
        FROM public.permisos_rol pr
        LEFT JOIN public.permisos p ON p.id = pr.permiso_id
        LEFT JOIN public.modulos m ON m.id = p.modulo_id
        LEFT JOIN public.acciones a ON a.id = p.accion_id
      `;
      const prWhere = whereClauses.map((clause) => clause.replace(/^"([^"]+)"/, 'pr."$1"'));
      if (prWhere.length) sql += ` WHERE ${prWhere.join(' AND ')}`;
      if (orderBy) sql += ` ORDER BY pr.${orderBy}`;
      if (limit !== null) sql += ` LIMIT ${limit}`;
      if (offset !== null) sql += ` OFFSET ${offset}`;
    } else if (table === 'permisos') {
      const selectClause = `
        p.id, p.modulo_id, p.accion_id,
        CASE WHEN m.id IS NOT NULL THEN json_build_object('nombre', m.nombre) ELSE NULL END AS modulos,
        CASE WHEN a.id IS NOT NULL THEN json_build_object('nombre', a.nombre) ELSE NULL END AS acciones
      `;
      sql = `
        SELECT ${selectClause}
        FROM public.permisos p
        LEFT JOIN public.modulos m ON m.id = p.modulo_id
        LEFT JOIN public.acciones a ON a.id = p.accion_id
      `;
      const pWhere = whereClauses.map((clause) => clause.replace(/^"([^"]+)"/, 'p."$1"'));
      if (pWhere.length) sql += ` WHERE ${pWhere.join(' AND ')}`;
      if (orderBy) sql += ` ORDER BY p.${orderBy}`;
      if (limit !== null) sql += ` LIMIT ${limit}`;
      if (offset !== null) sql += ` OFFSET ${offset}`;
    } else if (table === 'tareas') {
      const selectClause = `
        tar.id, tar.titulo, tar.descripcion, tar.estado_id, tar.creado_en, tar.actualizado_en, tar.completado_en,
        CASE WHEN et.id IS NOT NULL THEN json_build_object('id', et.id, 'nombre', et.nombre) ELSE NULL END AS estados_ticket,
        COALESCE(
          (
            SELECT json_agg(json_build_object('tecnico_id', at.tecnico_id, 'asignado_en', at.asignado_en))
            FROM public.asignados_tarea at
            WHERE at.tarea_id = tar.id
          ),
          '[]'::json
        ) AS asignados_tarea
      `;
      sql = `
        SELECT ${selectClause}
        FROM public.tareas tar
        LEFT JOIN public.estados_ticket et ON et.id = tar.estado_id
      `;
      const tarWhere = whereClauses.map((clause) => clause.replace(/^"([^"]+)"/, 'tar."$1"'));
      if (tarWhere.length) sql += ` WHERE ${tarWhere.join(' AND ')}`;
      if (orderBy) sql += ` ORDER BY tar.${orderBy}`;
      if (limit !== null) sql += ` LIMIT ${limit}`;
      if (offset !== null) sql += ` OFFSET ${offset}`;
    } else {
      const selectColumns = config.columns.filter((column) => !(table === 'usuarios' && column === 'password')).map((column) => `"${column}"`).join(', ');
      sql = `SELECT ${selectColumns} FROM public."${table}"`;
      if (whereClauses.length) sql += ` WHERE ${whereClauses.join(' AND ')}`;
      if (orderBy) sql += ` ORDER BY ${orderBy}`;
      if (limit !== null) sql += ` LIMIT ${limit}`;
      if (offset !== null) sql += ` OFFSET ${offset}`;
    }
    const { rows } = await dbQuery(sql, values);
    if (String(req.headers.prefer || '').includes('count=exact')) {
      const countWhere = table === 'tickets' ? whereClauses.map((clause) => clause.replace(/^"([^"]+)"/, 't."$1"')) : table === 'tipos_problema' ? whereClauses.map((clause) => clause.replace(/^"([^"]+)"/, 'tp."$1"')) : whereClauses;
      const countSql = table === 'tickets'
        ? `SELECT COUNT(*) AS total FROM public.tickets t${countWhere.length ? ` WHERE ${countWhere.join(' AND ')}` : ''}`
        : table === 'tipos_problema'
          ? `SELECT COUNT(*) AS total FROM public.tipos_problema tp${countWhere.length ? ` WHERE ${countWhere.join(' AND ')}` : ''}`
          : `SELECT COUNT(*) AS total FROM public."${table}"${countWhere.length ? ` WHERE ${countWhere.join(' AND ')}` : ''}`;
      const countResult = await dbQuery(countSql, values);
      const total = countResult.rows[0]?.total || 0;
      res.setHeader('Content-Range', `0-${Math.max(Number(total) - 1, 0)}/${total}`);
    }
    if (String(req.headers.accept || '').includes('vnd.pgrst.object+json')) {
      if (rows.length !== 1) return res.status(406).json({ message: 'Se esperaba exactamente un registro.' });
      return res.json(cleanRow(table, rows[0]));
    }
    return res.json(rows.map((row) => cleanRow(table, row)));
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

app.post('/rest/v1/:table', authenticateToken, authorizeTable, async (req, res) => {
  const table = req.params.table;
  const config = req.tableConfig;
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    if (records.length === 0 || records.length > 20) throw new Error('Cantidad de registros inválida.');
    const insertedRows = [];
    for (const sourceRecord of records) {
      const record = { ...sourceRecord };
      delete record.id;
      delete record.creado_en;
      delete record.actualizado_en;
      delete record.asignado_en;
      delete record.numero_ticket;
      delete record.vector_busqueda;
      const keys = validateWriteBody(record, config.columns.filter((column) => !['id', 'creado_en', 'actualizado_en', 'asignado_en', 'numero_ticket', 'vector_busqueda'].includes(column)));
      if (table === 'usuarios' && Object.hasOwn(record, 'password')) record.password = await bcrypt.hash(PASSWORD_SCHEMA.parse(record.password), 12);
      const columns = keys.map((column) => `"${column}"`).join(', ');
      const values = keys.map((key) => record[key]);
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
      const { rows } = await dbQuery(`INSERT INTO public."${table}" (${columns}) VALUES (${placeholders}) RETURNING *`, values);
      insertedRows.push(cleanRow(table, rows[0]));
    }
    if (String(req.headers.prefer || '').includes('return=minimal')) return res.status(201).end();
    return res.status(201).json(Array.isArray(req.body) ? insertedRows : insertedRows[0]);
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

app.patch('/rest/v1/:table', authenticateToken, authorizeTable, async (req, res) => {
  const table = req.params.table;
  const config = req.tableConfig;
  try {
    const record = { ...req.body };
    delete record.id;
    delete record.creado_en;
    delete record.actualizado_en;
    delete record.asignado_en;
    delete record.numero_ticket;
    delete record.vector_busqueda;
    const allowedWriteColumns = config.columns.filter((column) => !['id', 'creado_en', 'actualizado_en', 'asignado_en', 'numero_ticket', 'vector_busqueda'].includes(column));
    const keys = validateWriteBody(record, allowedWriteColumns);
    const { whereClauses, values: filterValues } = parseQueryFilter(req.query, config.columns);
    if (!whereClauses.length) throw new Error('Se requiere un filtro para actualizar.');
    if (table === 'usuarios' && Object.hasOwn(record, 'password')) record.password = await bcrypt.hash(PASSWORD_SCHEMA.parse(record.password), 12);
    const setClauses = keys.map((key, index) => `"${key}" = $${index + 1}`);
    const adjustedWhere = whereClauses.map((clause) => clause.replace(/\$(\d+)/g, (_, number) => `$${Number(number) + keys.length}`));
    const { rows } = await dbQuery(`UPDATE public."${table}" SET ${setClauses.join(', ')} WHERE ${adjustedWhere.join(' AND ')} RETURNING *`, [...keys.map((key) => record[key]), ...filterValues]);
    return res.json(rows.map((row) => cleanRow(table, row)));
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

app.delete('/rest/v1/:table', authenticateToken, authorizeTable, async (req, res) => {
  const table = req.params.table;
  const config = req.tableConfig;
  try {
    const { whereClauses, values } = parseQueryFilter(req.query, config.columns);
    if (!whereClauses.length) throw new Error('Se requiere un filtro para eliminar.');
    const { rows } = await dbQuery(`DELETE FROM public."${table}" WHERE ${whereClauses.join(' AND ')} RETURNING *`, values);
    return res.json(rows.map((row) => cleanRow(table, row)));
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

app.use((error, _req, res, _next) => {
  if (error?.message === 'Origen no permitido por CORS.') return res.status(403).json({ message: 'Origen no permitido.' });
  if (error instanceof SyntaxError) return res.status(400).json({ message: 'JSON inválido.' });
  console.error('Error no controlado:', error);
  return res.status(500).json({ message: 'Error interno del servidor.' });
});

async function initAuxiliaryTables() {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS public.informacion_empresa (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre_comercial TEXT,
        razon_social TEXT,
        id_fiscal TEXT,
        direccion TEXT,
        telefono TEXT,
        email_contacto TEXT,
        logo_url TEXT,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public.registros_auditoria (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
        accion TEXT NOT NULL,
        entidad TEXT NOT NULL,
        entidad_id UUID,
        detalles JSONB,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public.prioridades_ticket (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre TEXT NOT NULL,
        nivel INT DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS public.inventario (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        codigo TEXT,
        nombre TEXT NOT NULL,
        categoria TEXT,
        numero_serie TEXT,
        estado TEXT DEFAULT 'Disponible',
        asignado_a UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
        centro_contacto_id UUID REFERENCES public.call_centers(id) ON DELETE SET NULL,
        ubicacion TEXT,
        fecha_adquisicion DATE,
        notas TEXT,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public.licencias (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre TEXT NOT NULL,
        proveedor TEXT,
        clave_licencia TEXT,
        cantidad_total INT DEFAULT 1,
        cantidad_usada INT DEFAULT 0,
        fecha_compra DATE,
        fecha_vencimiento DATE,
        estado TEXT DEFAULT 'Activa',
        notas TEXT,
        creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tickets_creado_en ON public.tickets (creado_en DESC);
      CREATE INDEX IF NOT EXISTS idx_tickets_tecnico_asignado ON public.tickets (tecnico_asignado_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_centro_contacto ON public.tickets (centro_contacto_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_estado_id ON public.tickets (estado_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_tipo_problema_id ON public.tickets (tipo_problema_id);

      CREATE OR REPLACE FUNCTION public.generar_numero_ticket_auto()
      RETURNS trigger AS $$
      DECLARE
        v_max_num INT;
        v_prefix TEXT;
      BEGIN
        IF NEW.numero_ticket IS NULL OR NEW.numero_ticket = '' THEN
          v_prefix := CASE WHEN NEW.escalados IS TRUE THEN 'TCKIT-' ELSE 'TCK-' END;
          
          SELECT COALESCE(
            MAX(
              NULLIF(
                regexp_replace(numero_ticket, '[^0-9]', '', 'g'), 
                ''
              )::INT
            ), 
            10000
          )
          INTO v_max_num
          FROM public.tickets;

          NEW.numero_ticket := v_prefix || lpad((v_max_num + 1)::text, 5, '0');
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_generar_numero_ticket ON public.tickets;
      CREATE TRIGGER trg_generar_numero_ticket
      BEFORE INSERT ON public.tickets
      FOR EACH ROW EXECUTE FUNCTION public.generar_numero_ticket_auto();
    `);

    await dbQuery(`
      INSERT INTO public.informacion_empresa (nombre_comercial, razon_social, id_fiscal, direccion, telefono, email_contacto)
      SELECT 'TECORP S.A.', 'TECORP SOLUCIONES TECNOLÓGICAS S.A.', '1029384756', 'Av. Equipetrol Nro 100', '+591 3 3456789', 'soporte@tecorp.com'
      WHERE NOT EXISTS (SELECT 1 FROM public.informacion_empresa);

      INSERT INTO public.prioridades_ticket (nombre, nivel)
      SELECT nombre, nivel FROM (VALUES ('Baja', 1), ('Media', 2), ('Alta', 3), ('Crítica', 4)) AS t(nombre, nivel)
      WHERE NOT EXISTS (SELECT 1 FROM public.prioridades_ticket);

      CREATE OR REPLACE FUNCTION public.sembrar_matriz_rbac_inicial()
      RETURNS void AS $$
      BEGIN
        INSERT INTO public.acciones (nombre) VALUES 
          ('VER'), ('CREAR'), ('EDITAR'), ('ELIMINAR'), ('LLAMAR'),
          -- Acciones especiales del Dashboard (filtros por Call Center)
          ('Guatemala'), ('Bolivia'), ('Panamá'), ('Nicaragua'), ('Paraguay'),
          ('Televenta Panamá'), ('Televenta Nicaragua'), ('Televentas'),
          ('RRHH'), ('Nacional Seguros'), ('NOC'), ('Multiskill'),
          ('Cobranzas'), ('Innovación'), ('Marathon'), ('CDLA'), ('BI'), ('Linde')
        ON CONFLICT (nombre) DO NOTHING;

        INSERT INTO public.modulos (nombre) VALUES 
          ('Call Centers'), ('Cola IT'), ('Configuración'), ('Dashboard'), ('Exportación'), 
          ('Horarios'), ('Inventario'), ('Licencias'), ('Roles'), ('Soluciones'), 
          ('Tareas'), ('Tickets'), ('Usuarios'), ('Tipos de Problema')
        ON CONFLICT (nombre) DO NOTHING;

        INSERT INTO public.permisos (modulo_id, accion_id)
        SELECT m.id, a.id 
        FROM public.modulos m
        CROSS JOIN public.acciones a
        ON CONFLICT (modulo_id, accion_id) DO NOTHING;

        INSERT INTO public.roles (nombre, descripcion) VALUES
          ('Administrador Supremo', 'Control total sobre todo el sistema'),
          ('BI', 'Rol orientado a inteligencia de negocios y análisis'),
          ('it', 'Técnico de Infraestructura y Redes'),
          ('Técnico de Soporte', 'Gestión operativa de tickets y soporte técnico'),
          ('Usuario Autorizado', 'Rol con permisos limitados de consulta'),
          ('semiadm', 'Rol administrativo parcial')
        ON CONFLICT (nombre) DO NOTHING;
      END;
      $$ LANGUAGE plpgsql;

      SELECT public.sembrar_matriz_rbac_inicial();

      CREATE OR REPLACE FUNCTION public.obtener_metricas_dashboard()
      RETURNS JSON
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
          v_total INT;
          v_current_month INT;
          v_last_month INT;
          v_unassigned INT;
          v_escalated INT;
          v_pending_tasks INT;
          v_by_country JSON;
          v_by_work_mode JSON;
          v_by_problem_type JSON;
          v_tech_stats JSON;
          v_result JSON;
      BEGIN
          SELECT COUNT(*) INTO v_total FROM public.tickets;

          SELECT COUNT(*) INTO v_current_month 
          FROM public.tickets 
          WHERE creado_en >= date_trunc('month', CURRENT_DATE);

          SELECT COUNT(*) INTO v_last_month 
          FROM public.tickets 
          WHERE creado_en >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
            AND creado_en < date_trunc('month', CURRENT_DATE);

          SELECT COUNT(*) INTO v_unassigned 
          FROM public.tickets 
          WHERE tecnico_asignado_id IS NULL;

          SELECT COUNT(*) INTO v_escalated 
          FROM public.tickets 
          WHERE escalados = TRUE;

          SELECT COUNT(*) INTO v_pending_tasks 
          FROM public.tareas;

          SELECT COALESCE(json_agg(t), '[]'::json) INTO v_by_country
          FROM (
              SELECT 
                  COALESCE(cc.pais, 'Otros') AS pais,
                  COALESCE(cc.nombre, 'Sin Centro') AS call_center,
                  COUNT(t.id) AS cantidad
              FROM public.tickets t
              LEFT JOIN public.call_centers cc ON cc.id = t.centro_contacto_id
              GROUP BY cc.pais, cc.nombre
              ORDER BY cantidad DESC
          ) t;

          SELECT COALESCE(json_agg(t), '[]'::json) INTO v_by_work_mode
          FROM (
              SELECT 
                  CASE 
                      WHEN LOWER(COALESCE(modalidad_trabajo, '')) IN ('home-office', 'home office', 'remoto') THEN 'Home Office'
                      WHEN LOWER(COALESCE(modalidad_trabajo, '')) IN ('presencial', 'oficina') THEN 'Presencial'
                      ELSE 'Otros'
                  END AS modalidad,
                  COUNT(*) AS cantidad
              FROM public.tickets
              GROUP BY 1
              ORDER BY cantidad DESC
          ) t;

          SELECT COALESCE(json_agg(t), '[]'::json) INTO v_by_problem_type
          FROM (
              SELECT 
                  COALESCE(tp.nombre, 'General') AS tipo_problema,
                  COUNT(t.id) AS cantidad
              FROM public.tickets t
              LEFT JOIN public.tipos_problema tp ON tp.id = t.tipo_problema_id
              GROUP BY tp.nombre
              ORDER BY cantidad DESC
              LIMIT 10
          ) t;

          SELECT COALESCE(json_agg(t), '[]'::json) INTO v_tech_stats
          FROM (
              SELECT 
                  u.nombre_completo AS tecnico,
                  COUNT(t.id) AS total_asignados,
                  COUNT(CASE WHEN et.nombre IN ('Resuelto', 'Cerrado') THEN 1 END) AS total_resueltos,
                  COALESCE(
                      ROUND(
                          AVG(
                              CASE 
                                  WHEN t.fecha_cierre IS NOT NULL AND t.fecha_asignacion IS NOT NULL 
                                       AND t.fecha_cierre >= t.fecha_asignacion
                                  THEN EXTRACT(EPOCH FROM (t.fecha_cierre - t.fecha_asignacion)) / 60.0
                                  ELSE NULL
                              END
                          )::numeric, 1
                      ), 0
                  ) AS tiempo_promedio_minutos
              FROM public.usuarios u
              JOIN public.roles_usuario ru ON ru.usuario_id = u.id
              JOIN public.roles r ON r.id = ru.rol_id AND LOWER(r.nombre) LIKE '%soporte%'
              LEFT JOIN public.tickets t ON t.tecnico_asignado_id = u.id
              LEFT JOIN public.estados_ticket et ON et.id = t.estado_id
              WHERE u.esta_activo = TRUE
              GROUP BY u.id, u.nombre_completo
              ORDER BY total_resueltos DESC, tiempo_promedio_minutos ASC
          ) t;

          v_result := json_build_object(
              'total_processed', v_total,
              'current_month_count', v_current_month,
              'last_month_count', v_last_month,
              'unassigned_count', v_unassigned,
              'escalated_count', v_escalated,
              'pending_tasks', v_pending_tasks,
              'by_country', v_by_country,
              'by_work_mode', v_by_work_mode,
              'by_problem_type', v_by_problem_type,
              'tech_stats', v_tech_stats,
              'generated_at', NOW()
          );

          RETURN v_result;
      END;
      $$;
    `);
  } catch (err) {
    console.error('Error al inicializar tablas auxiliares:', err.message);
  }
}

const PORT = Number.parseInt(process.env.PORT || '54321', 10);
if (process.env.NODE_ENV !== 'test') {
  initAuxiliaryTables().then(() => {
    app.listen(PORT, process.env.HOST || '127.0.0.1', () => console.log(`API segura disponible en el puerto ${PORT}.`));
  });
}

export { app, verifyToken, signToken, parseQueryFilter };
