import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Users, Shield, Building2, Search, Plus, Edit2, Trash2, CheckCircle2, Database, ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

// Configuration sections
const TABS = [
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "roles", label: "Roles y Permisos", icon: Shield },
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "auditoria", label: "Auditoría", icon: Database },
];

const MODULE_LIST = ["Dashboard", "Tickets", "Tareas", "Cola IT", "Horarios", "Usuarios", "Roles", "Call Centers", "Inventario", "Licencias", "Soluciones", "Tipos de Problema", "Exportación", "Configuración"];

const DEFAULT_ACTIONS = ["VER", "CREAR", "EDITAR", "ELIMINAR"];
const MODULE_SPECIFIC_ACTIONS: Record<string, string[]> = {
  "Dashboard": ["VER", "Guatemala", "Bolivia", "Panamá", "Nicaragua", "Paraguay", "Televenta Panamá", "Televenta Nicaragua", "Televentas", "RRHH", "Nacional Seguros", "NOC", "Multiskill", "Cobranzas", "Innovación", "Marathon", "CDLA", "BI", "Linde"],
  "Call Centers": ["VER", "CREAR", "EDITAR", "ELIMINAR", "LLAMAR"],
};

export default function Configuration() {
  const [activeTab, setActiveTab] = useState("usuarios");
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // States for Editors
  const [editingRole, setEditingRole] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({ 
    nombre_completo: "", 
    email: "", 
    password: "", 
    debe_cambiar_password: false,
    roles: [] as string[] 
  });

  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();
  const [fixedRoleQuery, setFixedRoleQuery] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("action") === "new_user") {
      setActiveTab("usuarios");
      const targetRoleStr = params.get("role");
      setFixedRoleQuery(targetRoleStr);
      setEditingUser({ isNew: true });
      setUserFormData({ 
        nombre_completo: "", 
        email: "", 
        password: "", 
        debe_cambiar_password: true,
        roles: [] 
      });
      // Limpiar URL
      navigate("/configuracion", { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (fixedRoleQuery && roles.length > 0 && editingUser?.id === 'new') {
       let matchedRole = null;
       if (fixedRoleQuery === 'soporte') {
          matchedRole = roles.find(r => (r.nombre || r.name || "").toLowerCase().includes('soporte'));
       } else if (fixedRoleQuery === 'it') {
          matchedRole = roles.find(r => {
             const n = (r.nombre || r.name || "").toLowerCase().trim();
             return n === 'it' || n.includes('especializado') || n.includes('it especializado');
          });
       }
       if (matchedRole && !userFormData.roles.includes(matchedRole.id)) {
          setUserFormData(prev => ({ ...prev, roles: [matchedRole.id] }));
       }
    }
  }, [fixedRoleQuery, roles, editingUser]);

  // Get current auth state from context
  const isSuperAdmin = user?.role === "superadmin" || user?.role === "superadm" || user?.role === "supremo";
  const isAdmin = isSuperAdmin || user?.role === "admin";
  
  const currentUser = {
    role: user?.role || "soporte",
    email: user?.email
  };

  const logAuditAction = async (action: string, entity: string, details: string) => {
    if (!user) return;
    try {
      await supabase.from('registros_auditoria').insert({
        usuario_id: user.id,
        accion: action,
        entidad: entity,
        detalles: { message: details },
        creado_en: new Date().toISOString()
      });
    } catch (e) {
      console.error("Audit error:", e);
    }
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('registros_auditoria')
      .select(`
        *,
        usuarios ( nombre_completo )
      `)
      .order('creado_en', { ascending: false })
      .limit(50);
    
    if (error) {
      toast.error("Error al cargar auditoría");
    } else {
      setAuditLogs(data || []);
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);

    // ─── Queries paralelas básicas ────────────────────────────────────────────
    const [pRes, rRes, urRes, cRes] = await Promise.all([
      supabase.from('usuarios').select('*').order('nombre_completo'),
      supabase.from('roles').select('id, nombre, descripcion').order('nombre'),
      supabase.from('roles_usuario').select('usuario_id, rol_id'),
      supabase.from('informacion_empresa').select('*').limit(1).maybeSingle(),
    ]);

    // Cargar permisos con nombres de módulos y acciones
    const { data: rpRows } = await supabase.from('permisos_rol').select('rol_id, permiso_id');
    const { data: permRows } = await supabase.from('permisos').select(`
      id,
      modulos (nombre),
      acciones (nombre)
    `);

    const permLookup: Record<string, string> = {};
    (permRows || []).forEach((p: any) => {
      const modObj = Array.isArray(p.modulos) ? p.modulos[0] : p.modulos;
      const accObj = Array.isArray(p.acciones) ? p.acciones[0] : p.acciones;
      if (modObj?.nombre && accObj?.nombre) {
        permLookup[p.id] = `${modObj.nombre}:${accObj.nombre}`;
      }
    });

    const permsByRole: Record<string, any> = {};
    (rpRows || []).forEach(rp => {
      if (!permsByRole[rp.rol_id]) permsByRole[rp.rol_id] = {};
      const pFullName = permLookup[rp.permiso_id];
      if (pFullName && pFullName.includes(':')) {
        const [mod, acc] = pFullName.split(':');
        if (mod && acc) {
          if (!permsByRole[rp.rol_id][mod]) permsByRole[rp.rol_id][mod] = [];
          permsByRole[rp.rol_id][mod].push(acc);
        }
      }
    });

    if (pRes.data) {
      // Ocultar al usuario raíz (superadmin) de la lista y enviar inactivos al final
      const visibleUsers = pRes.data
        .filter(u => (u.email || "").toLowerCase() !== "admin@admin.com")
        .sort((a, b) => (a.esta_activo === b.esta_activo ? 0 : a.esta_activo ? -1 : 1));
      setUsuarios(visibleUsers);
    }
    if (rRes.data) {
      // Filtrar el rol de superadmin para que no sea visible ni asignable
      const filteredRoles = rRes.data.filter(r => 
        !["superadmin", "superadm", "supremo", "administrador supremo"].includes((r.nombre || "").toLowerCase().trim())
      );

      const parsedRoles = filteredRoles.map(r => ({
        ...r,
        name: r.nombre,
        description: r.descripcion,
        permissions: permsByRole[r.id] || {}
      }));
      setRoles(parsedRoles);
    }
    if (urRes.data) setUserRoles(urRes.data);
    if (cRes.data) setCompanyInfo(cRes.data);
    setIsLoading(false);
  };

  const queryClient = useQueryClient();

  const handleToggleUserActive = async (userId: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    const { error } = await supabase
      .from('usuarios')
      .update({ esta_activo: nextActive })
      .eq('id', userId);

    if (error) {
      toast.error("Error al actualizar el estado del usuario");
    } else {
      toast.success(`Usuario ${nextActive ? 'activado' : 'deshabilitado'} exitosamente`);
      const targetUser = usuarios.find(u => u.id === userId);
      const targetName = targetUser?.nombre_completo || "Usuario";
      await logAuditAction("UPDATE", "usuarios", `Estado del usuario '${targetName}' cambiado a ${nextActive ? 'ACTIVO' : 'INACTIVO'}.`);
      queryClient.invalidateQueries();
      setUsuarios(prev => 
        prev
          .map(u => u.id === userId ? { ...u, esta_activo: nextActive } : u)
          .sort((a, b) => (a.esta_activo === b.esta_activo ? 0 : a.esta_activo ? -1 : 1))
      );
    }
  };


  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === "auditoria") {
      fetchAuditLogs();
    }
  }, [activeTab]);

  // Helpers
  const getUserRoles = (userId: string) => {
    const userRoleIds = userRoles.filter(ur => ur.usuario_id === userId).map(ur => ur.rol_id);
    return roles.filter(r => userRoleIds.includes(r.id));
  };

  const getRoleUserCount = (roleId: string) => {
    return userRoles.filter(ur => ur.rol_id === roleId).length;
  };

  // Roles Editing specific functions
  const togglePermission = (modName: string, permLevel: string) => {
    if (!editingRole) return;
    const currentPerms = editingRole.permissions?.[modName] || [];
    let newPerms = [...currentPerms];

    if (newPerms.includes(permLevel)) {
      newPerms = newPerms.filter(p => p !== permLevel);
    } else {
      newPerms.push(permLevel);
    }

    setEditingRole({
      ...editingRole,
      permissions: {
        ...editingRole.permissions,
        [modName]: newPerms
      }
    });
  };

  const saveRole = async () => {
    if (!isAdmin) {
      toast.error("No tienes permiso"); return;
    }
    setIsSavingRole(true);

    const isNew = editingRole.id === "new";
    let savedRoleId = editingRole.id;
    let error;

    // 1. Guarda solo nombre y descripción (permissions se gestiona en role_permissions — 3FN)
    if (isNew) {
      const res = await supabase.from('roles').insert({
        nombre: editingRole.name,
        descripcion: editingRole.description
      }).select('id').single();
      error = res.error;
      if (!error && res.data) savedRoleId = res.data.id;
    } else {
      const res = await supabase.from('roles').update({
        nombre: editingRole.name,
        descripcion: editingRole.description
      }).eq('id', editingRole.id);
      error = res.error;
    }

    if (error) {
      toast.error("Error al guardar el rol");
      console.error(error);
      return;
    }

    // 2. Sincronizar table permisos_rol con el nuevo mapa de permisos
    // 2a. Cargar todos los módulos y acciones de la BD
    const [modRes, actRes] = await Promise.all([
      supabase.from('modulos').select('id, nombre'),
      supabase.from('acciones').select('id, nombre'),
    ]);
    const moduleMap: Record<string, string> = {};
    const actionMap: Record<string, string> = {};
    (modRes.data || []).forEach((m: any) => (moduleMap[m.nombre] = m.id));
    (actRes.data || []).forEach((a: any) => (actionMap[a.nombre] = a.id));

    // 2b. Construir lista de permission_ids a asignar
    const permRes = await supabase.from('permisos').select('id, modulo_id, accion_id');
    const permLookup: Record<string, string> = {};
    (permRes.data || []).forEach((p: any) => {
      permLookup[`${p.modulo_id}:${p.accion_id}`] = p.id;
    });

    const targetPermIds: string[] = [];
    const permsMap: Record<string, string[]> = editingRole.permissions || {};
    Object.entries(permsMap).forEach(([modName, actions]) => {
      const modId = moduleMap[modName];
      if (!modId) return;
      (actions as string[]).forEach((actionName) => {
        const actId = actionMap[actionName];
        if (!actId) return;
        const permId = permLookup[`${modId}:${actId}`];
        if (permId) targetPermIds.push(permId);
      });
    });

    // 2c. Reemplazar permisos_rol
    await supabase.from('permisos_rol').delete().eq('rol_id', savedRoleId);
    if (targetPermIds.length > 0) {
      const { error: insertError } = await supabase.from('permisos_rol').insert(
        targetPermIds.map(pid => ({ rol_id: savedRoleId, permiso_id: pid }))
      );
      if (insertError) {
        toast.error("Hubo un error al guardar los permisos: " + insertError.message);
        console.error(insertError);
      }
    }

    toast.success("Rol guardado exitosamente");
    await logAuditAction(isNew ? "INSERT" : "UPDATE", "roles", `Rol '${editingRole.name}' ha sido ${isNew ? 'creado' : 'modificado'}.`);
    setIsSavingRole(false);
    setEditingRole(null);
    fetchAllData();
  };

  const deleteRole = async (id: string, name: string) => {
    if (!isAdmin || !window.confirm("¿Seguro que deseas desactivar este rol?")) return;
    const { error } = await supabase.from('roles').update({ esta_activo: false }).eq('id', id);
    if (error) toast.error("Error desactivando rol");
    else {
      toast.success("Rol desactivado");
      await logAuditAction("DELETE", "roles", `Rol '${name}' ha sido desactivado del sistema (Soft Delete).`);
      fetchAllData();
    }
  };

  const deleteUser = async (id: string, name: string) => {
    if (!isAdmin || !window.confirm(`¿Seguro que deseas eliminar al usuario ${name} del sistema?`)) return;

    // Apply soft delete
    const { error } = await supabase.from('usuarios').update({ esta_activo: false }).eq('id', id);
    if (error) {
      toast.error("Error eliminando usuario");
      console.error(error);
    } else {
      toast.success("Usuario eliminado exitosamente");
      await logAuditAction("DELETE", "usuarios", `Usuario '${name}' inhabilitado en el directorio (Soft Delete).`);
      fetchAllData();
    }
  };

  const handleEditUser = (p: any) => {
    const pRoles = getUserRoles(p.id).map(r => r.id);
    setUserFormData({
      nombre_completo: p.nombre_completo || "",
      email: p.email || "",
      password: "",
      debe_cambiar_password: p.debe_cambiar_password || false,
      roles: pRoles
    });
    setEditingUser(p);
  };

  const handleNewUser = () => {
    setUserFormData({ nombre_completo: "", email: "", password: "", debe_cambiar_password: true, roles: [] });
    setEditingUser({ id: "new" });
  };

  const toggleUserRole = (roleId: string) => {
    setUserFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId) ? prev.roles.filter(r => r !== roleId) : [...prev.roles, roleId] // Selección Múltiple
    }));
  };

  const saveUser = async () => {
    if (!userFormData.nombre_completo || !userFormData.email) {
      toast.error("Nombre y correo son obligatorios"); return;
    }
    setIsSavingUser(true);

    const isNew = editingUser.id === 'new';
    let userId = editingUser.id;

    try {
      const userData: any = {
        nombre_completo: userFormData.nombre_completo,
        email: userFormData.email,
        debe_cambiar_password: userFormData.debe_cambiar_password,
        esta_activo: true
      };

      // Password validation
      if (userFormData.password && userFormData.password.length < 12) {
        toast.error("La contraseña debe tener al menos 12 caracteres"); return;
      }

      // Password assignment (The database trigger will handle hashing)
      if (userFormData.password) {
        userData.password = userFormData.password;
      }

      if (isNew) {
        if (!userFormData.password) {
          toast.error("La contraseña es obligatoria para nuevos usuarios"); return;
        }
        const { data, error } = await supabase.from('usuarios').insert(userData).select().single();
        if (error) throw error;
        userId = data.id;
      } else {
        const { error } = await supabase.from('usuarios').update(userData).eq('id', userId);
        if (error) throw error;
      }

      // Sync Roles
      await supabase.from('roles_usuario').delete().eq('usuario_id', userId);
      if (userFormData.roles.length > 0) {
        const rolePayload = userFormData.roles.map(rId => ({
          usuario_id: userId,
          rol_id: rId,
          asignado_por: user?.userId || null
        }));
        const { error: roleError } = await supabase.from('roles_usuario').insert(rolePayload);
        if (roleError) throw roleError;
      }

      toast.success(isNew ? "Usuario creado exitosamente" : "Perfil actualizado correctamente");
      await logAuditAction(isNew ? "INSERT" : "UPDATE", "usuarios", `Usuario '${userFormData.nombre_completo}' ${isNew ? 'registrado' : 'actualizado'} en el sistema.`);
      setEditingUser(null);
      setFixedRoleQuery(null);
      fetchAllData();
    } catch (err: any) {
      console.error(err);
      toast.error("Error al procesar usuario: " + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const assignRole = async (userId: string, roleId: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('roles_usuario').insert({ usuario_id: userId, rol_id: roleId });
    if (error) {
      toast.error("El usuario ya tiene este rol o surgió un error");
    } else {
      toast.success("Rol asignado con éxito");
      const rName = roles.find(r => r.id === roleId)?.nombre;
      const uName = usuarios.find(u => u.id === userId)?.nombre_completo;

      await logAuditAction("INSERT", "roles_usuario", `Se asignó el rol '${rName}' al usuario '${uName}'.`);
      fetchAllData();
    }
  };

  const removeRole = async (userId: string, roleId: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('roles_usuario').delete().match({ usuario_id: userId, rol_id: roleId });
    if (error) toast.error("Error reviviendo rol");
    else {
      toast.success("Permiso de rol revocado");
      const rName = roles.find(r => r.id === roleId)?.nombre;
      const uName = usuarios.find(u => u.id === userId)?.nombre_completo;

      await logAuditAction("DELETE", "roles_usuario", `Se revocó el rol '${rName}' al usuario '${uName}'.`);
      fetchAllData();
    }
  };

  const saveCompanyInfo = async () => {
    if (!companyInfo || !isAdmin) return;
    setIsSavingCompany(true);
    const { error } = await supabase.from('informacion_empresa').update({
      nombre_comercial: companyInfo.nombre_comercial,
      razon_social: companyInfo.razon_social,
      id_fiscal: companyInfo.id_fiscal,
      direccion: companyInfo.direccion,
      telefono: companyInfo.telefono,
      email_contacto: companyInfo.email_contacto
    }).eq('id', companyInfo.id);

    if (error) {
      toast.error("Error guardando datos de la empresa");
    } else {
      toast.success("Datos de empresa almacenados en la nube");
      await logAuditAction("UPDATE", "company_info", `Datos de la empresa '${companyInfo.name}' fueron modificados.`);
    }
    setIsSavingCompany(false);
  };

  // Used for Audit Logs Badge Colors
  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': 
      case 'CREATE':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'UPDATE': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'DELETE': 
      case 'BLOCK':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };


  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-center p-8 bg-muted/5 rounded-3xl border border-dashed border-destructive/20 mt-10 max-w-4xl mx-auto">
        <Shield className="h-16 w-16 mb-4 text-destructive/50" />
        <h1 className="text-2xl font-bold text-foreground">Acceso Bloqueado</h1>
        <p className="text-muted-foreground mt-2 max-w-md">No tienes los privilegios necesarios para visualizar la matriz central de la organización.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto py-6">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Administración</h1>
        <p className="text-muted-foreground text-sm font-medium mt-1">Gestión centralizada de usuarios, roles e identidad corporativa.</p>
      </div>

      {/* PILL NAVIGATION */}
      <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-1.5 rounded-full border border-border/50 max-w-fit shadow-sm">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setEditingRole(null); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full transition-all ${isActive
                  ? "bg-background shadow-sm ring-1 ring-border text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>


      {/* ==== TAB: USUARIOS ==== */}
      {activeTab === "usuarios" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Gestión de Usuarios</h2>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">Controla los accesos y niveles de permiso del personal.</p>
            </div>
            <Button onClick={handleNewUser} className="bg-primary hover:bg-primary/90 text-white font-bold tracking-tight rounded-xl px-5 h-11 shadow-md shadow-primary/20 gap-2">
              <Users className="h-4 w-4" /> Agregar Usuario
            </Button>
          </div>

          <Card className="border border-border/60 shadow-md bg-card overflow-hidden rounded-2xl">
            <div className="bg-muted/10 p-4 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base">Directorio de Usuarios</h3>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 bg-background border-border/60 h-10 rounded-xl text-sm" placeholder="Buscar usuario..." />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left align-middle border-collapse">
                <thead className="bg-muted/5 font-bold text-muted-foreground border-b border-border/60 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Rol</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Fecha Registro</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {usuarios.map(p => {
                    const uRoles = getUserRoles(p.id);
                    const isSuperadmin = uRoles.some(r => r.nombre.toLowerCase() === 'superadmin' || r.nombre.toLowerCase() === 'superadm');
                    
                    // Hide superadmin users from non-superadmins
                    if (isSuperadmin && currentUser.role !== 'superadmin' && currentUser.role !== 'superadm') {
                      return null;
                    }

                    return (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black shadow-inner uppercase tracking-widest text-sm">
                              {p.nombre_completo.substring(0, 2)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground">{p.nombre_completo}</span>
                              <span className="text-xs text-muted-foreground">{p.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                            {uRoles.length > 0 ? uRoles.map(ur => (
                              <Badge key={ur.id} variant="outline" className="bg-background text-muted-foreground font-semibold border-border/80 text-[10px] uppercase rounded-md shadow-sm">
                                {ur.nombre}
                                <button onClick={() => removeRole(p.id, ur.id)} className="ml-1 hover:text-destructive opacity-50 hover:opacity-100">&times;</button>
                              </Badge>
                            )) : <span className="text-xs text-muted-foreground italic">Sin rol</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={p.esta_activo}
                              onCheckedChange={() => handleToggleUserActive(p.id, p.esta_activo)}
                              disabled={!isAdmin}
                            />
                            <span className={`text-xs font-semibold ${p.esta_activo ? "text-emerald-600" : "text-muted-foreground"}`}>
                              {p.esta_activo ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-medium text-xs">
                          {new Date(p.creado_en || new Date()).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                            {/* Un admin no puede editarse a sí mismo si no es Superadmin (opcional, pero protegemos eliminación) */}
                            <button onClick={() => handleEditUser(p)} className="text-primary hover:text-primary/70"><Edit2 className="h-4 w-4" /></button>
                            
                            {/* Impedir que un admin se elimine a sí mismo o elimine a un superadmin */}
                            {!isSuperadmin && p.id !== user?.id && (
                              <button onClick={() => deleteUser(p.id, p.nombre_completo)} className="text-destructive hover:text-destructive/70"><Trash2 className="h-4 w-4" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {usuarios.length === 0 && !isLoading && (
                    <tr><td colSpan={5} className="py-10 text-center text-muted-foreground font-medium">No se encontraron usuarios</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}


      {/* ==== TAB: ROLES Y PERMISOS ==== */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {editingRole ? "Detalle del Rol" : "Roles y Permisos"}
              </h2>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">
                {editingRole ? "Configura los permisos modulares de este Perfil." : "Define los niveles de acceso para cada tipo de usuario."}
              </p>
            </div>

            {!editingRole ? (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9 bg-background border-border/60 h-10 flex-1 min-w-56 rounded-xl text-sm" placeholder="Buscar rol..." />
                </div>
                <Button onClick={() => setEditingRole({ id: "new", name: "", description: "", permissions: {} })} className="bg-primary hover:bg-primary/90 text-white font-bold tracking-tight rounded-xl px-5 h-10 shadow-md shadow-primary/20 gap-2 shrink-0">
                  <Plus className="h-4 w-4" /> Nuevo Rol
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setEditingRole(null)} className="h-10 rounded-xl gap-2 font-bold text-muted-foreground">
                <ArrowLeft className="h-4 w-4" /> Volver a Matriz
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!editingRole ? (
              <motion.div key="table" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Card className="border border-border/60 shadow-md bg-card overflow-hidden rounded-2xl">
                  <div className="bg-muted/10 p-5 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Shield className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-base">Matriz de Roles</h3>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left align-middle border-collapse">
                      <thead className="bg-muted/5 font-bold text-muted-foreground border-b border-border/60 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Rol</th>
                          <th className="px-6 py-4">Descripción</th>
                          <th className="px-6 py-4">Permisos</th>
                          <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {roles.map(r => {
                          const userCount = getRoleUserCount(r.id);
                          const isSuperadminRole = r.name.toLowerCase() === 'superadmin' || r.name.toLowerCase() === 'superadm';
                          
                          return (
                            <tr key={r.id} className="hover:bg-muted/20 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                                    <Shield className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="font-bold text-foreground text-[13px] tracking-tight">{r.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                                {r.description || "Sin descripción"}
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-[10px] font-bold text-primary tracking-wider bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md uppercase">
                                  {userCount} ASIGNADOS
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                                  {/* Solo superadmin puede editar el rol 'admin' o roles críticos */}
                                  {(isSuperAdmin || !["admin", "administrador"].includes(r.name.toLowerCase().trim())) && (
                                    <button onClick={() => setEditingRole(clone(r))} className="text-primary hover:text-primary/70"><Edit2 className="h-4 w-4" /></button>
                                  )}
                                  
                                  {/* Nadie puede eliminar el rol admin excepto quizás un superadmin (aunque ocultamos el de superadmin) */}
                                  {!isSuperadminRole && (isSuperAdmin || !["admin", "administrador"].includes(r.name.toLowerCase().trim())) && (
                                    <button onClick={() => deleteRole(r.id, r.name)} className="text-destructive hover:text-destructive/70"><Trash2 className="h-4 w-4" /></button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="editor" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                <Card className="border border-border/60 shadow-xl bg-card rounded-2xl overflow-hidden pb-8">

                  <div className="p-6 md:p-8 bg-muted/10 border-b border-border/60">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre del Rol</Label>
                        <Input
                          value={editingRole.name}
                          onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                          className="bg-background rounded-xl font-bold border-border/60 shadow-sm h-11"
                          placeholder="ej. Registros GT"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción breve</Label>
                        <Input
                          value={editingRole.description}
                          onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                          className="bg-background rounded-xl border-border/60 shadow-sm h-11"
                          placeholder="Describe de qué trata..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-4 max-w-5xl">
                    <h4 className="text-[11px] uppercase font-black tracking-widest text-primary mb-6">Accesos Especiales y Dashboard</h4>

                    {MODULE_LIST.map((modName) => {
                      const perms = editingRole.permissions?.[modName] || [];
                      return (
                        <div key={modName} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors gap-4">
                          <h3 className="text-lg font-bold text-foreground/80">{modName}</h3>

                          <div className="flex flex-wrap items-center gap-2">
                            {(MODULE_SPECIFIC_ACTIONS[modName] || DEFAULT_ACTIONS).map(level => {
                              const active = perms.includes(level);
                              return (
                                <button
                                  key={level}
                                  onClick={() => togglePermission(modName, level)}
                                  className={`px-4 py-1.5 rounded-full text-[11px] font-black tracking-wider transition-all duration-300 ${active
                                      ? "bg-primary text-primary-foreground shadow-[0_4px_10px_rgba(var(--primary),0.2)] border border-primary"
                                      : "bg-background text-muted-foreground border border-border hover:bg-muted hover:border-muted-foreground/30 shadow-sm"
                                    }`}
                                >
                                  {level}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}

                    <div className="pt-8 flex justify-end">
                      <Button onClick={saveRole} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-8 shadow-lg shadow-primary/20 font-bold tracking-tight gap-2">
                        <Save className="h-4 w-4" /> Guardar Configuración
                      </Button>
                    </div>

                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ==== TAB: EMPRESA ==== */}
      {activeTab === "empresa" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Datos de la Empresa</h2>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">Información legal, facturación y contacto global.</p>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-none shadow-sm ring-1 ring-border/50 bg-card overflow-hidden rounded-2xl">
              <div className="bg-muted/10 p-5 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Información Corporativa</h3>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 md:p-8">
                {companyInfo ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs uppercase font-bold text-muted-foreground">Nombre Comercial</Label>
                        <Input id="name" value={companyInfo.nombre_comercial || ""} onChange={e => setCompanyInfo({ ...companyInfo, nombre_comercial: e.target.value })} disabled={!isAdmin} className="font-bold h-11 bg-background rounded-xl border-border/60 shadow-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="legal" className="text-xs uppercase font-bold text-muted-foreground">Razón Social</Label>
                        <Input id="legal" value={companyInfo.razon_social || ""} onChange={e => setCompanyInfo({ ...companyInfo, razon_social: e.target.value })} disabled={!isAdmin} className="h-11 bg-background rounded-xl border-border/60 shadow-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax" className="text-xs uppercase font-bold text-muted-foreground">ID Fiscal (NIT/RUC)</Label>
                        <Input id="tax" value={companyInfo.id_fiscal || ""} onChange={e => setCompanyInfo({ ...companyInfo, id_fiscal: e.target.value })} disabled={!isAdmin} className="h-11 bg-background rounded-xl border-border/60 font-mono shadow-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs uppercase font-bold text-muted-foreground">Teléfono Principal</Label>
                        <Input id="phone" value={companyInfo.telefono || ""} onChange={e => setCompanyInfo({ ...companyInfo, telefono: e.target.value })} disabled={!isAdmin} className="h-11 bg-background rounded-xl border-border/60 shadow-sm" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="email" className="text-xs uppercase font-bold text-muted-foreground">Correo de Contacto</Label>
                        <Input id="email" type="email" value={companyInfo.email_contacto || ""} onChange={e => setCompanyInfo({ ...companyInfo, email_contacto: e.target.value })} disabled={!isAdmin} className="h-11 bg-background rounded-xl border-border/60 shadow-sm" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address" className="text-xs uppercase font-bold text-muted-foreground">Dirección Física</Label>
                        <Input id="address" value={companyInfo.direccion || ""} onChange={e => setCompanyInfo({ ...companyInfo, direccion: e.target.value })} disabled={!isAdmin} className="h-11 bg-background rounded-xl border-border/60 shadow-sm" />
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="pt-6 border-t border-border/50 flex justify-end">
                        <Button onClick={saveCompanyInfo} disabled={isSavingCompany} className="h-11 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                          <Save className="h-4 w-4 mr-2" />
                          {isSavingCompany ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground animate-pulse">Cargando datos de la empresa...</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* ==== TAB: AUDITORIA ==== */}
      {activeTab === "auditoria" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Auditoría Operativa</h2>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">Historial inmutable de acciones en la base de datos empresarial.</p>
            </div>
            <Button variant="outline" onClick={fetchAuditLogs} className="bg-background rounded-xl h-10 shadow-sm font-bold gap-2">
              Actualizar Registros
            </Button>
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border border-border/60 shadow-md bg-card overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left align-middle border-collapse">
                  <thead className="bg-muted/10 font-bold text-muted-foreground border-b border-border/60 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Fecha y Hora</th>
                      <th className="px-6 py-4">Realizado por</th>
                      <th className="px-6 py-4 text-center">Operación</th>
                      <th className="px-6 py-4">Módulo</th>
                      <th className="px-6 py-4">Detalle de Modificación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {auditLogs.map((log: any) => {
                      const detailMsg = typeof log.detalles === 'object' 
                        ? (log.detalles?.message || JSON.stringify(log.detalles)) 
                        : log.detalles;
                      const userObj = log.usuarios;
                      const userName = userObj?.nombre_completo || "Administrador / Sistema";
                      const userEmail = userObj?.email ? `(${userObj.email})` : "";

                      return (
                        <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-foreground/80">
                            {new Date(log.creado_en).toLocaleString('es-ES', { 
                              year: 'numeric', month: '2-digit', day: '2-digit', 
                              hour: '2-digit', minute: '2-digit', second: '2-digit' 
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-xs text-foreground">{userName}</span>
                              {userEmail && <span className="text-[10px] text-muted-foreground font-mono">{userEmail}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant="outline" className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 ${getActionColor(log.accion)}`}>
                              {log.accion}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full text-[10px] uppercase font-black tracking-wider">
                              {log.entidad}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-foreground/90 max-w-md">
                            <span className="leading-relaxed">{detailMsg}</span>
                          </td>
                        </tr>
                      )
                    })}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-muted-foreground">
                          <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                          <p className="font-bold text-sm">El historial de auditoría está disponible.</p>
                          <p className="text-xs text-muted-foreground mt-1">Las modificaciones a usuarios, roles, empresa, soluciones, tipos de problema y call centers se registrarán aquí con hora y fecha exacta.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* MODAL USER / EDIT SYSTEM */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setEditingUser(null); setFixedRoleQuery(null); }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-card w-full max-w-lg rounded-3xl border border-border/50 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-border/50 bg-muted/10">
                <h2 className="text-xl font-extrabold text-foreground">
                  {editingUser.id === 'new' ? 'Alta de Nuevo Empleado' : 'Edición de Perfil'}
                </h2>
                <p className="text-xs font-medium text-muted-foreground mt-1">
                  Configura credenciales y roles dinámicos del sistema.
                </p>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                {/* Form Block */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Nombre / Identificador</Label>
                    <Input value={userFormData.nombre_completo} onChange={e => setUserFormData({ ...userFormData, nombre_completo: e.target.value })} className="h-11 bg-background" placeholder="Juan Pérez" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Correo Corporativo</Label>
                    <Input value={userFormData.email} onChange={e => setUserFormData({ ...userFormData, email: e.target.value })} className="h-11 bg-background" type="email" placeholder="usuario@tecorp.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Contraseña de Control</Label>
                    <Input value={userFormData.password} onChange={e => setUserFormData({ ...userFormData, password: e.target.value })} className="h-11 bg-background font-mono text-sm" type="password" placeholder="••••••••" />
                    <p className="text-[10px] text-muted-foreground opacity-80">{editingUser?.id === 'new' ? 'Contraseña inicial obligatoria.' : '(Opcional) Sobrescribe la clave actual.'} Se guardará de forma encriptada.</p>
                  </div>

                  <div 
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/5 cursor-pointer hover:bg-muted/10 transition-colors"
                    onClick={() => setUserFormData({ ...userFormData, debe_cambiar_password: !userFormData.debe_cambiar_password })}
                  >
                    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${userFormData.debe_cambiar_password ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                      {userFormData.debe_cambiar_password && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Exigir cambio de contraseña</p>
                      <p className="text-[10px] text-muted-foreground">El usuario deberá crear una nueva clave en su próximo inicio de sesión (estilo AD).</p>
                    </div>
                  </div>
                </div>

                <hr className="border-border/50 my-4" />

                {/* Dual Roles Setup */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold tracking-widest uppercase text-primary">
                    {fixedRoleQuery ? "Rol Predefinido" : "Matriz de Roles Asignados (Múltiples)"}
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {roles
                      .filter(r => {
                        if (!fixedRoleQuery) return true;
                        if (fixedRoleQuery === 'soporte') return (r.nombre || r.name || "").toLowerCase().includes('soporte');
                        if (fixedRoleQuery === 'it') {
                           const n = (r.nombre || r.name || "").toLowerCase().trim();
                           return n === 'it' || n.includes('especializado') || n.includes('it especializado');
                        }
                        return true;
                      })
                      .map(r => {
                      const isAssigned = userFormData.roles.includes(r.id);
                      return (
                        <div
                          key={r.id}
                          onClick={() => { if (!fixedRoleQuery) toggleUserRole(r.id); }}
                          className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                            !fixedRoleQuery ? 'cursor-pointer hover:bg-muted/50 hover:text-foreground' : 'cursor-default'
                          } ${isAssigned ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/20 border-border/50 text-muted-foreground'}`}
                        >
                          <div className={`h-4 w-4 flex-shrink-0 rounded-[4px] border-2 flex items-center justify-center ${isAssigned ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                            {isAssigned && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                          <span className="text-xs font-bold leading-tight">{r.nombre || r.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border/50 bg-muted/10 flex grid-cols-2 gap-3">
                <Button variant="outline" className="w-full h-11 rounded-xl font-bold border-border/60" onClick={() => { setEditingUser(null); setFixedRoleQuery(null); }}>Cancelar</Button>
                <Button className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20" onClick={saveUser}>
                  Guardar Entidad
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// utility to clone an object cleanly
function clone(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}
