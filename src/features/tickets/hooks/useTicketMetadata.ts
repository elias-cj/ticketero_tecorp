import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/queryKeys";

export interface PoliticaAsignacion {
  id: string;
  tipo: 'autoasignar' | 'asignar_otros' | 'atender_soporte' | 'atender_it';
  nombre: string;
  descripcion?: string;
  roles_ids: string[];
  usuarios_ids: string[];
}

/**
 * Hook global para obtener las políticas de asignación de tickets configuradas.
 */
export const useAssignmentPolicies = () => {
  return useQuery<PoliticaAsignacion[]>({
    queryKey: ["politicas_asignacion_tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("politicas_asignacion_tickets")
        .select("*");
      if (error || !data) return [];
      return data as PoliticaAsignacion[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook para determinar si un usuario puede autoasignarse o asignar tickets a terceros
 * según las políticas dinámicas configuradas en la base de datos.
 */
export const useUserAssignmentPermissions = (user: any) => {
  const { data: policies = [], isLoading: isLoadingPolicies } = useAssignmentPolicies();
  const currentUserId = user?.id || user?.userId;

  const userRolesList: string[] = (user?.roles || []).map((r: any) =>
    (typeof r === "string" ? r : r.nombre || "").toLowerCase().trim()
  );
  if (user?.role) userRolesList.push(user.role.toLowerCase().trim());
  if (user?.roleName) userRolesList.push(user.roleName.toLowerCase().trim());

  const isSuperAdmin = userRolesList.some((r) =>
    r.includes("superadmin") || r.includes("superadm") || r.includes("supremo")
  );

  // Consultar los roles en BD del usuario si no vinieron en el objeto user
  const { data: userDbRoles = [] } = useQuery({
    queryKey: ["user_assigned_roles", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data } = await supabase
        .from("roles_usuario")
        .select("rol_id, roles(id, nombre)")
        .eq("usuario_id", currentUserId);
      return data || [];
    },
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 10,
  });

  // Consolidar todos los IDs de roles del usuario actual
  const userRoleIdsSet = new Set<string>();
  if (user?.activeRoleId) userRoleIdsSet.add(user?.activeRoleId);
  (user?.roles || []).forEach((r: any) => {
    if (r?.id) userRoleIdsSet.add(r.id);
  });
  userDbRoles.forEach((ur: any) => {
    if (ur.rol_id) userRoleIdsSet.add(ur.rol_id);
    const rObj = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
    if (rObj?.id) userRoleIdsSet.add(rObj.id);
  });

  const checkPolicy = (tipo: 'autoasignar' | 'asignar_otros'): boolean => {
    if (isSuperAdmin) return true;
    const policy = policies.find((p) => p.tipo === tipo);

    // Fallback si la tabla de políticas aún no ha cargado o no existe el registro
    if (!policy || (!policy.roles_ids?.length && !policy.usuarios_ids?.length)) {
      if (tipo === 'asignar_otros') {
        return userRolesList.some((r) =>
          r.includes("admin") || r.includes("it") || r.includes("especializado") || r.includes("semiadm")
        );
      }
      return true; // por defecto soporte se puede autoasignar
    }

    const hasExplicitUser = currentUserId && (policy.usuarios_ids || []).includes(currentUserId);
    const hasAllowedRole = Array.from(userRoleIdsSet).some((rId) =>
      (policy.roles_ids || []).includes(rId)
    );

    return Boolean(hasExplicitUser || hasAllowedRole);
  };

  return {
    isSuperAdmin,
    canSelfAssign: checkPolicy('autoasignar'),
    canAssignToOthers: checkPolicy('asignar_otros'),
    isLoadingPolicies,
  };
};

export const useTicketMetadata = () => {
  // Query para mapa global nombre/id de técnicos (para mostrar nombres en cards)
  const { data: techniciansMap = new Map<string, string>() } = useQuery({
    queryKey: QUERY_KEYS.technicians,
    queryFn: async () => {
      const { data: users } = await supabase
        .from("usuarios")
        .select("id, nombre_completo");

      const map = new Map<string, string>();
      (users || []).forEach((t) => {
        if (t.id && t.nombre_completo) {
          map.set(t.id, t.nombre_completo);
        }
      });
      return map;
    },
    staleTime: 1000 * 60 * 30,
  });

  /**
   * Hook para obtener la lista de técnicos asignables según la cola y políticas dinámicas.
   *
   * Reglas de asignación:
   * - soporte: usuarios / roles configurados en la política 'atender_soporte'
   * - it:      usuarios / roles configurados en la política 'atender_it'
   */
  const useTechniciansByQueue = (
    queue: "soporte" | "it",
    currentUserId?: string,
    currentUserRoles?: string[]
  ) => {
    return useQuery({
      queryKey: ["technicians_by_queue", queue, currentUserId],
      queryFn: async () => {
        // 1. Traer usuarios activos (la ruta del backend ya incluye roles_usuario con roles)
        const { data: usersData, error: errorUsers } = await supabase
          .from("usuarios")
          .select("id, nombre_completo, esta_activo")
          .eq("esta_activo", true);

        if (errorUsers || !usersData || usersData.length === 0) return [];

        // 2. Mapear roles por usuario partiendo de los roles embebidos en cada usuario
        const userRolesMap: Record<string, { ids: string[]; names: string[] }> = {};
        usersData.forEach((u: any) => {
          if (!userRolesMap[u.id]) {
            userRolesMap[u.id] = { ids: [], names: [] };
          }
          if (Array.isArray(u.roles_usuario)) {
            u.roles_usuario.forEach((ru: any) => {
              if (ru.rol_id) userRolesMap[u.id].ids.push(String(ru.rol_id));
              const rObj = Array.isArray(ru.roles) ? ru.roles[0] : ru.roles;
              if (rObj?.id) userRolesMap[u.id].ids.push(String(rObj.id));
              if (rObj?.nombre) {
                userRolesMap[u.id].names.push(String(rObj.nombre).toLowerCase().trim());
              }
            });
          }
        });

        // 3. Traer asignaciones de roles como respaldo / sincronización adicional
        try {
          const { data: rolesData } = await supabase
            .from("roles_usuario")
            .select("usuario_id, rol_id, roles(id, nombre)");

          if (rolesData && Array.isArray(rolesData)) {
            rolesData.forEach((rd: any) => {
              if (!userRolesMap[rd.usuario_id]) {
                userRolesMap[rd.usuario_id] = { ids: [], names: [] };
              }
              if (rd.rol_id) userRolesMap[rd.usuario_id].ids.push(String(rd.rol_id));
              const rObj = Array.isArray(rd.roles) ? rd.roles[0] : rd.roles;
              if (rObj?.id) userRolesMap[rd.usuario_id].ids.push(String(rObj.id));
              if (rObj?.nombre) {
                userRolesMap[rd.usuario_id].names.push(String(rObj.nombre).toLowerCase().trim());
              }
            });
          }
        } catch {
          // Si la consulta directa a roles_usuario falla, ya contamos con los roles embebidos
        }

        // 4. Traer políticas de asignación
        let policiesData: any[] = [];
        try {
          const { data: pols } = await supabase
            .from("politicas_asignacion_tickets")
            .select("*");
          if (pols) policiesData = pols;
        } catch {
          // Fallback en caso de error
        }

        const targetPolicyType = queue === "it" ? "atender_it" : "atender_soporte";
        const policy = policiesData.find((p: any) => p.tipo === targetPolicyType);

        // Parseo seguro de IDs de roles y usuarios asignados a la política
        const parseIds = (raw: any): string[] => {
          if (!raw) return [];
          if (Array.isArray(raw)) return raw.map(String);
          if (typeof raw === "string") {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) return parsed.map(String);
            } catch {
              return [raw];
            }
          }
          return [];
        };

        const allowedRoleIds = parseIds(policy?.roles_ids);
        const allowedUserIds = parseIds(policy?.usuarios_ids);
        const hasActivePolicyRules = allowedRoleIds.length > 0 || allowedUserIds.length > 0;

        // 5. Filtrar usuarios según la política o fallback por roles
        let filtered = usersData.filter((u: any) => {
          const uInfo = userRolesMap[u.id] || { ids: [], names: [] };
          const isSuperAdminUser = uInfo.names.some(
            (r) => r.includes("superadmin") || r.includes("supremo")
          );

          if (hasActivePolicyRules) {
            const hasAllowedRole = uInfo.ids.some((rId) => allowedRoleIds.includes(rId));
            const isExplicitUser = allowedUserIds.includes(String(u.id));
            return hasAllowedRole || isExplicitUser || isSuperAdminUser;
          }

          // Fallback por defecto si aún no hay políticas explícitas en BD
          const isITTech = uInfo.names.some(
            (r) => r === "it" || r.includes("especializado") || r.includes("infraestructura") || r.includes("admin")
          );
          const isSoporteTech = uInfo.names.some(
            (r) => r.includes("soporte") || r.includes("tecnico") || r.includes("técnico") || r.includes("admin")
          );

          if (queue === "it") {
            return isITTech || isSuperAdminUser;
          } else {
            return isSoporteTech || isSuperAdminUser;
          }
        });

        // Salvaguarda: si ningún usuario coincide (ej. roles personalizados o nombres atípicos),
        // mostrar los usuarios activos para evitar dejar la lista vacía e impedir el trabajo
        if (filtered.length === 0) {
          filtered = usersData;
        }

        return filtered.map((u: any) => ({
          id: u.id,
          full_name: u.nombre_completo || "Usuario",
          status: "activo" as const,
        }));
      },
      enabled: !!queue,
    });
  };

  // Query para soluciones
  const { data: solutions = [] } = useQuery({
    queryKey: ["solutions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("soluciones")
        .select("id, titulo")
        .order("titulo");
      return (data || []).map((s) => ({ id: s.id, name: s.titulo }));
    },
  });

  return {
    techniciansMap,
    solutions,
    useTechniciansByQueue,
  };
};
