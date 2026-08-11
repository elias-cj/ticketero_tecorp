import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BookOpen, Plus, Pencil, Trash2, Search, 
  Lightbulb, X, Tag, Loader2, AlertCircle
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
import { Switch } from "@/components/ui/switch";

interface Solution {
  id: string;
  titulo: string;
  descripcion?: string;
  esta_activo: boolean;
  creado_en: string;
}

const Solutions = () => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const isAdmin = useMemo(() => {
    try {
      const auth = JSON.parse(localStorage.getItem("auth") || "{}");
      return auth.role === "admin" || auth.role === "superadmin" || auth.role === "superadm" || auth.role === "administrador supremo" || auth.role === "technician" || auth.role === "it" || auth.role === "soporte";
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
    name: ""
  });

  const fetchSolutions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('soluciones')
        .select('*')
        .order('titulo', { ascending: true });

      if (error) throw error;
      if (data) setSolutions(data);
    } catch (error) {
      toast.error("Error al cargar soluciones");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSolutions();
  }, []);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const nextState = !currentActive;
      const { error } = await supabase
        .from('soluciones')
        .update({ esta_activo: nextState })
        .eq('id', id);

      if (error) throw error;

      setSolutions(prev =>
        prev.map(s => s.id === id ? { ...s, esta_activo: nextState } : s)
      );
      toast.success(`Solución ${nextState ? 'activada' : 'desactivada'}`);

      const targetSol = solutions.find(s => s.id === id);
      const solTitle = targetSol?.titulo || "Solución";
      const auth = JSON.parse(localStorage.getItem("auth") || "{}");
      await supabase.from('registros_auditoria').insert({
        usuario_id: auth?.userId || null,
        accion: 'UPDATE',
        entidad: 'soluciones',
        detalles: { message: `Solución '${solTitle}' ${nextState ? 'activada' : 'desactivada'}.` }
      });
    } catch (error) {
      toast.error("Error al cambiar el estado");
      console.error(error);
    }
  };

  const filteredSolutions = useMemo(() => {
    return solutions
      .filter(s => s.titulo.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (a.esta_activo !== b.esta_activo) return a.esta_activo ? -1 : 1;
        return a.titulo.localeCompare(b.titulo);
      });
  }, [solutions, search]);

  const handleAddNew = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('soluciones').insert({
        titulo: formData.name.trim(),
        esta_activo: true
      });
      
      if (error) {
        if (error.code === '23505') {
          toast.error("Ya existe una solución con ese nombre");
        } else {
          throw error;
        }
        return;
      }

      await fetchSolutions();
      setIsAddOpen(false);
      setFormData({ name: "" });
      toast.success("Solución añadida correctamente");
    } catch (error) {
      toast.error("Error al crear la solución");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedSolution || !formData.name.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('soluciones')
        .update({ titulo: formData.name.trim() })
        .eq('id', selectedSolution.id);

      if (error) {
        if (error.code === '23505') {
          toast.error("Ese nombre ya está en uso");
        } else {
          throw error;
        }
        return;
      }

      await fetchSolutions();
      setIsEditOpen(false);
      setSelectedSolution(null);
      setFormData({ name: "" });
      toast.success("Solución actualizada correctamente");
    } catch (error) {
      toast.error("Error al actualizar");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de archivar la solución "${name}"?`)) return;

    try {
      const { error } = await supabase.from('soluciones').update({ esta_activo: false }).eq('id', id);
      if (error) throw error;
      
      setSolutions(prev => prev.filter(s => s.id !== id));
      toast.success("Solución archivada");
    } catch (error) {
      toast.error("Error al archivar la solución");
      console.error(error);
    }
  };

  const openEdit = (s: Solution) => {
    setSelectedSolution(s);
    setFormData({ name: s.titulo });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm ring-1 ring-primary/20">
              <Lightbulb className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">Soluciones IT</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium tracking-tight border-l-2 border-primary pl-2 ml-1">
            Catálogo maestro de respuestas técnicas y resoluciones.
          </p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-black shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95" onClick={() => setFormData({ name: "" })}>
              <Plus className="h-4 w-4" />
              NUEVA SOLUCIÓN
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] border-none shadow-2xl backdrop-blur-xl bg-card/95">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tighter italic uppercase flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Registrar Solución
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-6">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest opacity-60">Nombre de la Solución</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({ name: e.target.value })} 
                  placeholder="Ej. Cambio de VLAN"
                  className="font-bold border-border/40 focus:ring-primary/20 transition-all uppercase text-[12px]" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddNew} disabled={isSubmitting} className="w-full font-black tracking-widest uppercase">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "GUARDAR EN CATÁLOGO"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none ring-1 ring-border shadow-2xl bg-card/30 backdrop-blur-md overflow-hidden rounded-2xl">
        <div className="p-4 border-b border-border/40 bg-muted/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Buscar solución rápida..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-border/30 focus:ring-primary/10 font-bold text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
             <Badge variant="secondary" className="px-3 py-1 font-black tabular-nums bg-primary/10 text-primary border-primary/20">
                {filteredSolutions.length} TOTAL
             </Badge>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Cargando Catálogo Maestro...</p>
            </div>
          ) : filteredSolutions.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/10 border-b border-border/40">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest pl-6">Nombre de la Solución</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">Referencia</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">Estado</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest pr-6 w-32">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filteredSolutions.map((s, index) => (
                    <TableRow 
                      key={s.id} 
                      className="group border-b border-border/20 hover:bg-primary/[0.02] transition-colors"
                    >
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-background border border-border/40 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-all shadow-sm">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-[13px] tracking-tight truncate max-w-[400px] text-foreground/90">{s.titulo}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                         <span className="px-2 py-0.5 rounded-full bg-muted font-mono text-[9px] font-bold border border-border/50 text-muted-foreground uppercase">
                           SLN-{s.id.slice(0, 4)}
                         </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={s.esta_activo}
                            onCheckedChange={() => handleToggleActive(s.id, s.esta_activo)}
                          />
                          <span className={`text-xs font-semibold ${s.esta_activo ? "text-emerald-500" : "text-muted-foreground"}`}>
                            {s.esta_activo ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => handleDelete(s.id, s.titulo)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">No se encontraron soluciones que coincidan</p>
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
              Actualizar Solución
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="text-[10px] font-black uppercase tracking-widest opacity-60">Modificar Nombre</Label>
              <Input 
                id="edit-name" 
                value={formData.name} 
                onChange={e => setFormData({ name: e.target.value })}
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

export default Solutions;
