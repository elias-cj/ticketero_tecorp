import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, Plus, Pencil, Trash2, Search,
  Settings, UserCircle, Activity, X, Laptop,
  Cpu, CheckCircle2
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
import { logAction } from "@/lib/audit";

interface ITExpert {
  id: string;
  full_name: string;   // mapea a nombre_completo
  specialty: string;   // de detalles_tecnico (texto)
  status: string;      // derivado de esta_activo
  created_at: string;  // creado_en
}

const ITEspecializado = () => {
  const [experts, setExperts] = useState<ITExpert[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState<ITExpert | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const { user } = useAuth();

  const canManage = useMemo(() => {
    const perms = user?.permissions?.['Usuarios'] || [];
    return perms.includes('EDITAR') || perms.includes('CREAR');
  }, [user]);

  const canView = useMemo(() => {
    const perms = user?.permissions?.['Usuarios'] || [];
    return perms.includes('VER');
  }, [user]);

  useEffect(() => {
    if (!canView && !isLoading) {
      toast.error("No tienes permisos para esta sección");
      navigate("/dashboard");
    }
  }, [canView, isLoading, navigate]);

  const [formData, setFormData] = useState({
    full_name: "",
    specialty: "",
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
        creado_en,
        roles_usuario!roles_usuario_usuario_id_fkey!inner(roles!inner(nombre))
      `)
      .ilike('roles_usuario.roles.nombre', '%it%')
      .order('nombre_completo');

    if (error) {
      toast.error('Error al cargar expertos');
    } else if (data) {
      setExperts(data.map((u: any) => ({
        id: u.id,
        full_name: u.nombre_completo || 'Sin nombre',
        specialty: 'Especialista IT',
        status: u.esta_activo ? 'activo' : 'inactivo',
        created_at: u.creado_en
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = experts
    .filter(e => {
      const term = search.toLowerCase();
      return (e.full_name?.toLowerCase().includes(term) ||
        e.specialty?.toLowerCase().includes(term));
    })
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'activo' ? -1 : 1));

  const handleToggleActive = async (id: string, currentStatus: string) => {
    const nextStatusBool = currentStatus !== 'activo';
    const { error } = await supabase.from('usuarios').update({ esta_activo: nextStatusBool }).eq('id', id);
    if (error) {
      toast.error('Error al actualizar el estado del especialista IT');
    } else {
      toast.success(`Especialista IT ${nextStatusBool ? 'activado' : 'deshabilitado'} exitosamente`);
      setExperts(prev => prev.map(e => e.id === id ? { ...e, status: nextStatusBool ? 'activo' : 'inactivo' } : e));
    }
  };

  const handleSave = async () => {
    if (!formData.full_name) return toast.error('El nombre es obligatorio');
    if (formData.password && formData.password.length < 12) return toast.error('La contraseña debe tener al menos 12 caracteres');
    setIsSaving(true);

    const payload: any = {
      nombre_completo: formData.full_name,
      especialidad: formData.specialty,
    };

    if (selectedExpert) {
      // 2. Sincronizar login
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
        .eq('id', selectedExpert.id);

      if (user) {
        await logAction(
          user.id,
          'UPDATE',
          'USUARIO',
          selectedExpert.id,
          { nombre: formData.full_name, area: 'IT Especializado' }
        );
      }

      toast.success('Especialista IT actualizado y sincronizado');
    } else {
      if (!formData.email || !formData.password) {
        setIsSaving(false);
        return toast.error('Correo y contraseña son obligatorios');
      }

      const { data: newUser, error: userError } = await supabase.from('usuarios').insert({
        nombre_completo: formData.full_name,
        email: formData.email,
        password: formData.password,
        debe_cambiar_password: formData.debe_cambiar_password,
        esta_activo: true
      }).select().single();

      const createdUserId = (newUser as any)?.id || (Array.isArray(newUser) ? (newUser as any)[0]?.id : undefined);

      if (userError || !createdUserId) {
        console.error(userError);
        setIsSaving(false);
        return toast.error('Error al crear cuenta de usuario');
      }

      // Sincronizar Rol
      const { data: rolesData } = await supabase.from('roles').select('id, nombre');
      if (rolesData) {
        const itRole = (Array.isArray(rolesData) ? rolesData : [rolesData]).find(r => {
          const n = (r.nombre || '').toLowerCase().trim();
          return n === 'it' || n.includes('especializado') || n.includes('it especializado');
        });
        if (itRole) {
          await supabase.from('roles_usuario').insert({
            usuario_id: createdUserId,
            rol_id: itRole.id,
            asignado_por: user?.id || (user as any)?.userId || null
          });
        }
      }

      toast.success('Nuevo especialista IT registrado y cuenta creada');
    }

    setIsSaving(false);
    setIsAddOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de dar de baja a este especialista (pasará a inactivo)?')) return;

    // Sincronizar: desactivar acceso a nivel de usuario general
    const { error } = await supabase.from('usuarios').update({ esta_activo: false }).eq('id', id);
    if (error) return toast.error('Error al dar de baja');
    
    fetchData();
    toast.success('Especialista dado de baja exitosamente');
  };

  const openEdit = (e: ITExpert) => {
    setSelectedExpert(e);
    setFormData({
      full_name: e.full_name,
      specialty: e.specialty || "",
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Expertos IT Especializados</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Gestión del equipo de alta especialización técnica.</p>
        </div>
        {canManage && (
          <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) setSelectedExpert(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-bold shadow-lg shadow-primary/20" onClick={() => setFormData({ full_name: "", specialty: "", email: "", password: "", debe_cambiar_password: true })}>
                <Plus className="h-4 w-4" /> Registrar Experto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader><DialogTitle>{selectedExpert ? "Editar Experto en TI" : "Nuevo Experto en TI"}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Nombre Completo</Label>
                  <Input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="Ej. Mauricio Vaca" />
                </div>
                <div className="grid gap-2">
                  <Label>Correo Corporativo {selectedExpert && "(Opcional)"}</Label>
                  <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder={selectedExpert ? "Dejar en blanco para no cambiar" : "correo@empresa.com"} type="email" />
                </div>
                <div className="grid gap-2">
                  <Label>Contraseña {selectedExpert && "(Opcional)"}</Label>
                  <Input value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={selectedExpert ? "Dejar en blanco para no cambiar" : "••••••••"} type="password" />
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
                  <Label>Especialidad / Rol</Label>
                  <Input value={formData.specialty} disabled placeholder="IT Especializado" />
                </div>
                <div className="grid gap-2">
                  <Label>Rol Asignado (Automático)</Label>
                  <div className="p-3 rounded-xl border bg-primary/10 border-primary text-primary flex items-center gap-3">
                    <div className="h-4 w-4 rounded-[4px] border-2 border-primary bg-primary flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-white" /></div>
                    <span className="text-xs font-bold leading-tight uppercase tracking-widest">IT Especializado</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>Cancelar</Button>
                <Button onClick={handleSave} className="font-bold" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : (selectedExpert ? 'Guardar Cambios' : 'Confirmar Registro')}
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
            <Input placeholder="Buscar por nombre o especialidad..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background border-border" />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {filtered.length} ESPECIALISTAS
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Especialista TI</TableHead>
                <TableHead className="font-bold text-center">Especialidad</TableHead>
                <TableHead className="font-bold">Estado</TableHead>
                <TableHead className="text-right font-bold w-20">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {filtered.map((e) => (
                  <TableRow key={e.id} className="group hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold shadow-sm ring-1 ring-primary/20">
                          <Cpu className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{e.full_name}</p>
                          <p className="text-[9px] text-muted-foreground font-mono leading-none tracking-wider uppercase">REF: {e.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted text-xs font-bold text-foreground">
                        <Laptop className="h-3.5 w-3.5 text-primary/70" />
                        {e.specialty || "Sistemas"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={e.status === 'activo'}
                          onCheckedChange={() => handleToggleActive(e.id, e.status)}
                          disabled={!canManage}
                        />
                        <span className={`text-xs font-semibold ${e.status === 'activo' ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {e.status === 'activo' ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1 px-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4" /></Button>
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

export default ITEspecializado;
