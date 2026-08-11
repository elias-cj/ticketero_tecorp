import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Plus, Pencil, Trash2, Search,
  UserCheck, Activity, CheckCircle2
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { logAction } from "@/lib/audit";

interface Technician {
  id: string;
  full_name: string;   // mapea a nombre_completo
  phone?: string;      // opcional (mantenido en BD pero oculto en UI)
  status: string;      // 'activo' | 'inactivo' derivado de registro_estado
}

const SoporteTecnico = () => {
  const [techs, setTechs] = useState<Technician[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const { user, isLoading: authLoading } = useAuth();

  const canManage = useMemo(() => {
    const perms = user?.permissions?.['Usuarios'] || [];
    return perms.includes('EDITAR') || perms.includes('CREAR');
  }, [user]);

  const canView = useMemo(() => {
    const perms = user?.permissions?.['Usuarios'] || [];
    return perms.includes('VER');
  }, [user]);

  useEffect(() => {
    if (!canView && !isLoading && !authLoading) {
      toast.error("No tienes permisos para esta sección");
      navigate("/dashboard");
    }
  }, [canView, isLoading, authLoading, navigate]);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    debe_cambiar_password: true
  });

  const fetchData = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        id, 
        nombre_completo, 
        esta_activo,
        roles_usuario!roles_usuario_usuario_id_fkey(roles(nombre))
      `)
      .order('nombre_completo');

    if (error) {
      toast.error('Error al cargar personal');
    } else if (data) {
      // Filtramos manualmente para capturar cualquier variante del rol de soporte
      const soporteUsers = data.filter((u: any) =>
        Array.isArray(u.roles_usuario) && u.roles_usuario.some((ru: any) =>
          ru.roles?.nombre?.toLowerCase().includes('soporte') ||
          ru.roles?.nombre?.toLowerCase().includes('técnico de soporte')
        )
      );
      setTechs(soporteUsers.map((u: any) => ({
        id: u.id,
        full_name: u.nombre_completo,
        status: u.esta_activo ? 'activo' : 'inactivo',
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = techs
    .filter(t => t.full_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'activo' ? -1 : 1));

  const queryClient = useQueryClient();

  const handleToggleActive = async (id: string, currentStatus: string) => {
    const nextStatusBool = currentStatus !== 'activo';
    const { error } = await supabase.from('usuarios').update({ esta_activo: nextStatusBool }).eq('id', id);
    if (error) {
      toast.error('Error al actualizar el estado del usuario');
    } else {
      toast.success(`Usuario de soporte ${nextStatusBool ? 'activado' : 'deshabilitado'} exitosamente`);
      queryClient.invalidateQueries();
      setTechs(prev => prev.map(t => t.id === id ? { ...t, status: nextStatusBool ? 'activo' : 'inactivo' } : t));
    }
  };

  const handleSave = async () => {
    if (!formData.full_name) return toast.error('El nombre es obligatorio');
    if (formData.password && formData.password.length < 12) return toast.error('La contraseña debe tener al menos 12 caracteres');
    setIsSaving(true);

    const payload: any = {
      nombre_completo: formData.full_name,
    };

    if (selectedTech) {
      const userUpdatePayload: any = {
        nombre_completo: formData.full_name,
      };
      if (formData.email) userUpdatePayload.email = formData.email;
      if (formData.password) {
        userUpdatePayload.password = formData.password;
        userUpdatePayload.debe_cambiar_password = formData.debe_cambiar_password;
      }

      await supabase.from('usuarios')
        .update(userUpdatePayload)
        .eq('id', selectedTech.id);

      if (user) {
        await logAction(
          user.id,
          'UPDATE',
          'USUARIO',
          selectedTech.id,
          { nombre: formData.full_name, motivo: 'Actualización manual desde panel soporte' }
        );
      }

      toast.success('Personal actualizado y sincronizado');
    } else {
      if (!formData.email || !formData.password) {
        return toast.error('Correo y contraseña son obligatorios');
      }

      const { data: newUser, error: userError } = await supabase.from('usuarios').insert({
        nombre_completo: formData.full_name,
        email: formData.email,
        password: formData.password,
        debe_cambiar_password: formData.debe_cambiar_password,
        esta_activo: true
      }).select().single();

      if (userError || !newUser) {
        console.error(userError);
        return toast.error('Error al crear cuenta de usuario');
      }

      // Sincronizar Rol
      const { data: roleData } = await supabase.from('roles').select('id').ilike('nombre', '%soporte%').single();
      if (roleData) {
        await supabase.from('roles_usuario').insert({
          usuario_id: newUser.id,
          rol_id: roleData.id,
          asignado_por: user?.userId || null
        });
      }

      toast.success('Personal añadido exitosamente');
    }

    setIsAddOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de deshabilitar a este técnico (pasará a inactivo y perderá acceso al sistema)?')) return;
    
    // Desactivar acceso a nivel de usuario general
    const { error } = await supabase.from('usuarios').update({ esta_activo: false }).eq('id', id);
    if (error) return toast.error('Error al dar de baja');

    fetchData();
    toast.success('Registro dado de baja exitosamente');
  };

  const openEdit = (t: Technician) => {
    setSelectedTech(t);
    setFormData({
      full_name: t.full_name,
      email: "",
      password: "",
      debe_cambiar_password: false
    });
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personal de Soporte Técnico</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Gestión administrativa de técnicos de primer nivel.</p>
        </div>
        {canManage && (
          <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) setSelectedTech(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-bold shadow-lg" onClick={() => setFormData({ full_name: "", email: "", password: "", debe_cambiar_password: true })}>
                <Plus className="h-4 w-4" /> Añadir Técnico
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader><DialogTitle>{selectedTech ? "Editar Miembro de Soporte" : "Nuevo Miembro de Soporte"}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid gap-2">
                  <Label>Nombre Completo</Label>
                  <Input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="Ej. Juan Pérez" />
                </div>
                <div className="grid gap-2">
                  <Label>Correo Corporativo {selectedTech && "(Opcional)"}</Label>
                  <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder={selectedTech ? "Dejar en blanco para no cambiar" : "correo@empresa.com"} type="email" />
                </div>
                <div className="grid gap-2">
                  <Label>Contraseña {selectedTech && "(Opcional)"}</Label>
                  <Input value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={selectedTech ? "Dejar en blanco para no cambiar" : "••••••••"} type="password" />
                </div>
                <div
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/5 cursor-pointer hover:bg-muted/10 transition-colors"
                  onClick={() => setFormData({ ...formData, debe_cambiar_password: !formData.debe_cambiar_password })}
                >
                  <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${formData.debe_cambiar_password ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                    {formData.debe_cambiar_password && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Exigir cambio de contraseña</p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Rol Asignado (Automático)</Label>
                  <div className="p-3 rounded-xl border bg-primary/10 border-primary text-primary flex items-center gap-3">
                    <div className="h-4 w-4 rounded-[4px] border-2 border-primary bg-primary flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-white" /></div>
                    <span className="text-xs font-bold leading-tight uppercase tracking-widest">Soporte Técnico</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>Cancelar</Button>
                <Button onClick={handleSave} className="font-bold" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : (selectedTech ? 'Guardar Cambios' : 'Guardar Técnico')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-none ring-1 ring-border shadow-sm bg-card/50 overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background border-border" />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {filtered.length} EQUIPO
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Colaborador</TableHead>
                <TableHead className="font-bold">Estado</TableHead>
                <TableHead className="text-right font-bold w-20">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {filtered.map((t) => (
                  <TableRow key={t.id} className="group hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{t.full_name[0]}</div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{t.full_name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono leading-none tracking-widest uppercase">ID: {t.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={t.status === 'activo'}
                          onCheckedChange={() => handleToggleActive(t.id, t.status)}
                          disabled={!canManage}
                        />
                        <span className={`text-xs font-semibold ${t.status === 'activo' ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {t.status === 'activo' ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </TableCell>


                    <TableCell className="text-right">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </Card>

    </div>
  );
};

export default SoporteTecnico;
