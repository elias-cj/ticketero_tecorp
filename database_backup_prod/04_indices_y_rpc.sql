-- =============================================================================
-- 4. ÍNDICES DE RENDIMIENTO Y FUNCIONES RPC DE SISTEMA
-- Proyecto: Support-Connect
-- =============================================================================

-- ÍNDICES DE ALTO RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_tickets_estado_id ON public.tickets(estado_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tecnico_asignado_id ON public.tickets(tecnico_asignado_id);
CREATE INDEX IF NOT EXISTS idx_tickets_solicitante_id ON public.tickets(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_tickets_centro_contacto_id ON public.tickets(centro_contacto_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tipo_problema_id ON public.tickets(tipo_problema_id);
CREATE INDEX IF NOT EXISTS idx_tickets_creado_en ON public.tickets(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_fecha_cierre ON public.tickets(fecha_cierre);
CREATE INDEX IF NOT EXISTS idx_tickets_fecha_asignacion ON public.tickets(fecha_asignacion);
CREATE INDEX IF NOT EXISTS idx_tickets_vector_busqueda ON public.tickets USING gin(vector_busqueda);

-- FUNCIONES RPC DE SISTEMA Y AUTENTICACIÓN

CREATE OR REPLACE FUNCTION public.login_seguro(
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
$$;

CREATE OR REPLACE FUNCTION public.cambiar_password_seguro(
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
$$;

