-- =============================================================================
-- FUNCIONES RPC Y AJUSTES DE SEGURIDAD PARA POSTGRESQL EN DOCKER
-- SupportConnect Platform
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Función RPC: login_seguro
CREATE OR REPLACE FUNCTION public.login_seguro(p_email text, p_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

-- 2. Función RPC: obtener_metricas_dashboard
CREATE OR REPLACE FUNCTION public.obtener_metricas_dashboard()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
      $function$;

-- 3. Función RPC: cambiar_password_seguro
CREATE OR REPLACE FUNCTION public.cambiar_password_seguro(p_user_id uuid, p_new_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

-- 4. Asegurar contraseña "admin" para la cuenta SuperAdmin (admin@admin.com)
UPDATE public.usuarios
SET password = crypt('admin', gen_salt('bf', 10)),
    debe_cambiar_password = FALSE
WHERE LOWER(email) = 'admin@admin.com';
