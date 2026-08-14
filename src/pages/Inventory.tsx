import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Filter, Monitor, Laptop, Smartphone, 
  HardDrive, Cpu, MoreVertical, Edit2, Trash2, Tag, 
  MapPin, User, Calendar, AlertCircle, Loader2,
  LayoutGrid, List, Eye, Building2, UserCheck, History,
  ArrowRightLeft, Ban, FileText, CheckCircle2, Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { type InventoryItem, type InventoryHistoryItem } from "@/types";
import { usePermissions } from "@/hooks/usePermissions";

const todayStr = new Date().toISOString().split("T")[0];

const emptyForm = {
  id: "",
  name: "",
  type: "Laptop",
  nasa_code: "",
  serial_number: "",
  features: "",
  status: "disponible",
  call_center_id: "",
  assigned_to: "",
  delivery_date: todayStr,
  return_date: "",
  notes: ""
};

const emptyReassignForm = {
  itemId: "",
  itemName: "",
  currentAssignee: "",
  previousReturnDate: todayStr,
  newAssignee: "",
  newCallCenterId: "",
  deliveryDate: todayStr,
  reason: "Reasignación de equipo por nuevo ingreso / cambio de puesto"
};

const emptyDecommissionForm = {
  itemId: "",
  itemName: "",
  currentAssignee: "",
  reason: "Obsolescencia / Falla técnica irreparable"
};

const Inventory = () => {
  const { canView, canCreate, canEdit, canDelete } = usePermissions("Inventario");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [callCenters, setCallCenters] = useState<{ id: string; nombre: string; nombre_corto?: string; pais?: string }[]>([]);
  const [historyList, setHistoryList] = useState<InventoryHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCallCenter, setFilterCallCenter] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  // Modales
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [isDecommissionOpen, setIsDecommissionOpen] = useState(false);

  // Estados de formularios
  const [formData, setFormData] = useState(emptyForm);
  const [reassignData, setReassignData] = useState(emptyReassignForm);
  const [decommissionData, setDecommissionData] = useState(emptyDecommissionForm);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const [invRes, ccRes] = await Promise.all([
        supabase
          .from("inventario")
          .select("*")
          .order("creado_en", { ascending: false }),
        supabase
          .from("call_centers")
          .select("id, nombre, nombre_corto, pais")
          .eq("esta_activo", true)
          .order("nombre")
      ]);

      if (invRes.error) throw invRes.error;
      if (ccRes.data) setCallCenters(ccRes.data);

      // Mapeo de campos de base de datos a modelo de UI
      const mappedData: InventoryItem[] = (invRes.data || []).map(item => ({
        id: item.id,
        name: item.nombre,
        type: item.categoria || "Laptop",
        nasa_code: item.codigo,
        serial_number: item.numero_serie,
        features: item.caracteristicas,
        status: item.estado || "disponible",
        call_center_id: item.centro_contacto_id || "",
        assigned_to: item.asignado_a || "",
        delivery_date: item.fecha_entrega,
        return_date: item.fecha_devolucion,
        notes: item.notas,
        created_at: item.creado_en,
        updated_at: item.actualizado_en
      }));

      setItems(mappedData);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar el inventario");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async (itemId: string) => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("historial_inventario")
        .select("*")
        .eq("inventario_id", itemId)
        .order("creado_en", { ascending: false });

      if (error) throw error;
      setHistoryList(data || []);
    } catch (error) {
      console.error("Error al cargar historial:", error);
      setHistoryList([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const callCentersMap = useMemo(() => {
    const map = new Map<string, string>();
    callCenters.forEach(cc => map.set(cc.id, cc.nombre));
    return map;
  }, [callCenters]);

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name?.toLowerCase().includes(search.toLowerCase()) || 
      item.nasa_code?.toLowerCase().includes(search.toLowerCase()) ||
      item.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.assigned_to?.toLowerCase().includes(search.toLowerCase()) ||
      item.features?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesCallCenter = filterCallCenter === "all" || item.call_center_id === filterCallCenter;
    const matchesStatus = filterStatus === "all" || item.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesType && matchesCallCenter && matchesStatus;
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

  // Abrir Modal de Creación
  const openAdd = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setIsViewing(false);
    setIsDialogOpen(true);
  };

  // Abrir Modal de Visualización con Historial
  const openView = (item: InventoryItem) => {
    setFormData({
      id: item.id,
      name: item.name,
      type: item.type,
      nasa_code: item.nasa_code || "",
      serial_number: item.serial_number || "",
      features: item.features || "",
      status: item.status,
      call_center_id: item.call_center_id || "",
      assigned_to: item.assigned_to || "",
      delivery_date: item.delivery_date || "",
      return_date: item.return_date || "",
      notes: item.notes || ""
    });
    setIsEditing(false);
    setIsViewing(true);
    setIsDialogOpen(true);
    fetchHistory(item.id);
  };

  // Abrir Modal de Edición
  const openEdit = (item: InventoryItem) => {
    setFormData({
      id: item.id,
      name: item.name,
      type: item.type,
      nasa_code: item.nasa_code || "",
      serial_number: item.serial_number || "",
      features: item.features || "",
      status: item.status,
      call_center_id: item.call_center_id || "",
      assigned_to: item.assigned_to || "",
      delivery_date: item.delivery_date || todayStr,
      return_date: item.return_date || "",
      notes: item.notes || ""
    });
    setIsEditing(true);
    setIsViewing(false);
    setIsDialogOpen(true);
  };

  // Abrir Modal de Reasignación
  const openReassign = (item: InventoryItem) => {
    setReassignData({
      itemId: item.id,
      itemName: `${item.name} (${item.nasa_code || item.serial_number || 'S/N'})`,
      currentAssignee: item.assigned_to || "Sin responsable",
      previousReturnDate: todayStr,
      newAssignee: "",
      newCallCenterId: item.call_center_id || "",
      deliveryDate: todayStr,
      reason: "Reasignación de equipo por nuevo ingreso / cambio de puesto"
    });
    setIsReassignOpen(true);
  };

  // Abrir Modal de Dar de Baja
  const openDecommission = (item: InventoryItem) => {
    setDecommissionData({
      itemId: item.id,
      itemName: `${item.name} (${item.nasa_code || item.serial_number || 'S/N'})`,
      currentAssignee: item.assigned_to || "Sin responsable",
      reason: "Obsolescencia / Falla técnica irreparable"
    });
    setIsDecommissionOpen(true);
  };

  // Guardar Creación / Edición
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre del equipo es obligatorio");
      return;
    }

    try {
      const payload = {
        nombre: formData.name,
        categoria: formData.type,
        codigo: formData.nasa_code?.trim() || null,
        numero_serie: formData.serial_number?.trim() || null,
        caracteristicas: formData.features?.trim() || null,
        estado: formData.status,
        centro_contacto_id: formData.call_center_id || null,
        asignado_a: formData.assigned_to?.trim() || null,
        fecha_entrega: formData.delivery_date || todayStr,
        fecha_devolucion: formData.return_date || null,
        notas: formData.notes?.trim() || null
      };

      if (isEditing) {
        const { error } = await supabase.from("inventario").update(payload).eq("id", formData.id);
        if (error) throw error;
        toast.success("Equipo actualizado correctamente");
      } else {
        const { data: newEquipo, error } = await supabase.from("inventario").insert(payload).select().single();
        if (error) throw error;

        // Si se creó ya asignado a una persona, registrar en el historial
        if (formData.assigned_to?.trim()) {
          await supabase.from("historial_inventario").insert({
            inventario_id: newEquipo.id,
            responsable: formData.assigned_to.trim(),
            centro_contacto_id: formData.call_center_id || null,
            fecha_entrega: formData.delivery_date || todayStr,
            motivo: "Asignación inicial al registrar equipo"
          });
        }

        toast.success("Equipo creado correctamente");
      }
      setIsDialogOpen(false);
      fetchItems();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar el equipo");
    }
  };

  // Ejecutar Reasignación formal con cierre de ciclo anterior
  const handleReassignSubmit = async () => {
    if (!reassignData.newAssignee.trim()) {
      toast.error("El nombre del nuevo responsable es obligatorio");
      return;
    }

    try {
      const targetItem = items.find(i => i.id === reassignData.itemId);
      const returnDateValue = reassignData.previousReturnDate || todayStr;

      // 1. Cerrar todos los ciclos anteriores abiertos para este equipo
      await supabase
        .from("historial_inventario")
        .update({ fecha_devolucion: returnDateValue })
        .eq("inventario_id", reassignData.itemId)
        .is("fecha_devolucion", null);

      // 2. Si es la primera vez que se usa el historial y no había ningún registro previo para el responsable anterior, registrar su historial cerrado
      const { data: existingHist } = await supabase
        .from("historial_inventario")
        .select("id")
        .eq("inventario_id", reassignData.itemId);

      if (!existingHist || existingHist.length === 0) {
        if (reassignData.currentAssignee && reassignData.currentAssignee !== "Sin responsable") {
          await supabase.from("historial_inventario").insert({
            inventario_id: reassignData.itemId,
            responsable: reassignData.currentAssignee,
            centro_contacto_id: targetItem?.call_center_id || null,
            fecha_entrega: targetItem?.delivery_date || todayStr,
            fecha_devolucion: returnDateValue,
            motivo: "Asignación inicial (previa a traspaso)"
          });
        }
      }

      // 3. Registrar el nuevo ciclo ACTIVO en historial_inventario
      const { error: errHist } = await supabase.from("historial_inventario").insert({
        inventario_id: reassignData.itemId,
        responsable: reassignData.newAssignee.trim(),
        centro_contacto_id: reassignData.newCallCenterId || null,
        fecha_entrega: reassignData.deliveryDate || todayStr,
        fecha_devolucion: null,
        motivo: reassignData.reason.trim() || `Traspaso desde ${reassignData.currentAssignee}`
      });

      if (errHist) throw errHist;

      // 4. Actualizar el equipo en inventario
      const { error: errUpdate } = await supabase
        .from("inventario")
        .update({
          asignado_a: reassignData.newAssignee.trim(),
          centro_contacto_id: reassignData.newCallCenterId || null,
          estado: "asignado",
          fecha_entrega: reassignData.deliveryDate || todayStr,
          fecha_devolucion: null
        })
        .eq("id", reassignData.itemId);

      if (errUpdate) throw errUpdate;

      toast.success(`Equipo reasignado exitosamente a ${reassignData.newAssignee}`);
      setIsReassignOpen(false);
      fetchItems();
    } catch (error) {
      console.error(error);
      toast.error("Error al reasignar el equipo");
    }
  };

  // Ejecutar Dar de Baja formal
  const handleDecommissionSubmit = async () => {
    try {
      // 1. Cerrar cualquier asignación abierta en historial
      await supabase
        .from("historial_inventario")
        .update({ fecha_devolucion: todayStr })
        .eq("inventario_id", decommissionData.itemId)
        .is("fecha_devolucion", null);

      // 2. Registrar motivo de baja en historial
      await supabase.from("historial_inventario").insert({
        inventario_id: decommissionData.itemId,
        responsable: decommissionData.currentAssignee || "Soporte TI",
        fecha_entrega: todayStr,
        fecha_devolucion: todayStr,
        motivo: `BAJA DEFINITIVA: ${decommissionData.reason}`
      });

      // 3. Actualizar inventario a de baja
      const { error } = await supabase
        .from("inventario")
        .update({
          estado: "de baja",
          fecha_devolucion: todayStr,
          notas: `DADO DE BAJA: ${decommissionData.reason}`
        })
        .eq("id", decommissionData.itemId);

      if (error) throw error;

      toast.success("Equipo dado de baja correctamente");
      setIsDecommissionOpen(false);
      fetchItems();
    } catch (error) {
      console.error(error);
      toast.error("Error al dar de baja el equipo");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventario & Activos TI</h1>
          <p className="text-muted-foreground mt-1 text-sm">Control de inventario, trazabilidad NASA e historial cronológico de asignaciones.</p>
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
          {canCreate && (
            <Button onClick={openAdd} className="gap-2 shadow-sm font-bold">
              <Plus className="h-4 w-4" /> Nuevo Equipo
            </Button>
          )}
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
              placeholder="Buscar por equipo, serie, código NASA, responsable o características..." 
              className="pl-10 h-10 border-none bg-background/50 focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full md:w-60">
            <Select value={filterCallCenter} onValueChange={setFilterCallCenter}>
              <SelectTrigger className="h-10 bg-background/50">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todas las Áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Áreas / Sede</SelectItem>
                {callCenters.map(cc => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-44">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-10 bg-background/50">
                <SelectValue placeholder="Todos los Estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="disponible">Disponible</SelectItem>
                <SelectItem value="asignado">Asignado</SelectItem>
                <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                <SelectItem value="de baja">De Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {["all", "Laptop", "Desktop", "Servidor", "Monitor", "Otro"].map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                className="h-9 px-4 rounded-full text-xs font-bold whitespace-nowrap"
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
              {filteredItems.map((item) => {
                const Icon = getItemIcon(item.type);
                const areaName = item.call_center_id ? callCentersMap.get(item.call_center_id) : null;

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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Ver Detalles e Historial" onClick={() => openView(item)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors" title="Reasignar a otra persona" onClick={() => openReassign(item)}>
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors" title="Editar datos técnicos" onClick={() => openEdit(item)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canDelete && item.status.toLowerCase() !== "de baja" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Dar de baja" onClick={() => openDecommission(item)}>
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
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
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">No. Serie</p>
                          <p className="text-sm font-semibold text-foreground/80">{item.serial_number || "S/N"}</p>
                        </div>
                      </div>

                      {item.features && (
                        <div className="space-y-1 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Características</p>
                          <p className="text-xs text-foreground/80 line-clamp-2">{item.features}</p>
                        </div>
                      )}
                      
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span className="font-medium text-foreground/90">{item.assigned_to || "Sin responsable asignado"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium text-foreground/80 line-clamp-1">{areaName || "Sin Área / Sede"}</span>
                        </div>
                        {item.delivery_date && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Entregado: {new Date(item.delivery_date).toLocaleDateString()}</span>
                          </div>
                        )}
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
                    <TableHead className="w-[260px]">Equipo</TableHead>
                    <TableHead>Código NASA</TableHead>
                    <TableHead className="hidden lg:table-cell">No. Serie</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden md:table-cell">Responsable</TableHead>
                    <TableHead className="hidden lg:table-cell">Área / Sede</TableHead>
                    <TableHead className="text-right w-[140px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const Icon = getItemIcon(item.type);
                    const areaName = item.call_center_id ? callCentersMap.get(item.call_center_id) : null;

                    return (
                      <TableRow key={item.id} className="group transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                              <Icon className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <span className="font-bold text-foreground line-clamp-1">{item.name}</span>
                              {item.features && <p className="text-[11px] text-muted-foreground line-clamp-1">{item.features}</p>}
                            </div>
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
                        <TableCell className="hidden md:table-cell text-xs font-medium text-foreground/90">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>{item.assigned_to || "Sin asignar"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">
                          <div className="flex items-center gap-1.5 text-foreground/80 font-medium line-clamp-1">
                            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{areaName || "Sin Área"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Ver Detalles e Historial" onClick={() => openView(item)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors" title="Reasignar a otra persona" onClick={() => openReassign(item)}>
                                  <ArrowRightLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors" title="Editar datos técnicos" onClick={() => openEdit(item)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {canDelete && item.status.toLowerCase() !== "de baja" && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Dar de baja" onClick={() => openDecommission(item)}>
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
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

      {/* ── MODAL 1: DETALLES CON PESTAÑA DE HISTORIAL O CREACIÓN / EDICIÓN (MÁS ANCHO & ULTRA COMPACTO) ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[580px] p-5 max-h-[88vh] overflow-y-auto">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-sm font-bold tracking-tight">
              {isViewing ? "Ficha de Activo & Trazabilidad" : isEditing ? "Editar Datos del Equipo" : "Registrar Nuevo Equipo"}
            </DialogTitle>
          </DialogHeader>

          {isViewing ? (
            <Tabs defaultValue="info" className="w-full mt-1">
              <TabsList className="grid w-full grid-cols-2 h-7">
                <TabsTrigger value="info" className="gap-1.5 text-[11px] py-0.5">
                  <FileText className="h-3 w-3" /> Especificaciones
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1.5 text-[11px] py-0.5">
                  <History className="h-3 w-3" /> Historial ({historyList.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-2.5 pt-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-muted/30 p-3 rounded-lg border border-border/50 text-[11px]">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Nombre / Modelo</p>
                    <p className="font-bold text-foreground text-[11px]">{formData.name}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Tipo</p>
                    <Badge variant="secondary" className="font-bold text-[9px] h-4.5 px-1.5">{formData.type}</Badge>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Código NASA</p>
                    <p className="font-black text-primary font-mono text-[11px]">{formData.nasa_code || "---"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">No. Serie</p>
                    <p className="font-medium text-foreground/80 font-mono text-[11px]">{formData.serial_number || "---"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Estado</p>
                    <Badge variant="outline" className={`text-[9px] uppercase font-black tracking-widest py-0 px-1.5 border h-4.5 ${getStatusColor(formData.status)}`}>
                      {formData.status}
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Fecha de Entrega</p>
                    <p className="font-medium text-foreground/90 text-[11px]">{formData.delivery_date ? new Date(formData.delivery_date).toLocaleDateString() : "No registrada"}</p>
                  </div>

                  {formData.features && (
                    <div className="col-span-2 space-y-0.5 pt-1.5 border-t border-border/50">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Características Técnicas</p>
                      <p className="text-[11px] font-medium text-foreground/90 bg-background/50 p-1.5 rounded border leading-tight">{formData.features}</p>
                    </div>
                  )}

                  <div className="col-span-2 space-y-0.5 pt-1.5 border-t border-border/50">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Responsable Asignado Actual</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <p className="text-[11px] font-bold text-foreground">{formData.assigned_to || "Sin responsable asignado"}</p>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-0.5 pt-1.5 border-t border-border/50">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Área / Call Center</p>
                    <p className="text-[11px] font-medium text-foreground/90 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="h-3 w-3 text-primary" />
                      {formData.call_center_id ? callCentersMap.get(formData.call_center_id) || "Sin asignar" : "Sin asignar"}
                    </p>
                  </div>

                  {formData.notes && (
                    <div className="col-span-2 space-y-0.5 pt-1.5 border-t border-border/50">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Notas</p>
                      <p className="text-[10px] text-muted-foreground italic">{formData.notes}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-2.5 pt-2">
                {isLoadingHistory ? (
                  <div className="py-5 text-center">
                    <Loader2 className="h-4 w-4 text-primary animate-spin mx-auto mb-1" />
                    <p className="text-[11px] text-muted-foreground">Cargando trazabilidad...</p>
                  </div>
                ) : historyList.length > 0 ? (
                  <div className="relative pl-4 space-y-2.5 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {historyList.map((hist, idx) => {
                      const isCurrent = idx === 0 && !hist.fecha_devolucion && hist.responsable.trim().toLowerCase() === formData.assigned_to?.trim().toLowerCase();
                      const area = hist.centro_contacto_id ? callCentersMap.get(hist.centro_contacto_id) : null;

                      return (
                        <div key={hist.id} className="relative group">
                          <div className={`absolute -left-4 top-1 h-2.5 w-2.5 rounded-full border-2 bg-background ${isCurrent ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                          <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-primary" />
                                <span className="font-bold text-[11px] text-foreground">{hist.responsable}</span>
                              </div>
                              <Badge 
                                variant={isCurrent ? "default" : "secondary"} 
                                className={`text-[8px] font-bold h-4 px-1.5 border-none ${isCurrent ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}
                              >
                                {isCurrent ? "En uso actual" : "Finalizado"}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5 text-primary/70" />
                                <span><strong>Entrega:</strong> {new Date(hist.fecha_entrega).toLocaleDateString()}</span>
                              </div>
                              {hist.fecha_devolucion && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5 text-amber-500/80" />
                                  <span><strong>Devolución:</strong> {new Date(hist.fecha_devolucion).toLocaleDateString()}</span>
                                </div>
                              )}
                              {area && (
                                <div className="flex items-center gap-1">
                                  <Building2 className="h-2.5 w-2.5 text-primary" />
                                  <span>{area}</span>
                                </div>
                              )}
                            </div>

                            {hist.motivo && (
                              <p className="text-[10px] text-foreground/80 italic pt-0.5 border-t border-border/30">
                                📌 {hist.motivo}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-5 text-center bg-muted/20 rounded-lg border border-dashed">
                    <History className="h-5 w-5 text-muted-foreground/30 mx-auto mb-1" />
                    <p className="text-[11px] text-muted-foreground">Sin traspasos anteriores registrados.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 py-1">
              <div className="grid gap-0.5 col-span-2">
                <Label htmlFor="name" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nombre / Modelo del Equipo *</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. ThinkPad T14 Gen 3" className="h-7 text-[11px] px-2" />
              </div>
              
              <div className="grid gap-0.5">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo de Equipo</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                  <SelectTrigger className="h-7 text-[11px] px-2">
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laptop" className="text-[11px]">Laptop</SelectItem>
                    <SelectItem value="Desktop" className="text-[11px]">Desktop</SelectItem>
                    <SelectItem value="Monitor" className="text-[11px]">Monitor</SelectItem>
                    <SelectItem value="Servidor" className="text-[11px]">Servidor</SelectItem>
                    <SelectItem value="Mobile" className="text-[11px]">Mobile</SelectItem>
                    <SelectItem value="Otro" className="text-[11px]">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-0.5">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Estado Operativo</Label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                  <SelectTrigger className="h-7 text-[11px] px-2">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponible" className="text-[11px]">Disponible</SelectItem>
                    <SelectItem value="asignado" className="text-[11px]">Asignado</SelectItem>
                    <SelectItem value="mantenimiento" className="text-[11px]">Mantenimiento</SelectItem>
                    <SelectItem value="de baja" className="text-[11px]">De Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-0.5">
                <Label htmlFor="nasa_code" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Código NASA / Placa</Label>
                <Input id="nasa_code" value={formData.nasa_code} onChange={e => setFormData({...formData, nasa_code: e.target.value})} placeholder="Ej. NS-2024-01" className="h-7 text-[11px] font-mono px-2" />
              </div>

              <div className="grid gap-0.5">
                <Label htmlFor="serial" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">No. de Serie</Label>
                <Input id="serial" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} placeholder="S/N" className="h-7 text-[11px] font-mono px-2" />
              </div>

              <div className="grid gap-0.5 col-span-2">
                <Label htmlFor="features" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Características Técnicas</Label>
                <Input 
                  id="features" 
                  value={formData.features} 
                  onChange={e => setFormData({...formData, features: e.target.value})} 
                  placeholder="Ej. Intel Core i7, 16GB RAM, 512GB SSD" 
                  className="h-7 text-[11px] px-2"
                />
              </div>

              <div className="grid gap-0.5 col-span-2">
                <Label htmlFor="assigned" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Asignado a (Responsable)</Label>
                <Input 
                  id="assigned" 
                  value={formData.assigned_to} 
                  onChange={e => setFormData({...formData, assigned_to: e.target.value})} 
                  placeholder="Ej. Juan Pérez, Puesto 14, etc." 
                  className="h-7 text-[11px] px-2"
                />
              </div>

              <div className="grid gap-0.5 col-span-2">
                <Label htmlFor="callcenter" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Área / Centro de Contacto</Label>
                <Select 
                  value={formData.call_center_id || "sin_area"} 
                  onValueChange={v => setFormData({...formData, call_center_id: v === "sin_area" ? "" : v})}
                >
                  <SelectTrigger id="callcenter" className="h-7 text-[11px] px-2">
                    <SelectValue placeholder="Seleccione Área / Call Center" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_area" className="text-[11px]">Sin Área Asignada</SelectItem>
                    {callCenters.map(cc => (
                      <SelectItem key={cc.id} value={cc.id} className="text-[11px]">
                        {cc.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-0.5">
                <Label htmlFor="delivery" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fecha de Entrega</Label>
                <Input 
                  id="delivery" 
                  type="date" 
                  value={formData.delivery_date} 
                  onChange={e => setFormData({...formData, delivery_date: e.target.value})} 
                  className="h-7 text-[11px] px-2"
                />
              </div>

              <div className="grid gap-0.5">
                <Label htmlFor="return" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fecha de Devolución (Opcional)</Label>
                <Input 
                  id="return" 
                  type="date" 
                  value={formData.return_date} 
                  onChange={e => setFormData({...formData, return_date: e.target.value})} 
                  className="h-7 text-[11px] px-2"
                />
              </div>

              <div className="grid gap-0.5 col-span-2">
                <Label htmlFor="notes" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Notas / Observaciones</Label>
                <Textarea 
                  id="notes" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  placeholder="Detalles sobre accesorios, estado físico, etc." 
                  rows={2}
                  className="text-[11px] min-h-[38px] py-1 px-2"
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-2 pt-2 border-t flex justify-end gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)} className="h-7 text-[11px] px-3">{isViewing ? "Cerrar" : "Cancelar"}</Button>
            {!isViewing && (
              <Button size="sm" onClick={handleSubmit} className="font-bold h-7 text-[11px] px-3">{isEditing ? "Guardar Cambios" : "Añadir Equipo"}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: REASIGNAR EQUIPO (MÁS ANCHO & COMPACTO) ── */}
      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent className="sm:max-w-[460px] p-5">
          <DialogHeader className="pb-1">
            <DialogTitle className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
              <ArrowRightLeft className="h-3.5 w-3.5 text-primary" /> Reasignar / Traspaso de Equipo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-1">
            <div className="bg-muted/40 p-2.5 rounded-lg border space-y-0.5 text-[11px]">
              <p className="text-[9px] font-bold text-muted-foreground uppercase">Equipo</p>
              <p className="font-bold text-foreground text-[11px]">{reassignData.itemName}</p>
              <p className="text-[10px] text-muted-foreground">Responsable Anterior: <strong className="text-foreground">{reassignData.currentAssignee}</strong></p>
            </div>

            <div className="grid gap-0.5">
              <Label htmlFor="newAssignee" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nuevo Responsable *</Label>
              <Input 
                id="newAssignee" 
                value={reassignData.newAssignee} 
                onChange={e => setReassignData({...reassignData, newAssignee: e.target.value})} 
                placeholder="Nombre de la nueva persona o puesto" 
                className="h-7 text-[11px] px-2"
              />
            </div>

            <div className="grid gap-0.5">
              <Label htmlFor="newArea" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nueva Área / Centro de Contacto</Label>
              <Select 
                value={reassignData.newCallCenterId || "sin_area"} 
                onValueChange={v => setReassignData({...reassignData, newCallCenterId: v === "sin_area" ? "" : v})}
              >
                <SelectTrigger id="newArea" className="h-7 text-[11px] px-2">
                  <SelectValue placeholder="Seleccione Área / Call Center" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin_area" className="text-[11px]">Sin Área Asignada</SelectItem>
                  {callCenters.map(cc => (
                    <SelectItem key={cc.id} value={cc.id} className="text-[11px]">
                      {cc.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-0.5">
                <Label htmlFor="prevReturnDate" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fecha Devolución ({reassignData.currentAssignee.split(' ')[0] || 'Anterior'})</Label>
                <Input 
                  id="prevReturnDate" 
                  type="date" 
                  value={reassignData.previousReturnDate} 
                  onChange={e => setReassignData({...reassignData, previousReturnDate: e.target.value})} 
                  className="h-7 text-[11px] px-2"
                />
              </div>

              <div className="grid gap-0.5">
                <Label htmlFor="reassignDate" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fecha Entrega (Nuevo)</Label>
                <Input 
                  id="reassignDate" 
                  type="date" 
                  value={reassignData.deliveryDate} 
                  onChange={e => setReassignData({...reassignData, deliveryDate: e.target.value})} 
                  className="h-7 text-[11px] px-2"
                />
              </div>
            </div>

            <div className="grid gap-0.5">
              <Label htmlFor="reassignReason" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Motivo del Traspaso</Label>
              <Input 
                id="reassignReason" 
                value={reassignData.reason} 
                onChange={e => setReassignData({...reassignData, reason: e.target.value})} 
                placeholder="Ej. Cambio de área, reemplazo, nuevo ingreso" 
                className="h-7 text-[11px] px-2"
              />
            </div>
          </div>

          <DialogFooter className="mt-2 pt-2 border-t flex justify-end gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setIsReassignOpen(false)} className="h-7 text-[11px] px-3">Cancelar</Button>
            <Button size="sm" onClick={handleReassignSubmit} className="font-bold gap-1.5 h-7 text-[11px] px-3">
              <ArrowRightLeft className="h-3 w-3" /> Confirmar Reasignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: DAR DE BAJA FORMAL (MÁS ANCHO & COMPACTO) ── */}
      <Dialog open={isDecommissionOpen} onOpenChange={setIsDecommissionOpen}>
        <DialogContent className="sm:max-w-[420px] p-5">
          <DialogHeader className="pb-1">
            <DialogTitle className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-destructive">
              <Ban className="h-3.5 w-3.5" /> Dar de Baja Equipo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-1">
            <div className="bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 space-y-0.5 text-[11px]">
              <p className="text-[9px] font-bold text-destructive uppercase">Confirmación de Baja</p>
              <p className="font-bold text-foreground text-[11px]">{decommissionData.itemName}</p>
              <p className="text-[10px] text-muted-foreground">El equipo pasará a estado "De Baja" y se registrará su retiro.</p>
            </div>

            <div className="grid gap-0.5">
              <Label htmlFor="decommissionReason" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Motivo de la Baja *</Label>
              <Select 
                value={decommissionData.reason} 
                onValueChange={v => setDecommissionData({...decommissionData, reason: v})}
              >
                <SelectTrigger id="decommissionReason" className="h-7 text-[11px] px-2">
                  <SelectValue placeholder="Seleccione motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Obsolescencia / Falla técnica irreparable" className="text-[11px]">Obsolescencia / Falla técnica irreparable</SelectItem>
                  <SelectItem value="Daño físico irreparable / Accidente" className="text-[11px]">Daño físico irreparable / Accidente</SelectItem>
                  <SelectItem value="Extravío o Robo" className="text-[11px]">Extravío o Robo</SelectItem>
                  <SelectItem value="Donación / Venta de activo" className="text-[11px]">Donación / Venta de activo</SelectItem>
                  <SelectItem value="Otro motivo de retiro" className="text-[11px]">Otro motivo de retiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-2 pt-2 border-t flex justify-end gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setIsDecommissionOpen(false)} className="h-7 text-[11px] px-3">Cancelar</Button>
            <Button size="sm" variant="destructive" onClick={handleDecommissionSubmit} className="font-bold gap-1.5 h-7 text-[11px] px-3">
              <Ban className="h-3 w-3" /> Confirmar Baja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
