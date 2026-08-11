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

  const userRole = (user?.role || "soporte").toLowerCase();
  const isSuperAdmin = ["superadmin", "super", "superadm", "administrador supremo"].includes(userRole);

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
    const hasPerm = user.permissions?.[requiredPermission.module]?.includes(requiredPermission.action);
    if (!hasPerm) {
      console.warn(`Acceso denegado: falta permiso ${requiredPermission.action} en ${requiredPermission.module}`);
      return <Navigate to="/dashboard" replace />;
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
