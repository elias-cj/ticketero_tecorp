import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'database_backup_prod');
const OUTPUT_FULL = path.join(BACKUP_DIR, 'full_database_dump.sql');
const OUTPUT_01 = path.join(BACKUP_DIR, '01_estructura_tablas.sql');
const OUTPUT_02 = path.join(BACKUP_DIR, '02_datos_produccion.sql');
const OUTPUT_03 = path.join(BACKUP_DIR, '03_triggers_y_funciones.sql');
const OUTPUT_04 = path.join(BACKUP_DIR, '04_indices_y_rpc.sql');

// Orden estricto de tablas respetando claves foráneas (FK)
const tables = [
  'call_centers',
  'roles',
  'modulos',
  'acciones',
  'estados_ticket',
  'categorias_problema',
  'soluciones',
  'turnos',
  'usuarios',
  'permisos',
  'tipos_problema',
  'roles_usuario',
  'horarios',
  'permisos_rol',
  'tareas',
  'asignados_tarea',
  'registros_auditoria',
  'logs_auditoria',
  'tickets'
];

function generateSQLDump() {
  console.log("🚀 Generando archivos SQL modulares y dump completo para PostgreSQL...");

  // =========================================================================
  // 1. ESTRUCTURA DE TABLAS (01_estructura_tablas.sql)
  // =========================================================================
  let sql1 = `-- =============================================================================\n`;
  sql1 += `-- 1. EXTENSIONES Y ESTRUCTURA DE TABLAS POSTGRESQL\n`;
  sql1 += `-- Proyecto: Support-Connect\n`;
  sql1 += `-- Generado: ${new Date().toISOString()}\n`;
  sql1 += `-- =============================================================================\n\n`;

  sql1 += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`;
  sql1 += `CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.call_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE,
    nombre TEXT NOT NULL,
    pais TEXT,
    nivel_servicio TEXT,
    esta_activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nombre_corto TEXT,
    codigo_telefono TEXT,
    color_bandera TEXT
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    esta_activo BOOLEAN DEFAULT TRUE
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.modulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.acciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo_id UUID REFERENCES public.modulos(id) ON DELETE CASCADE,
    accion_id UUID REFERENCES public.acciones(id) ON DELETE CASCADE,
    CONSTRAINT unique_modulo_accion UNIQUE (modulo_id, accion_id)
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.permisos_rol (
    rol_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permiso_id UUID REFERENCES public.permisos(id) ON DELETE CASCADE,
    asignado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (rol_id, permiso_id)
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.estados_ticket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.categorias_problema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.tipos_problema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    categoria_id UUID REFERENCES public.categorias_problema(id) ON DELETE SET NULL,
    esta_activo BOOLEAN DEFAULT TRUE
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.soluciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    esta_activo BOOLEAN DEFAULT TRUE
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    url_avatar TEXT,
    esta_activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    password TEXT,
    debe_cambiar_password BOOLEAN DEFAULT FALSE
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.roles_usuario (
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    rol_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    asignado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    asignado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (usuario_id, rol_id)
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.horarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tecnico_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    turno_id UUID REFERENCES public.turnos(id) ON DELETE CASCADE,
    fecha_horario DATE NOT NULL
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.tareas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion TEXT,
    estado_id UUID REFERENCES public.estados_ticket(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completado_en TIMESTAMP WITH TIME ZONE
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.asignados_tarea (
    tarea_id UUID REFERENCES public.tareas(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    asignado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (tarea_id, tecnico_id)
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.registros_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    entidad_id TEXT,
    detalles JSONB,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.logs_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    detalles TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);\n\n`;

  sql1 += `CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_ticket TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    estado_id UUID REFERENCES public.estados_ticket(id) ON DELETE SET NULL,
    tipo_problema_id UUID REFERENCES public.tipos_problema(id) ON DELETE SET NULL,
    solucion_id UUID REFERENCES public.soluciones(id) ON DELETE SET NULL,
    centro_contacto_id UUID REFERENCES public.call_centers(id) ON DELETE SET NULL,
    solicitante_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    tecnico_asignado_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    extension TEXT,
    puesto_trabajo TEXT,
    modalidad_trabajo TEXT,
    ip_vpn TEXT,
    nombre_solicitante TEXT,
    registro_estado TEXT DEFAULT 'activo',
    vector_busqueda TSVECTOR,
    fecha_asignacion TIMESTAMP WITH TIME ZONE,
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    escalados BOOLEAN DEFAULT FALSE
);\n\n`;

  // =========================================================================
  // 2. INSERCIÓN DE DATOS (02_datos_produccion.sql)
  // =========================================================================
  let sql2 = `-- =============================================================================\n`;
  sql2 += `-- 2. INSERCIÓN DE DATOS DE PRODUCCIÓN\n`;
  sql2 += `-- Proyecto: Support-Connect\n`;
  sql2 += `-- =============================================================================\n\n`;

  sql2 += `SET session_replication_role = 'replica';\n\n`;

  tables.forEach(table => {
    const filePath = path.join(BACKUP_DIR, `${table}.json`);
    if (!fs.existsSync(filePath)) return;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!Array.isArray(data) || data.length === 0) return;

    sql2 += `-- Datos para la tabla: ${table} (${data.length} registros)\n`;

    data.forEach(row => {
      const keys = Object.keys(row);
      const cols = keys.map(k => `"${k}"`).join(', ');
      const vals = keys.map(k => {
        const val = row[k];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number') return val;
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return `'${String(val).replace(/'/g, "''")}'`;
      }).join(', ');

      sql2 += `INSERT INTO public.${table} (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`;
    });

    sql2 += `\n`;
  });

  sql2 += `SET session_replication_role = 'origin';\n\n`;

  // =========================================================================
  // 3. TRIGGERS Y FUNCIONES (03_triggers_y_funciones.sql)
  // =========================================================================
  let sql3 = `-- =============================================================================\n`;
  sql3 += `-- 3. SECUENCIAS, FUNCIONES PLPGSQL Y TRIGGERS AUTOMÁTICOS\n`;
  sql3 += `-- Proyecto: Support-Connect\n`;
  sql3 += `-- =============================================================================\n\n`;

  sql3 += `CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START WITH 10500;\n\n`;

  sql3 += `CREATE OR REPLACE FUNCTION public.generar_numero_ticket_auto()
RETURNS trigger AS $$
BEGIN
  IF NEW.numero_ticket IS NULL OR NEW.numero_ticket = '' THEN
    IF NEW.escalados IS TRUE THEN
      NEW.numero_ticket := 'TCKIT-' || lpad(nextval('public.ticket_number_seq')::text, 5, '0');
    ELSE
      NEW.numero_ticket := 'TCK-' || lpad(nextval('public.ticket_number_seq')::text, 5, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;\n\n`;

  sql3 += `DROP TRIGGER IF EXISTS trg_generar_numero_ticket ON public.tickets;\n`;
  sql3 += `CREATE TRIGGER trg_generar_numero_ticket
BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.generar_numero_ticket_auto();\n\n`;

  sql3 += `CREATE OR REPLACE FUNCTION public.tickets_vector_busqueda_update()
RETURNS trigger AS $$
BEGIN
  NEW.vector_busqueda :=
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.numero_ticket, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.nombre_solicitante, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.titulo, '')), 'B') ||
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.puesto_trabajo, '')), 'C') ||
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.descripcion, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;\n\n`;

  sql3 += `DROP TRIGGER IF EXISTS trg_tickets_vector_busqueda ON public.tickets;\n`;
  sql3 += `CREATE TRIGGER trg_tickets_vector_busqueda
BEFORE INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.tickets_vector_busqueda_update();\n\n`;

  // =========================================================================
  // 4. ÍNDICES Y FUNCIONES RPC (04_indices_y_rpc.sql)
  // =========================================================================
  let sql4 = `-- =============================================================================\n`;
  sql4 += `-- 4. ÍNDICES DE RENDIMIENTO Y FUNCIONES RPC DE SISTEMA\n`;
  sql4 += `-- Proyecto: Support-Connect\n`;
  sql4 += `-- =============================================================================\n\n`;

  sql4 += `-- ÍNDICES DE ALTO RENDIMIENTO\n`;
  sql4 += `CREATE INDEX IF NOT EXISTS idx_tickets_estado_id ON public.tickets(estado_id);\n`;
  sql4 += `CREATE INDEX IF NOT EXISTS idx_tickets_tecnico_asignado_id ON public.tickets(tecnico_asignado_id);\n`;
  sql4 += `CREATE INDEX IF NOT EXISTS idx_tickets_solicitante_id ON public.tickets(solicitante_id);\n`;
  sql4 += `CREATE INDEX IF NOT EXISTS idx_tickets_centro_contacto_id ON public.tickets(centro_contacto_id);\n`;
  sql4 += `CREATE INDEX IF NOT EXISTS idx_tickets_tipo_problema_id ON public.tickets(tipo_problema_id);\n`;
  sql4 += `CREATE INDEX IF NOT EXISTS idx_tickets_creado_en ON public.tickets(creado_en DESC);\n`;
  sql4 += `CREATE INDEX IF NOT EXISTS idx_tickets_fecha_cierre ON public.tickets(fecha_cierre);\n`;
  sql4 += `CREATE INDEX IF NOT EXISTS idx_tickets_fecha_asignacion ON public.tickets(fecha_asignacion);\n`;
  sql4 += `CREATE INDEX IF NOT EXISTS idx_tickets_vector_busqueda ON public.tickets USING gin(vector_busqueda);\n\n`;

  sql4 += `-- FUNCIONES RPC DE SISTEMA Y AUTENTICACIÓN\n\n`;

  sql4 += `CREATE OR REPLACE FUNCTION public.login_seguro(
    p_email TEXT,
    p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
    v_roles JSON;
BEGIN
    SELECT * INTO v_user
    FROM public.usuarios
    WHERE LOWER(email) = LOWER(p_email)
    LIMIT 1;

    IF v_user IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Correo o contraseña incorrectos');
    END IF;

    IF v_user.esta_activo = FALSE THEN
        RETURN json_build_object('success', false, 'message', 'Tu cuenta ha sido deshabilitada');
    END IF;

    IF v_user.password IS NULL OR (
        v_user.password NOT LIKE '$2%' AND v_user.password <> p_password
    ) OR (
        v_user.password LIKE '$2%' AND crypt(p_password, v_user.password) <> v_user.password
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Correo o contraseña incorrectos');
    END IF;

    SELECT json_agg(json_build_object('id', r.id, 'nombre', r.nombre, 'descripcion', r.descripcion))
    INTO v_roles
    FROM public.roles_usuario ru
    JOIN public.roles r ON r.id = ru.rol_id
    WHERE ru.usuario_id = v_user.id;

    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', v_user.id,
            'email', v_user.email,
            'nombre_completo', v_user.nombre_completo,
            'debe_cambiar_password', COALESCE(v_user.debe_cambiar_password, false),
            'roles', COALESCE(v_roles, '[]'::json)
        )
    );
END;
$$;\n\n`;

  sql4 += `CREATE OR REPLACE FUNCTION public.cambiar_password_seguro(
    p_user_id UUID,
    p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.usuarios
    SET 
        password = crypt(p_new_password, gen_salt('bf', 10)),
        debe_cambiar_password = FALSE,
        actualizado_en = NOW()
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Usuario no encontrado');
    END IF;

    RETURN json_build_object('success', true, 'message', 'Contraseña actualizada exitosamente');
END;
$$;\n\n`;

  // Guardar los 4 archivos separados
  fs.writeFileSync(OUTPUT_01, sql1, 'utf-8');
  fs.writeFileSync(OUTPUT_02, sql2, 'utf-8');
  fs.writeFileSync(OUTPUT_03, sql3, 'utf-8');
  fs.writeFileSync(OUTPUT_04, sql4, 'utf-8');

  // Guardar el dump unificado completo
  const fullSql = sql1 + sql2 + sql3 + sql4;
  fs.writeFileSync(OUTPUT_FULL, fullSql, 'utf-8');

  console.log(`✅ Archivos SQL generados exitosamente en database_backup_prod/:\n`);
  console.log(`   1️⃣  01_estructura_tablas.sql   (Estructura y esquemas)`);
  console.log(`   2️⃣  02_datos_produccion.sql     (Inserts de datos de producción)`);
  console.log(`   3️⃣  03_triggers_y_funciones.sql (Triggers y secuencias plpgsql)`);
  console.log(`   4️⃣  04_indices_y_rpc.sql        (Índices y funciones RPC de sistema)`);
  console.log(`   📦 full_database_dump.sql       (Dump unificado completo)\n`);
}

generateSQLDump();
