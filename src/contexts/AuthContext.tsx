import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthContextType extends AuthState {
  login: (userData: User, roleId?: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const fetchUserPermissions = async (userId: string, activeRoleId?: string): Promise<Record<string, string[]>> => {
    try {
      let roleIds: string[] = [];

      if (activeRoleId) {
        roleIds = [activeRoleId];
      } else {
        const { data: urData } = await supabase
          .from('roles_usuario')
          .select('rol_id')
          .eq('usuario_id', userId);
        
        if (!urData || urData.length === 0) return {};
        roleIds = urData.map(r => r.rol_id);
      }

      const { data: rpData, error: rpError } = await supabase
        .from('permisos_rol')
        .select(`
          permisos (
            modulos ( nombre ),
            acciones  ( nombre )
          )
        `)
        .in('rol_id', roleIds);

      if (rpError) throw rpError;

      const merged: Record<string, string[]> = {};
      (rpData || []).forEach((rp: any) => {
        const p = rp.permisos || rp;
        const moduleName: string = p?.modulos?.nombre || p?.modulo;
        const actionName: string = p?.acciones?.nombre || p?.accion;
        if (!moduleName || !actionName) return;
        if (!merged[moduleName]) merged[moduleName] = [];
        if (!merged[moduleName].includes(actionName)) {
          merged[moduleName].push(actionName);
        }
      });
      return merged;
    } catch (e) {
      console.error("Error fetching permissions:", e);
      return {};
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedAuth = localStorage.getItem('auth');
        if (!storedAuth) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        let userData = JSON.parse(storedAuth);
        const userId = userData.id || userData.userId;
        
        if (!userId) {
          console.warn("Sesión almacenada sin ID de usuario válido.");
          logout();
          return;
        }

        try {
          const { data: dbUser, error: dbError } = await supabase
            .from('usuarios')
            .select('esta_activo')
            .eq('id', userId)
            .maybeSingle();

          if (!dbError && dbUser && dbUser.esta_activo === false) {
            console.warn("Usuario deshabilitado en base de datos. Cerrando sesión...");
            logout();
            return;
          }
        } catch (dbQueryError) {
          console.error("Error al verificar estado del usuario:", dbQueryError);
        }

        const activeRoleId = userData.activeRoleId;
        let permissions = userData.permissions || {};
        
        try {
          const freshPermissions = await fetchUserPermissions(userId, activeRoleId);
          if (Object.keys(freshPermissions).length > 0 || !userData.permissions) {
            permissions = freshPermissions;
          }
        } catch (permsError) {
          console.error("Error al refrescar permisos:", permsError);
        }
        
        userData = { ...userData, id: userId, permissions, activeRoleId };
        localStorage.setItem('auth', JSON.stringify(userData));

        setState({
          user: userData,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error crítico al inicializar la autenticación:', error);
        if (error instanceof SyntaxError) {
          localStorage.removeItem('auth');
        }
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();

    const handleExpired = () => {
      console.warn("Sesión finalizada por token expirado.");
      logout();
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (userData: User, roleId?: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const userId = userData.id || userData.userId || '';
      const activeRoleId = roleId || userData.activeRoleId;
      
      // Guardar temporalmente en localStorage para que el interceptor HTTP adjunte el token JWT en fetchUserPermissions
      const tempUser = { ...userData, id: userId, activeRoleId };
      localStorage.setItem('auth', JSON.stringify(tempUser));

      const permissions = await fetchUserPermissions(userId, activeRoleId);
      const fullUser = { ...userData, id: userId, permissions, activeRoleId };
      
      localStorage.setItem('auth', JSON.stringify(fullUser));
      setState({
        user: fullUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error durante el inicio de sesión:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const logout = () => {
    localStorage.removeItem('auth');
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const refreshPermissions = async () => {
    if (state.user?.id) {
       const perms = await fetchUserPermissions(state.user.id);
       updateUser({ permissions: perms });
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (state.user) {
      const newUser = { ...state.user, ...userData };
      localStorage.setItem('auth', JSON.stringify(newUser));
      setState(prev => ({ ...prev, user: newUser }));
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
