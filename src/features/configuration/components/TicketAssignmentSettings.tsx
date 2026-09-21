import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  UserCheck, 
  Users, 
  Headset, 
  ShieldCheck, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Info,
  Server
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { logAuditAction } from "@/lib/audit";

interface RoleItem {
  id: string;
  nombre: string;
  descripcion?: string;
}

interface UserItem {
  id: string;
  nombre_completo: string;
  email?: string;
}

interface PolicyItem {
  id?: string;
  tipo: "autoasignar" | "asignar_otros" | "atender_soporte" | "atender_it";
  nombre: string;
  descripcion: string;
  roles_ids: string[];
  usuarios_ids: string[];
}

const POLICY_METADATA: Record<string, { title: string; subtitle: string; icon: any; color: string; badge: string }> = {
  autoasignar: {
    title: "Auto-asignación de Tickets",
    subtitle: "Permite a los usuarios tomar un ticket para sí mismos (botón 'ASIGNARME').",
    icon: UserCheck,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    badge: "Auto-servicio"
  },
  asignar_otros: {
    title: "Asignación / Reasignación a Terceros",
    subtitle: "Habilita el menú desplegable ('ASIG / RE-ASIG') para asignar tickets a otros técnicos.",
    icon: Users,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    badge: "Gestión"
  },
  atender_soporte: {
    title: "Atención de Cola de Soporte",
    subtitle: "Roles y usuarios que aparecen en el listado para resolver tickets de Soporte Técnico.",
    icon: Headset,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    badge: "Cola Soporte"
  },
  atender_it: {
    title: "Atención de Cola IT (Escalados)",
    subtitle: "Especialistas que reciben y aparecen para resolver tickets escalados a IT e Infraestructura.",
    icon: Server,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    badge: "Cola IT"
  }
};

const DEFAULT_POLICIES: PolicyItem[] = [
  {
    tipo: "autoasignar",
    nombre: "Auto-asignación de Tickets",
    descripcion: "Roles y usuarios con permiso para asignarse tickets a sí mismos (botón ASIGNARME).",
    roles_ids: [],
    usuarios_ids: []
  },
  {
    tipo: "asignar_otros",
    nombre: "Asignación a Terceros",
    descripcion: "Roles y usuarios con permiso para asignar o reasignar tickets a otros técnicos (menú ASIG / RE-ASIG).",
    roles_ids: [],
    usuarios_ids: []
  },
  {
    tipo: "atender_soporte",
    nombre: "Atención en Cola de Soporte",
    descripcion: "Roles y usuarios habilitados para atender y recibir tickets de la cola general de Soporte Técnico.",
    roles_ids: [],
    usuarios_ids: []
  },
  {
    tipo: "atender_it",
    nombre: "Atención en Cola IT (Escalados)",
    descripcion: "Roles y usuarios habilitados para atender y recibir tickets escalados a IT Especializado.",
    roles_ids: [],
    usuarios_ids: []
  }
];

export const TicketAssignmentSettings: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [policies, setPolicies] = useState<Record<string, PolicyItem>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, usersRes, policiesRes] = await Promise.all([
        supabase.from("roles").select("id, nombre, descripcion").order("nombre"),
        supabase.from("usuarios").select("id, nombre_completo, email").eq("esta_activo", true).order("nombre_completo"),
        supabase.from("politicas_asignacion_tickets").select("*")
      ]);

      const loadedRoles = (rolesRes.data || []) as RoleItem[];
      setRoles(loadedRoles);
      setUsers((usersRes.data || []) as UserItem[]);

      const policiesMap: Record<string, PolicyItem> = {};
      DEFAULT_POLICIES.forEach((p) => {
        policiesMap[p.tipo] = { ...p };
      });

      if (policiesRes.data && policiesRes.data.length > 0) {
        policiesRes.data.forEach((p: any) => {
          policiesMap[p.tipo] = {
            id: p.id,
            tipo: p.tipo,
            nombre: p.nombre,
            descripcion: p.descripcion,
            roles_ids: Array.isArray(p.roles_ids) ? p.roles_ids : [],
            usuarios_ids: Array.isArray(p.usuarios_ids) ? p.usuarios_ids : []
          };
        });
      } else {
        // Fallback inicial con los nombres estandarizados
        const roleIdByName = (name: string) => 
          loadedRoles.find(r => r.nombre.toLowerCase().trim() === name.toLowerCase().trim())?.id;

        const superAdminId = roleIdByName("SuperAdmin") || roleIdByName("Administrador Supremo");
        const adminId = roleIdByName("Admin") || roleIdByName("semiadm");
        const itId = roleIdByName("IT") || roleIdByName("it");
        const soporteId = roleIdByName("Soporte Técnico") || roleIdByName("Técnico de Soporte");

        const filterIds = (ids: (string | undefined)[]): string[] => ids.filter(Boolean) as string[];

        policiesMap["autoasignar"].roles_ids = filterIds([soporteId, itId, adminId, superAdminId]);
        policiesMap["asignar_otros"].roles_ids = filterIds([adminId, superAdminId]);
        policiesMap["atender_soporte"].roles_ids = filterIds([soporteId, adminId, superAdminId]);
        policiesMap["atender_it"].roles_ids = filterIds([itId, adminId, superAdminId]);
      }

      setPolicies(policiesMap);
    } catch (err: any) {
      console.error("Error cargando políticas de tickets:", err);
      toast.error("Error al cargar configuración de tickets");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRoleInPolicy = (policyType: string, roleId: string) => {
    setPolicies((prev) => {
      const policy = prev[policyType] || {
        tipo: policyType as any,
        nombre: POLICY_METADATA[policyType]?.title || policyType,
        descripcion: "",
        roles_ids: [],
        usuarios_ids: []
      };

      const exists = policy.roles_ids.includes(roleId);
      const newRoleIds = exists 
        ? policy.roles_ids.filter((id) => id !== roleId)
        : [...policy.roles_ids, roleId];

      return {
        ...prev,
        [policyType]: {
          ...policy,
          roles_ids: newRoleIds
        }
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = Object.values(policies).map((p) => ({
        tipo: p.tipo,
        nombre: POLICY_METADATA[p.tipo]?.title || p.nombre,
        descripcion: POLICY_METADATA[p.tipo]?.subtitle || p.descripcion,
        roles_ids: p.roles_ids,
        usuarios_ids: p.usuarios_ids,
        actualizado_en: new Date().toISOString()
      }));

      for (const item of payload) {
        const { error } = await supabase
          .from("politicas_asignacion_tickets")
          .upsert(item, { onConflict: "tipo" });
        if (error) throw error;
      }

      await logAuditAction(
        "UPDATE",
        "politicas_asignacion_tickets",
        "Se actualizaron las políticas dinámicas de auto-asignación y atención de tickets de soporte e IT."
      );

      toast.success("Políticas de tickets guardadas exitosamente");
      loadData();
    } catch (err: any) {
      console.error("Error al guardar políticas:", err);
      toast.error("Error al guardar: " + (err.message || "Error inesperado"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Cargando reglas y roles de atención...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/10 p-6 rounded-2xl border border-border/60">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2.5 text-foreground">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Políticas de Atención y Asignación de Tickets
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Controla de manera granular y dinámica qué roles pueden tomar tickets, asignar a terceros y resolver solicitudes en las colas de Soporte Técnico y de IT Especializado.
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="font-bold shadow-md shadow-primary/20 h-11 px-6 rounded-xl self-start sm:self-auto"
        >
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(POLICY_METADATA).map(([typeKey, meta]) => {
          const currentPolicy = policies[typeKey] || {
            tipo: typeKey,
            roles_ids: [],
            usuarios_ids: []
          };
          const IconComp = meta.icon;

          return (
            <motion.div 
              key={typeKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border border-border/60 shadow-sm bg-card rounded-2xl overflow-hidden h-full flex flex-col hover:border-primary/40 transition-colors">
                <CardHeader className="p-5 border-b border-border/50 bg-muted/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${meta.color}`}>
                        <IconComp className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground leading-tight">
                          {meta.title}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {meta.subtitle}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-3">
                      Roles con Acceso Habilitado ({currentPolicy.roles_ids.length})
                    </Label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {roles.map((r) => {
                        const isSelected = currentPolicy.roles_ids.includes(r.id);
                        return (
                          <div
                            key={r.id}
                            onClick={() => toggleRoleInPolicy(typeKey, r.id)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                              isSelected
                                ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                                : "bg-muted/10 border-border/60 text-muted-foreground hover:bg-muted/30"
                            }`}
                          >
                            <span className="text-xs truncate pr-2">{r.nombre}</span>
                            <div
                              className={`h-4 w-4 rounded-[4px] border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground/40"
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-primary/70" />
                      Aplica en tiempo real en Kanban
                    </span>
                    <span className="font-semibold text-foreground">
                      {currentPolicy.roles_ids.length === 0 ? "Ningún rol" : `${currentPolicy.roles_ids.length} roles`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
