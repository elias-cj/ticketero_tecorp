-- =============================================================================
-- Migración / Corrección: Estado obligatorio y numeración correlativa desde TCK-00001
-- =============================================================================

-- 1. Asignar valor DEFAULT a estado_id en la tabla tickets
ALTER TABLE public.tickets 
  ALTER COLUMN estado_id SET DEFAULT '6c8a9009-475b-49cd-b4a0-e5497ee790c0'::uuid;

-- 2. Corregir cualquier ticket existente con estado nulo
UPDATE public.tickets
SET estado_id = COALESCE(
  (SELECT id FROM public.estados_ticket WHERE LOWER(TRIM(nombre)) = 'abierto' LIMIT 1),
  '6c8a9009-475b-49cd-b4a0-e5497ee790c0'::uuid
)
WHERE estado_id IS NULL;

-- 3. Si existe el ticket inicial de prueba TCK-10001, normalizarlo a TCK-00001
UPDATE public.tickets
SET numero_ticket = 'TCK-00001'
WHERE numero_ticket = 'TCK-10001'
  AND (SELECT count(*) FROM public.tickets) = 1;

-- 4. Actualizar la función del trigger para blindar estado_id y numeración desde 0
CREATE OR REPLACE FUNCTION public.generar_numero_ticket_auto() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_num INT;
  v_prefix TEXT;
BEGIN
  -- Blindaje: si viene NULL o vacío, asignar 'Abierto'
  IF NEW.estado_id IS NULL THEN
    NEW.estado_id := COALESCE(
      (SELECT id FROM public.estados_ticket WHERE lower(trim(nombre)) = 'abierto' LIMIT 1),
      '6c8a9009-475b-49cd-b4a0-e5497ee790c0'::uuid
    );
  END IF;

  -- Generar correlativo iniciando en 00001 (0 + 1)
  IF NEW.numero_ticket IS NULL OR NEW.numero_ticket = '' THEN
    v_prefix := CASE WHEN NEW.escalados IS TRUE THEN 'TCKIT-' ELSE 'TCK-' END;
    
    SELECT COALESCE(
      MAX(
        NULLIF(
          regexp_replace(numero_ticket, '[^0-9]', '', 'g'), 
          ''
        )::INT
      ), 
      0
    )
    INTO v_max_num
    FROM public.tickets;

    NEW.numero_ticket := v_prefix || lpad((v_max_num + 1)::text, 5, '0');
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Garantizar trigger BEFORE INSERT en tickets
DROP TRIGGER IF EXISTS trg_generar_numero_ticket ON public.tickets;
CREATE TRIGGER trg_generar_numero_ticket
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generar_numero_ticket_auto();

-- 6. Sembrar permisos operativos base para roles estándar si están vacíos
-- 6. Sembrar permisos operativos base para roles estándar si están vacíos
-- Técnico de Soporte / Soporte Técnico:
INSERT INTO public.permisos_rol (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
JOIN public.modulos m ON m.id = p.modulo_id
JOIN public.acciones a ON a.id = p.accion_id
WHERE LOWER(TRIM(r.nombre)) IN ('técnico de soporte', 'soporte técnico', 'soporte')
  AND (
    (m.nombre = 'Dashboard')
    OR (m.nombre = 'Tickets' AND a.nombre IN ('VER', 'CREAR', 'EDITAR', 'LLAMAR'))
    OR (m.nombre = 'Tareas' AND a.nombre IN ('VER', 'CREAR', 'EDITAR'))
    OR (m.nombre = 'Cola IT' AND a.nombre IN ('VER'))
    OR (m.nombre = 'Soluciones' AND a.nombre IN ('VER', 'CREAR', 'EDITAR'))
    OR (m.nombre = 'Horarios' AND a.nombre IN ('VER'))
    OR (m.nombre = 'Tipos de Problema' AND a.nombre IN ('VER'))
    OR (m.nombre = 'Call Centers' AND a.nombre IN ('VER'))
  )
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- BI:
INSERT INTO public.permisos_rol (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
JOIN public.modulos m ON m.id = p.modulo_id
JOIN public.acciones a ON a.id = p.accion_id
WHERE r.nombre = 'BI'
  AND (
    (m.nombre = 'Dashboard')
    OR (m.nombre = 'Exportación' AND a.nombre IN ('VER', 'CREAR', 'EDITAR'))
    OR (m.nombre = 'Tickets' AND a.nombre IN ('VER'))
    OR (m.nombre = 'Call Centers' AND a.nombre IN ('VER'))
  )
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- IT:
INSERT INTO public.permisos_rol (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
JOIN public.modulos m ON m.id = p.modulo_id
JOIN public.acciones a ON a.id = p.accion_id
WHERE LOWER(r.nombre) IN ('it', 'técnico it')
  AND (
    (m.nombre = 'Dashboard')
    OR (m.nombre = 'Cola IT' AND a.nombre IN ('VER', 'CREAR', 'EDITAR'))
    OR (m.nombre = 'Inventario' AND a.nombre IN ('VER', 'CREAR', 'EDITAR'))
    OR (m.nombre = 'Licencias' AND a.nombre IN ('VER', 'CREAR', 'EDITAR'))
    OR (m.nombre = 'Tickets' AND a.nombre IN ('VER', 'EDITAR'))
    OR (m.nombre = 'Tareas' AND a.nombre IN ('VER', 'CREAR', 'EDITAR'))
  )
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 7. Estandarizar nombres de roles del sistema
UPDATE public.roles 
SET nombre = 'SuperAdmin', descripcion = 'Control total sobre todo el sistema (SuperAdmin)'
WHERE LOWER(TRIM(nombre)) IN ('administrador supremo', 'superadmin');

UPDATE public.roles 
SET nombre = 'Admin', descripcion = 'Administrador de operaciones y asignación'
WHERE LOWER(TRIM(nombre)) IN ('semiadm', 'administrador', 'admin');

UPDATE public.roles 
SET nombre = 'IT', descripcion = 'Especialista de infraestructura, redes y tickets escalados'
WHERE LOWER(TRIM(nombre)) IN ('it', 'técnico it');

UPDATE public.roles 
SET nombre = 'Soporte Técnico', descripcion = 'Gestión y resolución operativa de tickets estándar'
WHERE LOWER(TRIM(nombre)) IN ('técnico de soporte', 'soporte técnico', 'soporte');

-- 8. Tabla de Políticas de Asignación y Atención de Tickets
CREATE TABLE IF NOT EXISTS public.politicas_asignacion_tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo text NOT NULL UNIQUE, -- 'autoasignar', 'asignar_otros', 'atender_soporte', 'atender_it'
    nombre text NOT NULL,
    descripcion text,
    roles_ids jsonb DEFAULT '[]'::jsonb,
    usuarios_ids jsonb DEFAULT '[]'::jsonb,
    actualizado_en timestamp with time zone DEFAULT now()
);

-- Sembrar las 4 políticas base vinculando los IDs de roles actualizados
INSERT INTO public.politicas_asignacion_tickets (tipo, nombre, descripcion, roles_ids, usuarios_ids)
VALUES
  (
    'autoasignar',
    'Auto-asignación de Tickets',
    'Roles y usuarios con permiso para asignarse tickets a sí mismos (botón ASIGNARME).',
    (SELECT COALESCE(jsonb_agg(id::text), '[]'::jsonb) FROM public.roles WHERE nombre IN ('Soporte Técnico', 'IT', 'Admin', 'SuperAdmin')),
    '[]'::jsonb
  ),
  (
    'asignar_otros',
    'Asignación a Terceros',
    'Roles y usuarios con permiso para asignar o reasignar tickets a otros técnicos (menú ASIG / RE-ASIG).',
    (SELECT COALESCE(jsonb_agg(id::text), '[]'::jsonb) FROM public.roles WHERE nombre IN ('Admin', 'SuperAdmin')),
    '[]'::jsonb
  ),
  (
    'atender_soporte',
    'Atención en Cola de Soporte',
    'Roles y usuarios habilitados para atender y recibir tickets de la cola general de Soporte Técnico.',
    (SELECT COALESCE(jsonb_agg(id::text), '[]'::jsonb) FROM public.roles WHERE nombre IN ('Soporte Técnico', 'Admin', 'SuperAdmin')),
    '[]'::jsonb
  ),
  (
    'atender_it',
    'Atención en Cola IT (Escalados)',
    'Roles y usuarios habilitados para atender y recibir tickets escalados a IT Especializado.',
    (SELECT COALESCE(jsonb_agg(id::text), '[]'::jsonb) FROM public.roles WHERE nombre IN ('IT', 'Admin', 'SuperAdmin')),
    '[]'::jsonb
  )
ON CONFLICT (tipo) DO UPDATE
SET 
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  roles_ids = CASE 
    WHEN jsonb_array_length(public.politicas_asignacion_tickets.roles_ids) = 0 THEN EXCLUDED.roles_ids 
    ELSE public.politicas_asignacion_tickets.roles_ids 
  END,
  actualizado_en = now();
