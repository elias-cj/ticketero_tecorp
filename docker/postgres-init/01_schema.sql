--
-- PostgreSQL database dump
--


-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

-- Started on 2026-09-19 20:32:19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3 (class 3079 OID 26597)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5318 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 2 (class 3079 OID 26586)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5319 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 307 (class 1255 OID 26978)
-- Name: cambiar_password_seguro(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cambiar_password_seguro(p_user_id uuid, p_new_password text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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
$$;


--
-- TOC entry 298 (class 1255 OID 26964)
-- Name: generar_numero_ticket_auto(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_numero_ticket_auto() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
      $$;


--
-- TOC entry 306 (class 1255 OID 26977)
-- Name: login_seguro(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.login_seguro(p_email text, p_password text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
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
$_$;


--
-- TOC entry 308 (class 1255 OID 26997)
-- Name: obtener_metricas_dashboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_metricas_dashboard() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- TOC entry 309 (class 1255 OID 27057)
-- Name: sembrar_matriz_rbac_inicial(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sembrar_matriz_rbac_inicial() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
      $$;


--
-- TOC entry 293 (class 1255 OID 26966)
-- Name: tickets_vector_busqueda_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tickets_vector_busqueda_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.vector_busqueda :=
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.numero_ticket, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.nombre_solicitante, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.titulo, '')), 'B') ||
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.puesto_trabajo, '')), 'C') ||
    setweight(to_tsvector('pg_catalog.spanish', COALESCE(NEW.descripcion, '')), 'D');
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 224 (class 1259 OID 26675)
-- Name: acciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.acciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL
);


--
-- TOC entry 236 (class 1259 OID 26864)
-- Name: asignados_tarea; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asignados_tarea (
    tarea_id uuid NOT NULL,
    tecnico_id uuid NOT NULL,
    asignado_en timestamp with time zone DEFAULT now()
);


--
-- TOC entry 221 (class 1259 OID 26635)
-- Name: call_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_centers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo text,
    nombre text NOT NULL,
    pais text,
    nivel_servicio text,
    esta_activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now(),
    nombre_corto text,
    codigo_telefono text,
    color_bandera text
);


--
-- TOC entry 228 (class 1259 OID 26736)
-- Name: categorias_problema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_problema (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL
);


--
-- TOC entry 227 (class 1259 OID 26724)
-- Name: estados_ticket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estados_ticket (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL
);


--
-- TOC entry 245 (class 1259 OID 27081)
-- Name: historial_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_inventario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inventario_id uuid,
    responsable text NOT NULL,
    centro_contacto_id uuid,
    fecha_entrega date DEFAULT CURRENT_DATE,
    fecha_devolucion date,
    motivo text DEFAULT 'Asignación inicial'::text,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- TOC entry 234 (class 1259 OID 26829)
-- Name: horarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.horarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tecnico_id uuid,
    turno_id uuid,
    fecha_horario date NOT NULL
);


--
-- TOC entry 241 (class 1259 OID 26986)
-- Name: informacion_empresa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.informacion_empresa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre_comercial text,
    razon_social text,
    id_fiscal text,
    direccion text,
    telefono text,
    email_contacto text,
    logo_url text,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 243 (class 1259 OID 27017)
-- Name: inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo text,
    nombre text NOT NULL,
    categoria text,
    numero_serie text,
    estado text DEFAULT 'Disponible'::text,
    asignado_a text,
    centro_contacto_id uuid,
    notas text,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega date DEFAULT CURRENT_DATE,
    fecha_devolucion date,
    caracteristicas text
);


--
-- TOC entry 244 (class 1259 OID 27040)
-- Name: licencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licencias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    proveedor text,
    clave_licencia text,
    cantidad_total integer DEFAULT 1,
    cantidad_usada integer DEFAULT 0,
    fecha_compra date,
    fecha_vencimiento date,
    estado text DEFAULT 'Activa'::text,
    notas text,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 238 (class 1259 OID 26899)
-- Name: logs_auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    accion text NOT NULL,
    entidad text NOT NULL,
    detalles text,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- TOC entry 223 (class 1259 OID 26662)
-- Name: modulos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modulos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- TOC entry 225 (class 1259 OID 26687)
-- Name: permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permisos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    modulo_id uuid,
    accion_id uuid
);


--
-- TOC entry 226 (class 1259 OID 26706)
-- Name: permisos_rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permisos_rol (
    rol_id uuid NOT NULL,
    permiso_id uuid NOT NULL,
    asignado_en timestamp with time zone DEFAULT now()
);


--
-- TOC entry 242 (class 1259 OID 27002)
-- Name: prioridades_ticket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prioridades_ticket (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    nivel integer DEFAULT 1
);


--
-- TOC entry 237 (class 1259 OID 26882)
-- Name: registros_auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registros_auditoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    accion text NOT NULL,
    entidad text NOT NULL,
    entidad_id text,
    detalles jsonb,
    creado_en timestamp with time zone DEFAULT now()
);


--
-- TOC entry 222 (class 1259 OID 26649)
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    esta_activo boolean DEFAULT true
);


--
-- TOC entry 232 (class 1259 OID 26792)
-- Name: roles_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles_usuario (
    usuario_id uuid NOT NULL,
    rol_id uuid NOT NULL,
    asignado_por uuid,
    asignado_en timestamp with time zone DEFAULT now()
);


--
-- TOC entry 230 (class 1259 OID 26766)
-- Name: soluciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.soluciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text NOT NULL,
    descripcion text,
    creado_en timestamp with time zone DEFAULT now(),
    esta_activo boolean DEFAULT true
);


--
-- TOC entry 235 (class 1259 OID 26847)
-- Name: tareas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tareas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text NOT NULL,
    descripcion text,
    estado_id uuid,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    completado_en timestamp with time zone
);


--
-- TOC entry 240 (class 1259 OID 26963)
-- Name: ticket_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ticket_number_seq
    START WITH 10500
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 239 (class 1259 OID 26916)
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero_ticket text NOT NULL,
    titulo text NOT NULL,
    descripcion text,
    estado_id uuid,
    tipo_problema_id uuid,
    solucion_id uuid,
    centro_contacto_id uuid,
    solicitante_id uuid,
    tecnico_asignado_id uuid,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    extension text,
    puesto_trabajo text,
    modalidad_trabajo text,
    ip_vpn text,
    nombre_solicitante text,
    registro_estado text DEFAULT 'activo'::text,
    vector_busqueda tsvector,
    fecha_asignacion timestamp with time zone,
    fecha_cierre timestamp with time zone,
    escalados boolean DEFAULT false,
    descripcion_solucion text,
    cantidad_afectados text
);


--
-- TOC entry 229 (class 1259 OID 26748)
-- Name: tipos_problema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_problema (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    categoria_id uuid,
    esta_activo boolean DEFAULT true
);


--
-- TOC entry 233 (class 1259 OID 26815)
-- Name: turnos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turnos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL
);


--
-- TOC entry 231 (class 1259 OID 26778)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre_completo text NOT NULL,
    email text,
    telefono text,
    url_avatar text,
    esta_activo boolean DEFAULT true,
    creado_en timestamp with time zone DEFAULT now(),
    actualizado_en timestamp with time zone DEFAULT now(),
    password text,
    debe_cambiar_password boolean DEFAULT false
);


--
-- TOC entry 5074 (class 2606 OID 26686)
-- Name: acciones acciones_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acciones
    ADD CONSTRAINT acciones_nombre_key UNIQUE (nombre);


--
-- TOC entry 5076 (class 2606 OID 26684)
-- Name: acciones acciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acciones
    ADD CONSTRAINT acciones_pkey PRIMARY KEY (id);


--
-- TOC entry 5110 (class 2606 OID 26871)
-- Name: asignados_tarea asignados_tarea_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignados_tarea
    ADD CONSTRAINT asignados_tarea_pkey PRIMARY KEY (tarea_id, tecnico_id);


--
-- TOC entry 5062 (class 2606 OID 26648)
-- Name: call_centers call_centers_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_centers
    ADD CONSTRAINT call_centers_codigo_key UNIQUE (codigo);


--
-- TOC entry 5064 (class 2606 OID 26646)
-- Name: call_centers call_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_centers
    ADD CONSTRAINT call_centers_pkey PRIMARY KEY (id);


--
-- TOC entry 5088 (class 2606 OID 26747)
-- Name: categorias_problema categorias_problema_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_problema
    ADD CONSTRAINT categorias_problema_nombre_key UNIQUE (nombre);


--
-- TOC entry 5090 (class 2606 OID 26745)
-- Name: categorias_problema categorias_problema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_problema
    ADD CONSTRAINT categorias_problema_pkey PRIMARY KEY (id);


--
-- TOC entry 5084 (class 2606 OID 26735)
-- Name: estados_ticket estados_ticket_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados_ticket
    ADD CONSTRAINT estados_ticket_nombre_key UNIQUE (nombre);


--
-- TOC entry 5086 (class 2606 OID 26733)
-- Name: estados_ticket estados_ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados_ticket
    ADD CONSTRAINT estados_ticket_pkey PRIMARY KEY (id);


--
-- TOC entry 5139 (class 2606 OID 27093)
-- Name: historial_inventario historial_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_inventario
    ADD CONSTRAINT historial_inventario_pkey PRIMARY KEY (id);


--
-- TOC entry 5106 (class 2606 OID 26836)
-- Name: horarios horarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_pkey PRIMARY KEY (id);


--
-- TOC entry 5131 (class 2606 OID 26996)
-- Name: informacion_empresa informacion_empresa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.informacion_empresa
    ADD CONSTRAINT informacion_empresa_pkey PRIMARY KEY (id);


--
-- TOC entry 5135 (class 2606 OID 27029)
-- Name: inventario inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);


--
-- TOC entry 5137 (class 2606 OID 27054)
-- Name: licencias licencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licencias
    ADD CONSTRAINT licencias_pkey PRIMARY KEY (id);


--
-- TOC entry 5114 (class 2606 OID 26910)
-- Name: logs_auditoria logs_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_auditoria
    ADD CONSTRAINT logs_auditoria_pkey PRIMARY KEY (id);


--
-- TOC entry 5070 (class 2606 OID 26674)
-- Name: modulos modulos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_nombre_key UNIQUE (nombre);


--
-- TOC entry 5072 (class 2606 OID 26672)
-- Name: modulos modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_pkey PRIMARY KEY (id);


--
-- TOC entry 5078 (class 2606 OID 26693)
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id);


--
-- TOC entry 5082 (class 2606 OID 26713)
-- Name: permisos_rol permisos_rol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos_rol
    ADD CONSTRAINT permisos_rol_pkey PRIMARY KEY (rol_id, permiso_id);


--
-- TOC entry 5133 (class 2606 OID 27012)
-- Name: prioridades_ticket prioridades_ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prioridades_ticket
    ADD CONSTRAINT prioridades_ticket_pkey PRIMARY KEY (id);


--
-- TOC entry 5112 (class 2606 OID 26893)
-- Name: registros_auditoria registros_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_auditoria
    ADD CONSTRAINT registros_auditoria_pkey PRIMARY KEY (id);


--
-- TOC entry 5066 (class 2606 OID 26661)
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- TOC entry 5068 (class 2606 OID 26659)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5100 (class 2606 OID 26799)
-- Name: roles_usuario roles_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_usuario
    ADD CONSTRAINT roles_usuario_pkey PRIMARY KEY (usuario_id, rol_id);


--
-- TOC entry 5096 (class 2606 OID 26777)
-- Name: soluciones soluciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.soluciones
    ADD CONSTRAINT soluciones_pkey PRIMARY KEY (id);


--
-- TOC entry 5108 (class 2606 OID 26858)
-- Name: tareas tareas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas
    ADD CONSTRAINT tareas_pkey PRIMARY KEY (id);


--
-- TOC entry 5127 (class 2606 OID 26932)
-- Name: tickets tickets_numero_ticket_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_numero_ticket_key UNIQUE (numero_ticket);


--
-- TOC entry 5129 (class 2606 OID 26930)
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- TOC entry 5092 (class 2606 OID 26760)
-- Name: tipos_problema tipos_problema_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_problema
    ADD CONSTRAINT tipos_problema_nombre_key UNIQUE (nombre);


--
-- TOC entry 5094 (class 2606 OID 26758)
-- Name: tipos_problema tipos_problema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_problema
    ADD CONSTRAINT tipos_problema_pkey PRIMARY KEY (id);


--
-- TOC entry 5102 (class 2606 OID 26828)
-- Name: turnos turnos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_nombre_key UNIQUE (nombre);


--
-- TOC entry 5104 (class 2606 OID 26826)
-- Name: turnos turnos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_pkey PRIMARY KEY (id);


--
-- TOC entry 5080 (class 2606 OID 26695)
-- Name: permisos unique_modulo_accion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT unique_modulo_accion UNIQUE (modulo_id, accion_id);


--
-- TOC entry 5098 (class 2606 OID 26791)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- TOC entry 5115 (class 1259 OID 26999)
-- Name: idx_tickets_centro_contacto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_centro_contacto ON public.tickets USING btree (centro_contacto_id);


--
-- TOC entry 5116 (class 1259 OID 26971)
-- Name: idx_tickets_centro_contacto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_centro_contacto_id ON public.tickets USING btree (centro_contacto_id);


--
-- TOC entry 5117 (class 1259 OID 26973)
-- Name: idx_tickets_creado_en; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_creado_en ON public.tickets USING btree (creado_en DESC);


--
-- TOC entry 5118 (class 1259 OID 26968)
-- Name: idx_tickets_estado_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_estado_id ON public.tickets USING btree (estado_id);


--
-- TOC entry 5119 (class 1259 OID 26975)
-- Name: idx_tickets_fecha_asignacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_fecha_asignacion ON public.tickets USING btree (fecha_asignacion);


--
-- TOC entry 5120 (class 1259 OID 26974)
-- Name: idx_tickets_fecha_cierre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_fecha_cierre ON public.tickets USING btree (fecha_cierre);


--
-- TOC entry 5121 (class 1259 OID 26970)
-- Name: idx_tickets_solicitante_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_solicitante_id ON public.tickets USING btree (solicitante_id);


--
-- TOC entry 5122 (class 1259 OID 26998)
-- Name: idx_tickets_tecnico_asignado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_tecnico_asignado ON public.tickets USING btree (tecnico_asignado_id);


--
-- TOC entry 5123 (class 1259 OID 26969)
-- Name: idx_tickets_tecnico_asignado_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_tecnico_asignado_id ON public.tickets USING btree (tecnico_asignado_id);


--
-- TOC entry 5124 (class 1259 OID 26972)
-- Name: idx_tickets_tipo_problema_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_tipo_problema_id ON public.tickets USING btree (tipo_problema_id);


--
-- TOC entry 5125 (class 1259 OID 26976)
-- Name: idx_tickets_vector_busqueda; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_vector_busqueda ON public.tickets USING gin (vector_busqueda);


--
-- TOC entry 5164 (class 2620 OID 27073)
-- Name: tickets trg_generar_numero_ticket; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generar_numero_ticket BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.generar_numero_ticket_auto();


--
-- TOC entry 5165 (class 2620 OID 26967)
-- Name: tickets trg_tickets_vector_busqueda; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tickets_vector_busqueda BEFORE INSERT OR UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.tickets_vector_busqueda_update();


--
-- TOC entry 5151 (class 2606 OID 26872)
-- Name: asignados_tarea asignados_tarea_tarea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignados_tarea
    ADD CONSTRAINT asignados_tarea_tarea_id_fkey FOREIGN KEY (tarea_id) REFERENCES public.tareas(id) ON DELETE CASCADE;


--
-- TOC entry 5152 (class 2606 OID 26877)
-- Name: asignados_tarea asignados_tarea_tecnico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignados_tarea
    ADD CONSTRAINT asignados_tarea_tecnico_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5162 (class 2606 OID 27099)
-- Name: historial_inventario historial_inventario_centro_contacto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_inventario
    ADD CONSTRAINT historial_inventario_centro_contacto_id_fkey FOREIGN KEY (centro_contacto_id) REFERENCES public.call_centers(id) ON DELETE SET NULL;


--
-- TOC entry 5163 (class 2606 OID 27094)
-- Name: historial_inventario historial_inventario_inventario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_inventario
    ADD CONSTRAINT historial_inventario_inventario_id_fkey FOREIGN KEY (inventario_id) REFERENCES public.inventario(id) ON DELETE CASCADE;


--
-- TOC entry 5148 (class 2606 OID 26837)
-- Name: horarios horarios_tecnico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_tecnico_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5149 (class 2606 OID 26842)
-- Name: horarios horarios_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.horarios
    ADD CONSTRAINT horarios_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id) ON DELETE CASCADE;


--
-- TOC entry 5161 (class 2606 OID 27035)
-- Name: inventario inventario_centro_contacto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_centro_contacto_id_fkey FOREIGN KEY (centro_contacto_id) REFERENCES public.call_centers(id) ON DELETE SET NULL;


--
-- TOC entry 5154 (class 2606 OID 26911)
-- Name: logs_auditoria logs_auditoria_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_auditoria
    ADD CONSTRAINT logs_auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- TOC entry 5140 (class 2606 OID 26701)
-- Name: permisos permisos_accion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_accion_id_fkey FOREIGN KEY (accion_id) REFERENCES public.acciones(id) ON DELETE CASCADE;


--
-- TOC entry 5141 (class 2606 OID 26696)
-- Name: permisos permisos_modulo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_modulo_id_fkey FOREIGN KEY (modulo_id) REFERENCES public.modulos(id) ON DELETE CASCADE;


--
-- TOC entry 5142 (class 2606 OID 26719)
-- Name: permisos_rol permisos_rol_permiso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos_rol
    ADD CONSTRAINT permisos_rol_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES public.permisos(id) ON DELETE CASCADE;


--
-- TOC entry 5143 (class 2606 OID 26714)
-- Name: permisos_rol permisos_rol_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos_rol
    ADD CONSTRAINT permisos_rol_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 5153 (class 2606 OID 26894)
-- Name: registros_auditoria registros_auditoria_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_auditoria
    ADD CONSTRAINT registros_auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- TOC entry 5145 (class 2606 OID 26810)
-- Name: roles_usuario roles_usuario_asignado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_usuario
    ADD CONSTRAINT roles_usuario_asignado_por_fkey FOREIGN KEY (asignado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- TOC entry 5146 (class 2606 OID 26805)
-- Name: roles_usuario roles_usuario_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_usuario
    ADD CONSTRAINT roles_usuario_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 5147 (class 2606 OID 26800)
-- Name: roles_usuario roles_usuario_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_usuario
    ADD CONSTRAINT roles_usuario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 5150 (class 2606 OID 26859)
-- Name: tareas tareas_estado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas
    ADD CONSTRAINT tareas_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES public.estados_ticket(id) ON DELETE SET NULL;


--
-- TOC entry 5155 (class 2606 OID 26948)
-- Name: tickets tickets_centro_contacto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_centro_contacto_id_fkey FOREIGN KEY (centro_contacto_id) REFERENCES public.call_centers(id) ON DELETE SET NULL;


--
-- TOC entry 5156 (class 2606 OID 26933)
-- Name: tickets tickets_estado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES public.estados_ticket(id) ON DELETE SET NULL;


--
-- TOC entry 5157 (class 2606 OID 26953)
-- Name: tickets tickets_solicitante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_solicitante_id_fkey FOREIGN KEY (solicitante_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- TOC entry 5158 (class 2606 OID 26943)
-- Name: tickets tickets_solucion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_solucion_id_fkey FOREIGN KEY (solucion_id) REFERENCES public.soluciones(id) ON DELETE SET NULL;


--
-- TOC entry 5159 (class 2606 OID 26958)
-- Name: tickets tickets_tecnico_asignado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_tecnico_asignado_id_fkey FOREIGN KEY (tecnico_asignado_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- TOC entry 5160 (class 2606 OID 26938)
-- Name: tickets tickets_tipo_problema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_tipo_problema_id_fkey FOREIGN KEY (tipo_problema_id) REFERENCES public.tipos_problema(id) ON DELETE SET NULL;


--
-- TOC entry 5144 (class 2606 OID 26761)
-- Name: tipos_problema tipos_problema_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_problema
    ADD CONSTRAINT tipos_problema_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_problema(id) ON DELETE SET NULL;


-- Completed on 2026-09-19 20:32:19

--
-- PostgreSQL database dump complete
--


