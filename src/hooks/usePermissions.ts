import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface PermissionsResult {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCall: boolean;
  hasAction: (action: string) => boolean;
  isSuperAdmin: boolean;
}

export const usePermissions = (moduleName: string): PermissionsResult => {
  const { user } = useAuth();

  const userRole = (user?.role || "").toLowerCase();
  const roleName = (user?.roleName || "").toLowerCase();
  const permissions = user?.permissions || {};

  // Únicamente el perfil raíz "Administrador Supremo" tiene bypass total
  const isSuperAdmin =
    userRole === "superadmin" ||
    userRole === "superadm" ||
    roleName === "administrador supremo" ||
    roleName === "supremo";

  return useMemo(() => {
    const hasAction = (action: string): boolean => {
      if (isSuperAdmin) return true;
      const moduleActions = permissions[moduleName];
      if (!moduleActions || !Array.isArray(moduleActions)) return false;
      return moduleActions.includes(action.toUpperCase());
    };

    return {
      canView: hasAction("VER"),
      canCreate: hasAction("CREAR"),
      canEdit: hasAction("EDITAR"),
      canDelete: hasAction("ELIMINAR"),
      canCall: hasAction("LLAMAR"),
      hasAction,
      isSuperAdmin,
    };
  }, [permissions, moduleName, isSuperAdmin]);
};
