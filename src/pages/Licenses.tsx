import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Shield, Key, Calendar, User, 
  ExternalLink, AlertCircle, CheckCircle2, 
  MoreVertical, Edit2, Trash2, Loader2, Clock, 
  LayoutGrid, List, Eye
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { type License } from "@/types";

const emptyForm = {
  id: "",
  name: "",
  key: "",
  expiration_date: "",
  assigned_to: "",
  status: "activa",
  notes: ""
};

import { usePermissions } from "@/hooks/usePermissions";

const Licenses = () => {
  const { canView, canCreate, canEdit, canDelete } = usePermissions("Licencias");
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const fetchLicenses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("licencias")
        .select("*")
        .neq('estado', 'revocada')
        .order("fecha_expiracion", { ascending: true });

      if (error) throw error;
      
      // Map database fields to UI state
      const mappedData: License[] = (data || []).map(item => ({
        id: item.id,
        name: item.nombre,
        key: item.clave_licencia,
        expiration_date: item.fecha_expiracion,
        assigned_to: item.usuario_asignado_id,
        status: item.estado,
        notes: item.notas
      }));

      setLicenses(mappedData);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar las licencias");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const filteredLicenses = licenses.filter(license => 
    license.name.toLowerCase().includes(search.toLowerCase()) || 
    license.key?.toLowerCase().includes(search.toLowerCase()) ||
    license.assigned_to?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusInfo = (expirationDate: string | null) => {
    if (!expirationDate) return { label: "Permanente", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 };
    
    const today = new Date();
    const exp = new Date(expirationDate);
    // Setting both times to midnight for accurate days calc
    today.setHours(0,0,0,0);
    exp.setHours(0,0,0,0);
    
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: "Expirada", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: AlertCircle };
    if (diffDays <= 30) return { label: "Expira pronto", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock };
    return { label: "Activa", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle2 };
  };

  const openAdd = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setIsViewing(false);
    setIsDialogOpen(true);
  };

  const openView = (license: License) => {
    setFormData({
      id: license.id,
      name: license.name,
      key: license.key || "",
      expiration_date: license.expiration_date ? license.expiration_date.substring(0, 10) : "",
      assigned_to: license.assigned_to || "",
      status: license.status,
      notes: license.notes || ""
    });
    setIsEditing(false);
    setIsViewing(true);
    setIsDialogOpen(true);
  };

  const openEdit = (license: License) => {
    setFormData({
      id: license.id,
      name: license.name,
      key: license.key || "",
      expiration_date: license.expiration_date ? license.expiration_date.substring(0, 10) : "",
      assigned_to: license.assigned_to || "",
      status: license.status,
      notes: license.notes || ""
    });
    setIsEditing(true);
    setIsViewing(false);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de revocar esta licencia?")) return;
    try {
      const { error } = await supabase.from("licencias").update({ estado: 'revocada' }).eq("id", id);
      if (error) throw error;
      toast.success("Licencia revocada");
      fetchLicenses();
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar licencia");
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre de la licencia es obligatorio");
      return;
    }
    
    try {
      const payload = {
        nombre: formData.name,
        clave_licencia: formData.key,
        fecha_expiracion: formData.expiration_date || null,
        // usuario_asignado_id: formData.assigned_to,
        estado: formData.status,
        notas: formData.notes
      };

      if (isEditing) {
        const { error } = await supabase.from("licencias").update(payload).eq("id", formData.id);
        if (error) throw error;
        toast.success("Licencia actualizada");
      } else {
        const { error } = await supabase.from("licencias").insert(payload);
        if (error) throw error;
        toast.success("Licencia registrada");
      }
      setIsDialogOpen(false);
      fetchLicenses();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar la licencia");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestión de Licencias</h1>
          <p className="text-muted-foreground mt-1 text-sm">Control de software corporativo y vencimientos.</p>
        </div>
        <div className="flex items-center gap-3">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)} className="bg-muted p-1 rounded-lg">
            <ToggleGroupItem value="list" aria-label="Vista de Lista" className="h-8 w-10 px-0">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Vista de Cuadrícula" className="h-8 w-10 px-0">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={openAdd} className="gap-2 shadow-sm font-bold">
            <Plus className="h-4 w-4" /> Registrar Licencia
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border-none shadow-sm ring-1 ring-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total software</p>
            <p className="text-2xl font-black mt-1 text-primary">{licenses.length}</p>
          </div>
          <Shield className="h-8 w-8 text-primary/20" />
        </div>
        <div className="bg-card border-none shadow-sm ring-1 ring-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Por Vencer (30d)</p>
            <p className="text-2xl font-black mt-1 text-amber-500">
              {licenses.filter(l => {
                if (!l.expiration_date) return false;
                const today = new Date();
                today.setHours(0,0,0,0);
                const exp = new Date(l.expiration_date);
                exp.setHours(0,0,0,0);
                const diff = (exp.getTime() - today.getTime()) / (1000*60*60*24);
                return diff >= 0 && diff <= 30;
              }).length}
            </p>
          </div>
          <Clock className="h-8 w-8 text-amber-500/20" />
        </div>
        <div className="bg-card border-none shadow-sm ring-1 ring-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Expiradas</p>
            <p className="text-2xl font-black mt-1 text-red-500">
              {licenses.filter(l => {
                if (!l.expiration_date) return false;
                const today = new Date();
                today.setHours(0,0,0,0);
                const exp = new Date(l.expiration_date);
                exp.setHours(0,0,0,0);
                return exp < today;
              }).length}
            </p>
          </div>
          <AlertCircle className="h-8 w-8 text-red-500/20" />
        </div>
      </div>

      {/* Search */}
      <Card className="border-none shadow-sm ring-1 ring-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre de software, usuario o clave..." 
              className="pl-10 h-10 border-none bg-background/50 focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dynamic View Content */}
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium italic">Validando claves de software...</p>
        </div>
      ) : filteredLicenses.length > 0 ? (
        <AnimatePresence mode="wait">
          {viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredLicenses.map((license, index) => {
                const status = getStatusInfo(license.expiration_date);
                const StatusIcon = status.icon;
                
                return (
                  <Card key={license.id} className="group hover:shadow-lg transition-all border-none ring-1 ring-border bg-card overflow-hidden h-full flex flex-col">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-widest py-0 border flex items-center gap-1 w-fit ${status.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                          <CardTitle className="text-lg font-bold pt-1">{license.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Ver Detalles" onClick={() => openView(license)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors" title="Editar" onClick={() => openEdit(license)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Eliminar" onClick={() => handleDelete(license.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 space-y-4 flex-1 flex flex-col">
                      <div className="bg-muted/30 p-3 rounded-lg border border-border/50 group-hover:bg-primary/5 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">License Key</p>
                          <Key className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <p className="text-xs font-mono font-medium truncate text-foreground/80">{license.key || "No especificada"}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-auto pt-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <Calendar className="h-3 w-3" /> Expiración
                          </div>
                          <p className="text-xs font-semibold">
                            {license.expiration_date ? new Date(license.expiration_date).toLocaleDateString() : "Permanente"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <User className="h-3 w-3" /> Asignado a
                          </div>
                          <p className="text-xs font-semibold truncate">{license.assigned_to || "No asignado"}</p>
                        </div>
                      </div>

                      {license.notes && (
                        <p className="text-[11px] text-muted-foreground italic line-clamp-2 border-t border-border/50 pt-3 mt-3">
                          "{license.notes}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-card rounded-2xl border-none ring-1 ring-border overflow-hidden shadow-sm"
            >
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[280px]">Software / Producto</TableHead>
                    <TableHead className="hidden lg:table-cell">Clave de Licencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Expiración</TableHead>
                    <TableHead className="hidden lg:table-cell">Asignado a</TableHead>
                    <TableHead className="text-right w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLicenses.map((license) => {
                    const status = getStatusInfo(license.expiration_date);
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={license.id} className="group transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              <Shield className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-foreground line-clamp-1">{license.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded border border-border/50 text-foreground/70">
                            {license.key || "---"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-widest py-1 px-2 border flex items-center gap-1 w-fit ${status.color}`}>
                            <StatusIcon className="h-3 w-3" /> {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {license.expiration_date ? new Date(license.expiration_date).toLocaleDateString() : "Permanente"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs font-medium text-foreground/80">
                          {license.assigned_to || "No asignado"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Ver Detalles" onClick={() => openView(license)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors" title="Editar" onClick={() => openEdit(license)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Eliminar" onClick={() => handleDelete(license.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <div className="py-20 text-center bg-muted/5 rounded-2xl border border-dashed border-border/50">
          <Shield className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground">Sin licencias registradas</h3>
          <p className="text-muted-foreground max-w-xs mx-auto mt-2 text-sm italic">No se encontraron registros de software que coincidan.</p>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isViewing ? "Detalles de la Licencia" : isEditing ? "Editar Licencia" : "Registrar Licencia"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {isViewing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                  <div className="col-span-2 space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Software / Producto</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <p className="text-sm font-bold text-foreground">{formData.name}</p>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-1 bg-background/50 p-2 rounded border border-border/30">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Clave de Licencia (Key)</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs font-mono font-bold text-primary tracking-wider">{formData.key || "---"}</p>
                      <Key className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Estado</p>
                    <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-widest py-1 border flex items-center gap-1 w-fit mt-1 ${getStatusInfo(formData.expiration_date).color}`}>
                      {getStatusInfo(formData.expiration_date).label}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vencimiento</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm font-bold text-foreground/80">
                        {formData.expiration_date ? new Date(formData.expiration_date).toLocaleDateString() : "Permanente"}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-1 pt-2 border-t border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Asignado a</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-bold text-foreground">{formData.assigned_to || "No asignado"}</p>
                    </div>
                  </div>

                  {formData.notes && (
                    <div className="col-span-2 space-y-1 pt-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Notas / Comentarios</p>
                      <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded-lg">
                        "{formData.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="name">Software / Producto</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. Microsoft 365, AutoCAD 2024" />
                </div>
                
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="key">Clave de Licencia (Key)</Label>
                  <Input id="key" value={formData.key} onChange={e => setFormData({...formData, key: e.target.value})} placeholder="XXXX-XXXX-XXXX-XXXX" className="font-mono text-sm" />
                </div>

                <div className="grid gap-2">
                  <Label>Estado</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activa">Activa</SelectItem>
                      <SelectItem value="inactiva">Inactiva</SelectItem>
                      <SelectItem value="expirada">Expirada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="expiration">Fecha de Vencimiento</Label>
                  <Input id="expiration" type="date" value={formData.expiration_date} onChange={e => setFormData({...formData, expiration_date: e.target.value})} />
                  <p className="text-[10px] text-muted-foreground">Dejar en blanco si es permanente</p>
                </div>

                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="assigned">Asignado a (Opcional)</Label>
                  <Input id="assigned" value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})} placeholder="Nombre del empleado o equipo" />
                </div>

                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="notes">Notas o Comentarios</Label>
                  <Input id="notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Ej. Comprada a proveedor X, ligada al correo..." />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{isViewing ? "Cerrar" : "Cancelar"}</Button>
            {!isViewing && (
              <Button onClick={handleSubmit} className="font-bold">{isEditing ? "Guardar Cambios" : "Registrar Licencia"}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Licenses;
