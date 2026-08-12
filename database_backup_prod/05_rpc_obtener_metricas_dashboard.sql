-- =============================================================================
-- FUNCION RPC OPTIMIZADA PARA METRICAS DEL DASHBOARD EN POSTGRESQL
-- Proyecto: Support-Connect
-- Ejecutar en PostgreSQL (PgAdmin, DBeaver, Laragon o psql)
-- =============================================================================

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
    -- 1. Total de tickets procesados
    SELECT COUNT(*) INTO v_total FROM public.tickets;

    -- 2. Conteo Mes Actual
    SELECT COUNT(*) INTO v_current_month 
    FROM public.tickets 
    WHERE creado_en >= date_trunc('month', CURRENT_DATE);

    -- 3. Conteo Mes Pasado
    SELECT COUNT(*) INTO v_last_month 
    FROM public.tickets 
    WHERE creado_en >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
      AND creado_en < date_trunc('month', CURRENT_DATE);

    -- 4. Tickets sin asignar
    SELECT COUNT(*) INTO v_unassigned 
    FROM public.tickets 
    WHERE tecnico_asignado_id IS NULL;

    -- 5. Tickets escalados
    SELECT COUNT(*) INTO v_escalated 
    FROM public.tickets 
    WHERE escalados = TRUE;

    -- 6. Tareas pendientes
    SELECT COUNT(*) INTO v_pending_tasks 
    FROM public.tareas;

    -- 7. Distribución por País / Sede
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

    -- 8. Distribución por Modalidad de Trabajo
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

    -- 9. Distribución por Tipo de Problema
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

    -- 10. Rendimiento y Tiempo Promedio de Resolución por Técnico (Filtro por rol Soporte Técnico)
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

    -- Construir la respuesta final unificada en JSON
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


-- Índices para acelerar joins de RBAC
CREATE INDEX IF NOT EXISTS idx_permisos_modulo_accion ON public.permisos(modulo_id, accion_id);
CREATE INDEX IF NOT EXISTS idx_permisos_rol_rol_id ON public.permisos_rol(rol_id);
CREATE INDEX IF NOT EXISTS idx_permisos_rol_permiso_id ON public.permisos_rol(permiso_id);
CREATE INDEX IF NOT EXISTS idx_roles_usuario_usuario_id ON public.roles_usuario(usuario_id);
