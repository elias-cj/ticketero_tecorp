import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, Plus, Pencil, Trash2, Eye, Search, 
  Globe, Phone, Activity, MoreVertical, X, Tag
} from "lucide-react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger 
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { type CallCenter } from "@/types";

const CallCenters = () => {
  const [allCC, setAllCC] = useState<CallCenter[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedCC, setSelectedCC] = useState<CallCenter | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Role check
  const isAdmin = useMemo(() => {
    try {
      const auth = JSON.parse(localStorage.getItem("auth") || "{}");
      return auth.role === "admin" || auth.role === "superadmin" || auth.role === "superadm" || auth.role === "it" || auth.role === "soporte" || auth.role === "administrador supremo";
    } catch { return false; }
  }, []);



  useEffect(() => {
    if (!isAdmin) {
      toast.error("No tienes permisos para acceder a esta sección");
      navigate("/dashboard");
    }
  }, [isAdmin, navigate]);

  // Form State
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    code: ""
  });

  const fetchCallCenters = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('call_centers')
      .select('*')
      .order('creado_en', { ascending: true });

    if (error) {
      toast.error("Error al cargar Call Centers");
      console.error(error);
    } else if (data) {
       setAllCC(data.map(d => ({
         id: d.id,
         nombre: d.nombre,
         pais: d.pais,
         codigo: d.codigo || d.nombre.substring(0, 2).toUpperCase(),
         esta_activo: d.esta_activo ?? true
       })));
    }
    setIsLoading(false);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const { error } = await supabase
      .from('call_centers')
      .update({ esta_activo: nextStatus })
      .eq('id', id);

    if (error) {
      toast.error("Error al actualizar estado");
    } else {
      toast.success(`Call Center ${nextStatus ? 'activado' : 'deshabilitado'}`);
      setAllCC(prev => prev.map(c => c.id === id ? { ...c, esta_activo: nextStatus } : c));
      const targetCC = allCC.find(c => c.id === id);
      const ccName = targetCC?.nombre || "Call Center";
      const auth = JSON.parse(localStorage.getItem("auth") || "{}");
      await supabase.from('registros_auditoria').insert({
        usuario_id: auth?.userId || null,
        accion: 'UPDATE',
        entidad: 'call_centers',
        detalles: { message: `Call Center '${ccName}' ${nextStatus ? 'activado' : 'deshabilitado'}.` }
      });
    }
  };

  useEffect(() => {
    fetchCallCenters();
  }, []);

  const filteredCC = useMemo(() => {
    return allCC
      .filter(cc => cc.nombre.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (a.esta_activo !== b.esta_activo) return a.esta_activo ? -1 : 1;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [allCC, search]);

  const handleAddNew = async () => {
    if (!formData.name || !formData.code) return toast.error('Completa los campos');

    const { error } = await supabase.from('call_centers').insert({
      nombre: formData.name,
      codigo: formData.code,
      pais: formData.name.split(' ').pop() || 'Regional',
      nivel_servicio: '100%',
      esta_activo: true
    });
    
    if (error) {
       toast.error("Error al crear Call Center");
       return;
    }
    await fetchCallCenters();
    setIsAddOpen(false);
    resetForm();
    toast.success("Call Center añadido correctamente");
  };

  const handleUpdate = async () => {
    if (!selectedCC) return;
    const { error } = await supabase.from('call_centers').update({
      nombre: formData.name,
      codigo: formData.code
    }).eq('id', selectedCC.id);

    if (error) {
      toast.error("Error al actualizar");
      return;
    }
    await fetchCallCenters();
    setIsEditOpen(false);
    resetForm();
    toast.success("Call Center actualizado");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Dar de baja a este Call Center (marcar como inactivo)?")) return;
    const { error } = await supabase.from('call_centers').update({ esta_activo: false }).eq('id', id);
    if (error) {
      toast.error("Error al dar de baja el Call Center.");
      return;
    }
    await fetchCallCenters();
    toast.success("Call Center inactivado exitosamente");
  };

  const openEdit = (cc: CallCenter) => {
    setSelectedCC(cc);
    setFormData({ id: cc.id, name: cc.nombre, code: cc.codigo });
    setIsEditOpen(true);
  };

  const openView = (cc: CallCenter) => {
    setSelectedCC(cc);
    setIsViewOpen(true);
  };

  const resetForm = () => {
    setFormData({ id: "", name: "", code: "" });
    setSelectedCC(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestión de Call Centers</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Administración de centros de atención regionales.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-bold shadow-lg shadow-primary/20" onClick={resetForm}>
              <Plus className="h-4 w-4" />
              Añadir Call Center
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Nuevo Call Center</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. Call Center Guatemala" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Código</Label>
                <Input id="code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="Ej. GT" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddNew} className="w-full font-bold">Crear Centro</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none ring-1 ring-border shadow-sm bg-card/50 overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background border-border/50"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {filteredCC.length} Registros
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Call Center</TableHead>
                <TableHead className="font-bold">Código</TableHead>
                <TableHead className="font-bold">Estado</TableHead>
                <TableHead className="text-right font-bold w-20">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {filteredCC.map((cc) => (
                  <TableRow key={cc.id} className="group hover:bg-muted/40 transition-colors cursor-default">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">{cc.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded bg-muted font-mono text-[11px] font-bold border border-border/50">
                        {cc.codigo}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cc.esta_activo}
                          onCheckedChange={() => handleToggleActive(cc.id, cc.esta_activo)}
                        />
                        <span className={`text-xs font-semibold ${cc.esta_activo ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {cc.esta_activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5 px-2">
                        <Button
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          onClick={() => openView(cc)}
                          title="Ver Detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          onClick={() => openEdit(cc)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => handleDelete(cc.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Call Center</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input id="edit-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-code">Código</Label>
              <Input id="edit-code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate} className="w-full font-bold">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalles del Call Center
            </DialogTitle>
          </DialogHeader>
          {selectedCC && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border/50">
                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedCC.nombre}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-mono">
                    <Tag className="h-3.5 w-3.5" />
                    ID: {selectedCC.codigo}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border/30">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Capacidad</p>
                  <p className="text-lg font-bold">128 Agentes</p>
                </div>
                <div className="p-4 rounded-lg border border-border/30">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">SLA Global</p>
                  <p className="text-lg font-bold text-status-resolved">98.5%</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Información Técnica</p>
                <div className="p-4 rounded-lg border border-border/30 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Host Regional</span>
                    <span className="font-medium font-mono text-xs">{selectedCC.id}.tecorp.lan</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CallCenters;
