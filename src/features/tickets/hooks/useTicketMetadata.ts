import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/queryKeys";

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
   * Hook para obtener la lista de técnicos asignables según la cola y el rol del usuario.
   *
   * Reglas de asignación:
   * - soporte (cola soporte): solo técnicos con rol que contenga 'soporte'
   * - it (cola IT):           solo técnicos con rol que contenga 'it'
   * - Si el usuario tiene rol 'it' pero NO es admin/superadmin: solo se puede asignar a sí mismo
   * - admin / superadmin: puede asignar a cualquiera de la cola correspondiente
   */
  const useTechniciansByQueue = (
    queue: "soporte" | "it",
    currentUserId?: string,
    currentUserRoles?: string[]  // nombres de roles del usuario logueado
  ) => {
    const roles = currentUserRoles || [];
    const isAdmin =
      roles.some((r) =>
        r.toLowerCase().includes("admin") ||
        r.toLowerCase().includes("supremo")
      );
    const isITOnly =
      !isAdmin &&
      roles.some((r) => r.toLowerCase().includes("it") || r.toLowerCase() === "it");

    return useQuery({
      queryKey: ["technicians", queue, currentUserId, isAdmin, isITOnly],
      queryFn: async () => {
        // 1. Traer usuarios activos
        const { data: usersData, error: errorUsers } = await supabase
          .from("usuarios")
          .select("id, nombre_completo, esta_activo")
          .eq("esta_activo", true);

        if (errorUsers || !usersData) return [];

        // 2. Traer asignaciones de roles
        const { data: rolesData, error: errorRoles } = await supabase
          .from("roles_usuario")
          .select("usuario_id, roles(nombre)");

        if (errorRoles || !rolesData) return [];

        // 3. Mapear roles a cada usuario (soportando arreglo u objeto)
        const rolesMap: Record<string, string[]> = {};
        rolesData.forEach((rd: any) => {
          if (!rolesMap[rd.usuario_id]) rolesMap[rd.usuario_id] = [];
          const rObj = Array.isArray(rd.roles) ? rd.roles[0] : rd.roles;
          if (rObj?.nombre) {
            rolesMap[rd.usuario_id].push(rObj.nombre.toLowerCase().trim());
          }
        });

        // 4. Filtrar usuarios estrictamente por los roles asignados en la BD
        const filtered = usersData.filter((u) => {
          const userRoles = rolesMap[u.id] || [];

          const isITTech = userRoles.some(r => r === "it" || r.includes("especializado") || r.includes("infraestructura"));
          const isSoporteTech = userRoles.some(r => r.includes("soporte"));
          const isSuperAdminUser = userRoles.some(r => r.includes("administrador supremo") || r.includes("superadmin") || r.includes("supremo"));

          if (queue === "it") {
            // En cola IT: mostrar unicamente técnicos de IT (o Administrador Supremo)
            return isITTech || isSuperAdminUser;
          } else {
            // En cola Soporte: mostrar unicamente técnicos con rol de Soporte (o Administrador Supremo)
            return isSoporteTech || isSuperAdminUser;
          }
        });

        return filtered.map((u) => ({
          id: u.id,
          full_name: u.nombre_completo,
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
