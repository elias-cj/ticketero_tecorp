import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Pencil, Trash2, Search, 
  AlertCircle, AlertTriangle, Loader2, ListTree
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
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";

interface ProblemType {
  id: string;
  nombre: string;
  categoria_id: string;
  esta_activo: boolean;
  categorias_problema?: { nombre: string } | null;
}

interface Category {
  id: string;
  nombre: string;
}

const ProblemTypes = () => {
  const [problems, setProblems] = useState<ProblemType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<ProblemType | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const { user } = useAuth();

  const isTechOrAdmin = useMemo(() => {
    const role = (user?.role || '').toLowerCase();
    const roleName = (user?.roleName || '').toLowerCase();
    return role.includes('admin') || role.includes('soporte') || role.includes('super') || roleName.includes('admin') || roleName.includes('soporte') || roleName.includes('supremo');
  }, [user]);

  const canCreate = useMemo(() => {
    if (isTechOrAdmin) return true;
    const perms = user?.permissions?.['Tipos de Problema'] || [];
    return perms.includes('CREAR');
  }, [user, isTechOrAdmin]);

  const canEdit = useMemo(() => {
    if (isTechOrAdmin) return true;
    const perms = user?.permissions?.['Tipos de Problema'] || [];
    return perms.includes('EDITAR');
  }, [user, isTechOrAdmin]);

  const canDelete = useMemo(() => {
    if (isTechOrAdmin) return true;
    const perms = user?.permissions?.['Tipos de Problema'] || [];
    return perms.includes('ELIMINAR');
  }, [user, isTechOrAdmin]);

  const canView = useMemo(() => {
    if (isTechOrAdmin) return true;
    const perms = user?.permissions?.['Tipos de Problema'] || [];
    return perms.includes('VER');
  }, [user, isTechOrAdmin]);

  // Form State
  const [formData, setFormData] = useState({
    nombre: "",
    categoria_id: ""
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [probRes, catRes] = await Promise.all([
        supabase
          .from('tipos_problema')
          .select('*, categorias_problema(nombre)')
          .order('nombre', { ascending: true }),
        supabase
          .from('categorias_problema')
          .select('*')
          .order('nombre', { ascending: true })
      ]);

      if (probRes.error) throw probRes.error;
      if (catRes.error) throw catRes.error;

      if (probRes.data) setProblems(probRes.data as any);
      if (catRes.data) {
        setCategories(catRes.data);
        if (catRes.data.length > 0) {
           setFormData(prev => ({ ...prev, categoria_id: catRes.data[0].id }));
        }
      }
    } catch (error) {
      toast.error("Error al cargar los tipos de problema");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const nextState = !currentActive;
      const { error } = await supabase
        .from('tipos_problema')
        .update({ esta_activo: nextState })
        .eq('id', id);

      if (error) throw error;

      setProblems(prev =>
        prev.map(p => p.id === id ? { ...p, esta_activo: nextState } : p)
      );
      toast.success(`Tipo de problema ${nextState ? 'activado' : 'desactivado'}`);
    } catch (error) {
      toast.error("Error al cambiar el estado");
      console.error(error);
    }
  };

  const filteredProblems = useMemo(() => {
    return problems
      .filter(s => 
        s.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (s.categorias_problema?.nombre || "").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (a.esta_activo !== b.esta_activo) return a.esta_activo ? -1 : 1;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [problems, search]);

  const handleAddNew = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!formData.categoria_id) {
      toast.error("Debe seleccionar una categoría");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('tipos_problema').insert({
        nombre: formData.nombre.trim(),
        categoria_id: formData.categoria_id,
        esta_activo: true
      });
      
      if (error) throw error;

      await fetchData();
      setIsAddOpen(false);
      setFormData({ nombre: "", categoria_id: categories.length > 0 ? categories[0].id : "" });
      toast.success("Tipo de problema añadido correctamente");
    } catch (error: any) {
      toast.error(error.message || "Error al crear el registro");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProblem || !formData.nombre.trim() || !formData.categoria_id) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('tipos_problema')
        .update({ 
          nombre: formData.nombre.trim(),
          categoria_id: formData.categoria_id 
        })
        .eq('id', selectedProblem.id);

      if (error) throw error;

      await fetchData();
      setIsEditOpen(false);
      setSelectedProblem(null);
      setFormData({ nombre: "", categoria_id: categories.length > 0 ? categories[0].id : "" });
      toast.success("Actualizado correctamente");
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de archivar el tipo de problema "${name}"?`)) return;

    try {
      const { error } = await supabase.from('tipos_problema').update({ esta_activo: false }).eq('id', id);
      if (error) throw error;
      
      setProblems(prev => prev.filter(s => s.id !== id));
      toast.success("Registro archivado");
    } catch (error) {
      toast.error("Error al archivar");
      console.error(error);
    }
  };

  const openEdit = (p: ProblemType) => {
    setSelectedProblem(p);
    setFormData({ nombre: p.nombre, categoria_id: p.categoria_id });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive shadow-sm ring-1 ring-destructive/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">Tipos de Problema</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium tracking-tight border-l-2 border-destructive pl-2 ml-1">
            Gestión de las clasificaciones de incidentes del sistema.
          </p>
        </div>
        
        {canCreate ? (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-black shadow-lg shadow-destructive/20 bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all active:scale-95">
                <Plus className="h-4 w-4" />
                NUEVO PROBLEMA
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="sm:max-w-[425px] border-none shadow-2xl backdrop-blur-xl bg-card/95">
              <DialogHeader>
                <DialogTitle className="text-xl font-black tracking-tighter italic uppercase flex items-center gap-2">
                  <Plus className="h-5 w-5 text-destructive" />
                  Registrar Problema
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-6">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Categoría</Label>
                  <select 
                    value={formData.categoria_id}
                    onChange={e => setFormData({ ...formData, categoria_id: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Nombre del Problema</Label>
                  <Input 
                    value={formData.nombre} 
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })} 
                    placeholder="Ej. Pantalla Azul"
                    className="font-bold border-border/40 focus:ring-destructive/20 transition-all uppercase text-[12px]" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddNew} disabled={isSubmitting} variant="destructive" className="w-full font-black tracking-widest uppercase">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "GUARDAR REGISTRO"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <Card className="border-none ring-1 ring-border shadow-2xl bg-card/30 backdrop-blur-md overflow-hidden rounded-2xl">
        <div className="p-4 border-b border-border/40 bg-muted/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-destructive transition-colors" />
            <Input 
              placeholder="Buscar problema..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-border/30 focus:ring-destructive/10 font-bold text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
             <Badge variant="secondary" className="px-3 py-1 font-black tabular-nums bg-destructive/10 text-destructive border-destructive/20">
                {filteredProblems.length} TOTAL
             </Badge>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
              <Loader2 className="h-10 w-10 animate-spin text-destructive" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Cargando Catálogo...</p>
            </div>
          ) : filteredProblems.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/10 border-b border-border/40">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest pl-6">Tipo de Problema</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">Categoría</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">Estado</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest pr-6 w-32">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filteredProblems.map((p) => (
                    <TableRow 
                      key={p.id} 
                      className="group border-b border-border/20 hover:bg-destructive/[0.02] transition-colors"
                    >
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-background border border-border/40 flex items-center justify-center text-muted-foreground group-hover:text-destructive group-hover:bg-destructive/5 transition-all shadow-sm">
                            <ListTree className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-[13px] tracking-tight truncate max-w-[400px] text-foreground/90">{p.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                         <span className="px-2 py-0.5 rounded-full bg-muted font-mono text-[9px] font-bold border border-border/50 text-muted-foreground uppercase">
                           {p.categorias_problema?.nombre || "N/A"}
                         </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={p.esta_activo}
                            onCheckedChange={() => handleToggleActive(p.id, p.esta_activo)}
                          />
                          <span className={`text-xs font-semibold ${p.esta_activo ? "text-emerald-500" : "text-muted-foreground"}`}>
                            {p.esta_activo ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              onClick={() => openEdit(p)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => handleDelete(p.id, p.nombre)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/30 border-2 border-dashed border-border">
                <AlertCircle className="h-8 w-8" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">No se encontraron registros</p>
            </div>
          )}
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] border-none shadow-2xl backdrop-blur-xl bg-card/95">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tighter italic uppercase flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Actualizar Problema
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Categoría</Label>
                <select 
                  value={formData.categoria_id}
                  onChange={e => setFormData({ ...formData, categoria_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Modificar Nombre</Label>
              <Input 
                value={formData.nombre} 
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                className="font-bold border-border/40 focus:ring-primary/20 transition-all uppercase text-[12px]" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={isSubmitting} className="w-full font-black tracking-widest uppercase">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "ACTUALIZAR REGISTRO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProblemTypes;
