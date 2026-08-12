-- =============================================================================
-- INICIALIZACIÓN DE ESQUEMA LOCAL DE BASE DE DATOS
-- =============================================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. call_centers
CREATE TABLE IF NOT EXISTS call_centers (
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
);

-- 2. roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    esta_activo BOOLEAN DEFAULT TRUE
);

-- 3. modulos
CREATE TABLE IF NOT EXISTS modulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. acciones
CREATE TABLE IF NOT EXISTS acciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL
);

-- 5. permisos
CREATE TABLE IF NOT EXISTS permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo_id UUID REFERENCES modulos(id) ON DELETE CASCADE,
    accion_id UUID REFERENCES acciones(id) ON DELETE CASCADE,
    CONSTRAINT unique_modulo_accion UNIQUE (modulo_id, accion_id)
);

-- 6. permisos_rol
CREATE TABLE IF NOT EXISTS permisos_rol (
    rol_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id UUID REFERENCES permisos(id) ON DELETE CASCADE,
    asignado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (rol_id, permiso_id)
);

-- 7. estados_ticket
CREATE TABLE IF NOT EXISTS estados_ticket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL
);

-- 8. prioridades_ticket
CREATE TABLE IF NOT EXISTS prioridades_ticket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    nivel INTEGER DEFAULT 2
);

-- 9. categorias_problema
CREATE TABLE IF NOT EXISTS categorias_problema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL
);

-- 10. tipos_problema
CREATE TABLE IF NOT EXISTS tipos_problema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    categoria_id UUID REFERENCES categorias_problema(id) ON DELETE SET NULL,
    esta_activo BOOLEAN DEFAULT TRUE
);

-- 11. soluciones
CREATE TABLE IF NOT EXISTS soluciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    esta_activo BOOLEAN DEFAULT TRUE
);

-- 12. usuarios
CREATE TABLE IF NOT EXISTS usuarios (
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
);

-- 13. detalles_tecnico
CREATE TABLE IF NOT EXISTS detalles_tecnico (
    usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    especialidad_id UUID, -- Referencia opcional a especialidades
    centro_contacto_id UUID REFERENCES call_centers(id) ON DELETE SET NULL
);

-- 14. roles_usuario
CREATE TABLE IF NOT EXISTS roles_usuario (
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    asignado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    asignado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (usuario_id, rol_id)
);

-- 15. turnos
CREATE TABLE IF NOT EXISTS turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL
);

-- 16. horarios
CREATE TABLE IF NOT EXISTS horarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tecnico_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    turno_id UUID REFERENCES turnos(id) ON DELETE CASCADE,
    fecha_horario DATE NOT NULL
);

-- 17. tareas
CREATE TABLE IF NOT EXISTS tareas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion TEXT,
    estado_id UUID REFERENCES estados_ticket(id) ON DELETE SET NULL,
    prioridad_id UUID REFERENCES prioridades_ticket(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. asignados_tarea
CREATE TABLE IF NOT EXISTS asignados_tarea (
    tarea_id UUID REFERENCES tareas(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    asignado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (tarea_id, tecnico_id)
);

-- 19. tickets
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_ticket TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    estado_id UUID REFERENCES estados_ticket(id) ON DELETE SET NULL,
    prioridad_id UUID REFERENCES prioridades_ticket(id) ON DELETE SET NULL,
    tipo_problema_id UUID REFERENCES tipos_problema(id) ON DELETE SET NULL,
    solucion_id UUID REFERENCES soluciones(id) ON DELETE SET NULL,
    centro_contacto_id UUID REFERENCES call_centers(id) ON DELETE SET NULL,
    solicitante_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    tecnico_asignado_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    extension TEXT,
    puesto_trabajo TEXT,
    modalidad_trabajo TEXT,
    ip_vpn TEXT,
    nombre_solicitante TEXT,
    registro_estado TEXT,
    vector_busqueda tsvector,
    fecha_asignacion TIMESTAMP WITH TIME ZONE,
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    escalados BOOLEAN DEFAULT FALSE,
    descripcion_solucion TEXT,
    cantidad_afectados TEXT
);

-- =============================================================================
-- CONFIGURACIÓN DE TIEMPO REAL (REALTIME REPLICATION)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Agregar tablas a la publicación de tiempo real de forma segura
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE tareas;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE asignados_tarea;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;
