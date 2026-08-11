import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Filter, Monitor, Laptop, Smartphone, 
  HardDrive, Cpu, MoreVertical, Edit2, Trash2, Tag, 
  MapPin, User, Calendar, AlertCircle, Loader2,
  LayoutGrid, List, Eye
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger 
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
import { type InventoryItem } from "@/types";

const emptyForm = {
  id: "",
  name: "",
  type: "Laptop",
  nasa_code: "",
  serial_number: "",
  status: "disponible",
  location: "",
  assigned_to: ""
};

import { usePermissions } from "@/hooks/usePermissions";

const Inventory = () => {
  const { canView, canCreate, canEdit, canDelete } = usePermissions("Inventario");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventario")
        .select("*")
        .neq('estado', 'de baja')
        .order("creado_en", { ascending: false });

      if (error) throw error;
      
      // Map database fields to UI state
      const mappedData: InventoryItem[] = (data || []).map(item => ({
        id: item.id,
        name: item.nombre,
        type: item.categoria_id || "Laptop", // Or join with categories if needed
        nasa_code: item.codigo_nasa,
        serial_number: item.numero_serie,
        status: item.estado,
        location: item.ubicacion,
        assigned_to: item.usuario_asignado_id
      }));

      setItems(mappedData);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar el inventario");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name?.toLowerCase().includes(search.toLowerCase()) || 
      item.nasa_code?.toLowerCase().includes(search.toLowerCase()) ||
      item.serial_number?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "disponible": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "asignado": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "mantenimiento": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "de baja": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    }
  };

  const getItemIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "laptop": return Laptop;
      case "desktop": return Monitor;
      case "mobile": return Smartphone;
      case "servidor": return HardDrive;
      default: return Cpu;
    }
  };

  const openAdd = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setIsViewing(false);
    setIsDialogOpen(true);
  };

  const openView = (item: InventoryItem) => {
    setFormData({
      id: item.id,
      name: item.name,
      type: item.type,
      nasa_code: item.nasa_code || "",
      serial_number: item.serial_number || "",
      status: item.status,
      location: item.location || "",
      assigned_to: item.assigned_to || ""
    });
    setIsEditing(false);
    setIsViewing(true);
    setIsDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setFormData({
      id: item.id,
      name: item.name,
      type: item.type,
      nasa_code: item.nasa_code || "",
      serial_number: item.serial_number || "",
      status: item.status,
      location: item.location || "",
      assigned_to: item.assigned_to || ""
    });
    setIsEditing(true);
    setIsViewing(false);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de dar de baja este equipo?")) return;
    try {
      const { error } = await supabase.from("inventario").update({ estado: 'de baja' }).eq("id", id);
      if (error) throw error;
      toast.success("Equipo dado de baja correctamente");
      fetchItems();
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar el equipo");
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        nombre: formData.name,
        // categoria_id: formData.type, // Map type to category UUID if available
        codigo_nasa: formData.nasa_code,
        numero_serie: formData.serial_number,
        estado: formData.status,
        ubicacion: formData.location,
        // usuario_asignado_id: formData.assigned_to // Map to user UUID
      };

      if (isEditing) {
        const { error } = await supabase.from("inventario").update(payload).eq("id", formData.id);
        if (error) throw error;
        toast.success("Equipo actualizado correctamente");
      } else {
        const { error } = await supabase.from("inventario").insert(payload);
        if (error) throw error;
        toast.success("Equipo creado correctamente");
      }
      setIsDialogOpen(false);
      fetchItems();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar el equipo");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventario General</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gestión de activos y equipos con trazabilidad NASA.</p>
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
            <Plus className="h-4 w-4" /> Nuevo Equipo
          </Button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border-none shadow-sm ring-1 ring-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Equipos</p>
            <p className="text-2xl font-black mt-1 text-primary">{items.length}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
            <Monitor className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="bg-card border-none shadow-sm ring-1 ring-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Disponibles</p>
            <p className="text-2xl font-black mt-1 text-green-500">{items.filter(i => i.status.toLowerCase() === "disponible").length}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
            <Tag className="h-5 w-5 text-green-500" />
          </div>
        </div>
        <div className="bg-card border-none shadow-sm ring-1 ring-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">En Uso</p>
            <p className="text-2xl font-black mt-1 text-blue-500">{items.filter(i => i.status.toLowerCase() === "asignado").length}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
            <User className="h-5 w-5 text-blue-500" />
          </div>
        </div>
        <div className="bg-card border-none shadow-sm ring-1 ring-border p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mantenimiento</p>
            <p className="text-2xl font-black mt-1 text-amber-500">{items.filter(i => i.status.toLowerCase() === "mantenimiento").length}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border-none shadow-sm ring-1 ring-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre, código NASA o serie..." 
              className="pl-10 h-10 border-none bg-background/50 focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {["all", "Laptop", "Desktop", "Servidor", "Monitor", "Otro"].map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                className="h-9 px-4 rounded-full text-xs font-bold"
                onClick={() => setFilterType(type)}
              >
                {type === "all" ? "Todos" : type}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dynamic View Content */}
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium italic">Escaneando inventario...</p>
        </div>
      ) : filteredItems.length > 0 ? (
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
              {filteredItems.map((item, index) => {
                const Icon = getItemIcon(item.type);
                return (
                  <Card key={item.id} className="group hover:shadow-lg transition-all border-none ring-1 ring-border overflow-hidden bg-card">
                    <CardHeader className="p-5 pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold line-clamp-1">{item.name}</CardTitle>
                            <Badge variant="outline" className={`mt-1 text-[10px] uppercase font-black tracking-widest py-0 border ${getStatusColor(item.status)}`}>
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Ver Detalles" onClick={() => openView(item)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors" title="Editar" onClick={() => openEdit(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Eliminar" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-2 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Código NASA</p>
                          <p className="text-sm font-black text-primary font-mono">{item.nasa_code || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Número de Serie</p>
                          <p className="text-sm font-semibold text-foreground/80">{item.serial_number || "S/N"}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="font-medium text-foreground/80">{item.location || "Sin ubicación"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span className="font-medium text-foreground/80">{item.assigned_to || "No asignado"}</span>
                        </div>
                      </div>
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
                    <TableHead className="w-[300px]">Equipo</TableHead>
                    <TableHead>Código NASA</TableHead>
                    <TableHead className="hidden lg:table-cell">No. Serie</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden lg:table-cell">Asignado / Ubicación</TableHead>
                    <TableHead className="text-right w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const Icon = getItemIcon(item.type);
                    return (
                      <TableRow key={item.id} className="group transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                              <Icon className="h-4.5 w-4.5" />
                            </div>
                            <span className="font-bold text-foreground line-clamp-1">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-black text-primary font-mono bg-primary/5 px-2 py-1 rounded border border-primary/10">
                            {item.nasa_code || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs font-medium text-muted-foreground">
                          {item.serial_number || "---"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider h-6 px-2">
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-widest py-1 px-2 border ${getStatusColor(item.status)}`}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-foreground/80 font-medium">
                              <User className="h-3 w-3" /> {item.assigned_to || "Sin asignar"}
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                              <MapPin className="h-2.5 w-2.5" /> {item.location || "N/A"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Ver Detalles" onClick={() => openView(item)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors" title="Editar" onClick={() => openEdit(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Eliminar" onClick={() => handleDelete(item.id)}>
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
          <Monitor className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground">Sin equipos encontrados</h3>
          <p className="text-muted-foreground max-w-xs mx-auto mt-2 text-sm italic">No hay elementos que coincidan con los criterios de búsqueda.</p>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isViewing ? "Detalles del Equipo" : isEditing ? "Editar Equipo" : "Nuevo Equipo"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {isViewing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nombre</p>
                    <p className="text-sm font-bold text-foreground">{formData.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tipo</p>
                    <Badge variant="secondary" className="font-bold">{formData.type}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Código NASA</p>
                    <p className="text-sm font-black text-primary font-mono">{formData.nasa_code || "---"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No. Serie</p>
                    <p className="text-sm font-medium text-foreground/80 font-mono">{formData.serial_number || "---"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Estado</p>
                    <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-widest py-0.5 border ${getStatusColor(formData.status)}`}>
                      {formData.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ubicación</p>
                    <p className="text-sm font-medium text-foreground/70">{formData.location || "No asignada"}</p>
                  </div>
                  <div className="col-span-2 space-y-1 pt-2 border-t border-border/50 mt-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Responsable Asignado</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm font-bold text-foreground">{formData.assigned_to || "Sin responsable asignado"}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="name">Nombre del Equipo</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. ThinkPad T14" />
                </div>
                
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laptop">Laptop</SelectItem>
                      <SelectItem value="Desktop">Desktop</SelectItem>
                      <SelectItem value="Monitor">Monitor</SelectItem>
                      <SelectItem value="Servidor">Servidor</SelectItem>
                      <SelectItem value="Mobile">Mobile</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Estado</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponible">Disponible</SelectItem>
                      <SelectItem value="asignado">Asignado</SelectItem>
                      <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                      <SelectItem value="de baja">De Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="nasa_code">Código NASA</Label>
                  <Input id="nasa_code" value={formData.nasa_code} onChange={e => setFormData({...formData, nasa_code: e.target.value})} placeholder="Ej. NS-2023-01" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="serial">No. Serie</Label>
                  <Input id="serial" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} placeholder="S/N" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="assigned">Asignado a</Label>
                  <Input id="assigned" value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})} placeholder="Nombre de usuario" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input id="location" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Ej. Piso 3, Oficina 10" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{isViewing ? "Cerrar" : "Cancelar"}</Button>
            {!isViewing && (
              <Button onClick={handleSubmit} className="font-bold">{isEditing ? "Guardar Cambios" : "Añadir Equipo"}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
