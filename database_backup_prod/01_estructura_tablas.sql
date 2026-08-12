-- =============================================================================
-- 1. EXTENSIONES Y ESTRUCTURA DE TABLAS POSTGRESQL
-- Proyecto: Support-Connect
-- Generado: 2026-08-09T00:32:40.008Z
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.call_centers (
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

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    esta_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.modulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.acciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo_id UUID REFERENCES public.modulos(id) ON DELETE CASCADE,
    accion_id UUID REFERENCES public.acciones(id) ON DELETE CASCADE,
    CONSTRAINT unique_modulo_accion UNIQUE (modulo_id, accion_id)
);

CREATE TABLE IF NOT EXISTS public.permisos_rol (
    rol_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permiso_id UUID REFERENCES public.permisos(id) ON DELETE CASCADE,
    asignado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE IF NOT EXISTS public.estados_ticket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categorias_problema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tipos_problema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    categoria_id UUID REFERENCES public.categorias_problema(id) ON DELETE SET NULL,
    esta_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.soluciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    esta_activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.usuarios (
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

CREATE TABLE IF NOT EXISTS public.roles_usuario (
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    rol_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    asignado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    asignado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (usuario_id, rol_id)
);

CREATE TABLE IF NOT EXISTS public.turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS public.horarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tecnico_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    turno_id UUID REFERENCES public.turnos(id) ON DELETE CASCADE,
    fecha_horario DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tareas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion TEXT,
    estado_id UUID REFERENCES public.estados_ticket(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completado_en TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.asignados_tarea (
    tarea_id UUID REFERENCES public.tareas(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    asignado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (tarea_id, tecnico_id)
);

CREATE TABLE IF NOT EXISTS public.registros_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    entidad_id TEXT,
    detalles JSONB,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.logs_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    detalles TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_ticket TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    cantidad_afectados TEXT,
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
    escalados BOOLEAN DEFAULT FALSE,
    descripcion_solucion TEXT
);

