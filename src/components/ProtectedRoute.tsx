import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermission?: { module: string; action: string };
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles, requiredPermission }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  const userRole = (user?.role || "").toLowerCase();
  const roleName = (user?.roleName || "").toLowerCase();
  
  // SOLAMENTE el Administrador Supremo (Superadmin raíz) tiene bypass total de permisos
  const isSuperAdmin = userRole === "superadmin" || userRole === "superadm" || roleName === "administrador supremo" || roleName === "supremo";

  // Fallback check for localStorage to prevent "login bounce"
  const hasSavedAuth = localStorage.getItem('auth') !== null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && !hasSavedAuth) {
    // Redirigir al login si no está autenticado Y no hay sesión guardada pendiente de carga
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si no está autenticado según el estado pero hay algo en localStorage, 
  // esperamos a que AuthContext lo cargue (initializeAuth lo hará)
  if (!isAuthenticated && hasSavedAuth && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (isSuperAdmin) return <>{children}</>;

  if (requiredPermission && user) {
    const hasPerm = Boolean(user.permissions?.[requiredPermission.module]?.includes(requiredPermission.action));

    if (!hasPerm) {
      console.warn(`Acceso denegado: el rol '${user.roleName || user.role}' no tiene permiso ${requiredPermission.action} en '${requiredPermission.module}'`);
      
      // Buscar dinámicamente el primer módulo al que este rol SÍ tenga acceso 'VER'
      const userPerms = user.permissions || {};
      const firstAllowedModule = Object.keys(userPerms).find(mod => userPerms[mod]?.includes("VER"));

      const moduleRoutes: Record<string, string> = {
        "Dashboard": "/dashboard",
        "Tickets": "/tickets",
        "Tareas": "/tareas",
        "Horarios": "/horarios",
        "Call Centers": "/call-centers",
        "Soluciones": "/soluciones",
        "Tipos de Problema": "/tipos-problema",
        "Inventario": "/inventario",
        "Licencias": "/licencias",
        "Exportación": "/exportar",
        "Configuración": "/configuracion",
        "Usuarios": "/soporte-tecnico"
      };

      const redirectPath = (firstAllowedModule && moduleRoutes[firstAllowedModule]) ? moduleRoutes[firstAllowedModule] : "/exportar";
      if (location.pathname === redirectPath) {
        return <>{children}</>;
      }
      return <Navigate to={redirectPath} replace />;
    }
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    // Mantener compatibilidad legado
    console.warn(`Acceso denegado para el rol: ${user.role}`);
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
