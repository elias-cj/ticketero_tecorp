import { useMemo } from "react";
import {
  LayoutDashboard, ListTodo, Settings, LogOut, Headset, BookOpen, AlertOctagon, Building2, ClipboardList, Calendar, Notebook, Shield, FileDown
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { isSuperAdmin as checkSuperAdmin } from "@/lib/isSuperAdmin";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, module: "Dashboard" },
  { title: "Terminal de Monitoreo", url: "/tickets", icon: ListTodo, module: "Tickets" },
  { title: "Tareas", url: "/tareas", icon: ClipboardList, module: "Tareas" },
  { title: "Horarios", url: "/horarios", icon: Calendar, module: "Horarios" },
  { title: "Call Centers", url: "/call-centers", icon: Building2, module: "Call Centers" },
  { title: "Soluciones", url: "/soluciones", icon: BookOpen, module: "Soluciones" },
  { title: "Tipos de Problema", url: "/tipos-problema", icon: AlertOctagon, module: "Tipos de Problema" },
  { title: "Inventario", url: "/inventario", icon: Notebook, module: "Inventario" },
  { title: "Licencias", url: "/licencias", icon: Shield, module: "Licencias" },
  { title: "Exportar Datos", url: "/exportar", icon: FileDown, module: "Exportación" },
];


const AppSidebar = () => {
  const { state: sidebarState } = useSidebar();
  const collapsed = sidebarState === "collapsed";
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const userRole = (user?.role || "").toLowerCase();
  const roleName = (user?.roleName || "").toLowerCase();
  const permissions = user?.permissions || {};
  
  // SOLAMENTE el Administrador Supremo (Superadmin raíz) tiene bypass total de permisos
  const isSuperAdmin = checkSuperAdmin(userRole, roleName);

  const hasPermission = (moduleName: string, action: string = "VER") => {
    // Si es Administrador Supremo raíz, tiene acceso total
    if (isSuperAdmin) return true;
    
    // Para TODOS los demás roles (admin, IT, BI, Técnico de Soporte, etc.):
    // Se respetan estrictamente los permisos asignados en la base de datos
    return Boolean(permissions[moduleName]?.includes(action));
  };

  const filteredItems = useMemo(() => {
    return mainItems.filter(item => {
      if (!item.module) return true;
      return hasPermission(item.module, "VER");
    });
  }, [permissions, isSuperAdmin, userRole, roleName]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-none">
      <SidebarContent className="pt-4">
        {/* Logo */}
        <div className={`px-4 pb-4 ${collapsed ? "text-center" : ""}`}>
          {collapsed ? (
            <div className="h-8 w-8 mx-auto rounded bg-sidebar-accent flex items-center justify-center">
              <Headset className="h-4 w-4" />
            </div>
          ) : (
            <div className="flex items-center">
              <img src="/logo_tecorp.png" alt="TECORP" className="h-9 w-auto" />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/dashboard"}
                      className="hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium">
                      <item.icon className="mr-3 h-4 w-4" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-1">


        {/* Configuration - Controlled by 'Configuración' or 'Roles' for fallback */}
        <SidebarMenu>
          {(hasPermission("Configuración") || hasPermission("Roles")) && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/configuracion"
                  className="hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                  activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium">
                  <Settings className={collapsed ? "mx-auto h-4 w-4" : "mr-3 h-4 w-4"} />
                  {!collapsed && <span className="text-sm">Configuración</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>

        <div className="h-[1px] bg-border/50 my-1" />

        {/* Logout Button */}
        {!collapsed ? (
          <Button variant="ghost" size="sm"
            className="w-full justify-start text-destructive/70 hover:text-destructive hover:bg-destructive/10 text-sm font-medium"
            onClick={handleLogout}>
            <LogOut className="mr-3 h-4 w-4" />
            Cerrar Sesión
          </Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={handleLogout}
            className="w-full text-destructive/70 hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
