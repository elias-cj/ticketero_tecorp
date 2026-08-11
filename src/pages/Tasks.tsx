import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ClipboardList, Plus, Clock, CheckCircle2, AlertCircle, 
  Calendar, Layers, Search, 
  ArrowRight, Monitor, Network, Edit2, 
  Trash2, X, Eye, Loader2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useSystem } from "@/contexts/SystemContext";
import { TICKET_STATUSES } from "@/lib/constants";
import { type Task } from "@/types";

// ─── TaskKanbanColumn ────────────────────────────────────────────────────────
const TaskKanbanColumn = ({
  title, icon: Icon, color, tasks, page, setPage, itemsPerPage, isLoading, renderCard
}: {
  title: string; icon: any; color: string;
  tasks: Task[]; page: number; setPage: (p: number) => void;
  itemsPerPage: number; isLoading: boolean; renderCard: (t: Task) => React.ReactNode;
}) => {
  const totalPages = Math.ceil(tasks.length / itemsPerPage);
  const paged = tasks.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="flex flex-col bg-muted/20 border border-border/60 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3.5 border-b flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className={`h-7 w-7 rounded-lg ${color} flex items-center justify-center shadow-lg`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <span className="text-[12px] font-black uppercase tracking-widest text-foreground">{title}</span>
        </div>
        <Badge variant="outline" className="bg-background text-[11px] font-black h-5.5 px-2.5">{tasks.length}</Badge>
      </div>

      <div className="flex-1 p-3 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 opacity-50">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Cargando...</p>
          </div>
        ) : paged.length > 0 ? (
          <div className="space-y-3">{paged.map(t => <div key={t.id}>{renderCard(t)}</div>)}</div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 gap-2 opacity-20 bg-muted/30 rounded-xl border border-dashed border-border mt-2">
            <ClipboardList className="h-8 w-8" />
            <p className="text-[10px] font-bold uppercase">Sin tareas</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="p-2 border-t bg-card/30 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1 || isLoading}>
            <ArrowRight className="h-4 w-4 rotate-180" />
          </Button>
          <span className="text-[10px] font-black tracking-widest text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages || isLoading}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── TaskCard ─────────────────────────────────────────────────────────────────
const TaskCard = ({
  task, canEdit, soporteTechs, itTechs, getCategoryIcon, onEdit, onDelete, onDetails, onUpdateStatus
}: {
  task: Task; canEdit: boolean; soporteTechs: any[]; itTechs: any[];
  getCategoryIcon: (cat: string) => React.ReactNode;
  onEdit: (t: Task) => void; onDelete: (id: string) => void;
  onDetails: (t: Task) => void; onUpdateStatus: (id: string, status: string) => void;
}) => {
  const allTechs = [...soporteTechs, ...itTechs];
  const assigneeNames = (task.assignee_ids && task.assignee_ids.length > 0)
    ? task.assignee_ids.map(id => allTechs.find(t => t.id === id)?.full_name).filter(Boolean)
    : [];

  const getCardTimeDetails = () => {
    if (task.status === 'completed' && task.completed_at) {
      return {
        label: "Terminada",
        date: task.completed_at,
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      };
    }
    if (task.status === 'in_progress' && task.assigned_at) {
      return {
        label: "Asignada",
        date: task.assigned_at,
        color: "text-blue-500 bg-blue-500/10 border-blue-500/20"
      };
    }
    return {
      label: "Creada",
      date: task.created_at,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20"
    };
  };

  const timeDetails = getCardTimeDetails();
  const dateObj = new Date(timeDetails.date);
  const formattedDate = dateObj.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const formattedTime = dateObj.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase();

  return (
    <Card className="border-none ring-1 ring-border/50 hover:ring-primary/40 transition-all shadow-sm group bg-card overflow-hidden rounded-xl">
      {/* Top color stripe */}
      <div className={`h-[2px] w-full ${
        task.status === 'pending' ? 'bg-amber-500' :
        task.status === 'in_progress' ? 'bg-blue-500' : 'bg-emerald-500'
      }`} />
      <CardContent className="p-3 space-y-2.5">
        {/* Header: date + action buttons */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {getCategoryIcon(task.category)}
            <Badge variant="outline" className={`text-[9px] font-black py-0.5 px-2 uppercase tracking-tighter shrink-0 ${timeDetails.color}`}>
              {timeDetails.label}
            </Badge>
            <span className="text-[10px] text-slate-400 font-bold italic">
              {formattedDate} {formattedTime}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && (
              <>
                <button onClick={() => onEdit(task)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onDelete(task.id)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Eliminar">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button onClick={() => onDetails(task)} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Ver detalles">
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-3 bg-primary rounded-full shrink-0" />
          <h4 className="text-[12px] font-black leading-none text-foreground uppercase tracking-tight">{task.title}</h4>
        </div>

        {/* Description */}
        {task.description && (
          <div className="py-2 px-3 bg-muted/40 rounded-lg border border-border/40">
            <p className="text-[10px] text-muted-foreground leading-normal font-medium italic line-clamp-2">"{task.description}"</p>
          </div>
        )}

        {/* Assignees + action */}
        <div className="flex items-center justify-between gap-1.5 py-1 px-1.5 bg-muted/30 border border-border/50 rounded-2xl">
          <div className="flex flex-col items-center flex-1 px-1">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">ASIGNADO</span>
            <span className="text-[10px] font-black text-foreground truncate italic w-full text-center">
              {assigneeNames.length > 0
                ? (assigneeNames.length > 1 ? `${assigneeNames[0]} +${assigneeNames.length - 1}` : assigneeNames[0])
                : "Sin asignar"}
            </span>
          </div>
          <div className="h-6 w-[1px] bg-border" />
          <div className="flex items-center px-1">
            {task.status === "pending" && (
              <button onClick={() => onUpdateStatus(task.id, "in_progress")}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20">
                <ArrowRight className="h-3 w-3" /> Iniciar
              </button>
            )}
            {task.status === "in_progress" && (
              <button onClick={() => onUpdateStatus(task.id, "completed")}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Finalizar
              </button>
            )}
            {task.status === "completed" && (
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Hecha
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [soporteTechs, setSoporteTechs] = useState<any[]>([]);
  const [itTechs, setItTechs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { statusMap } = useSystem();
  const [filter, setFilter] = useState("pending");
  const [showCreate, setShowCreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination states
  const [pagePending, setPagePending] = useState(1);
  const [pageInProgress, setPageInProgress] = useState(1);
  const [pageCompleted, setPageCompleted] = useState(1);
  const itemsPerPage = 5;

  // Form state
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "mantenimiento",
    assigneeIds: [] as string[],
    priority: "media",
  });

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", assigneeIds: [] as string[], status: "" });
  const [detailsTask, setDetailsTask] = useState<Task | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: usersData } = await supabase
        .from('usuarios')
        .select(`
          id, 
          nombre_completo,
          roles_usuario!roles_usuario_usuario_id_fkey!inner(roles!inner(nombre))
        `)
        .eq('esta_activo', true)
        .order('nombre_completo');
        
      const allUsers = usersData || [];
      
      const soporteData = allUsers.filter((u: any) => 
        u.roles_usuario?.some((ru: any) => ru.roles?.nombre?.toLowerCase().includes('soporte'))
      );
      
      const itData = allUsers.filter((u: any) => 
        u.roles_usuario?.some((ru: any) => {
           const n = ru.roles?.nombre?.toLowerCase().trim();
           return n === 'it' || (n && (n.includes('especializado') || n.includes('it especializado')));
        })
      );

      setSoporteTechs(soporteData.map((u: any) => ({ id: u.id, full_name: u.nombre_completo })));
      setItTechs(itData.map((u: any) => ({ id: u.id, full_name: u.nombre_completo })));

      await fetchTasks();
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase.from('tareas')
      .select('*, asignados_tarea(tecnico_id, asignado_en), estados_ticket(nombre)')
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Error al cargar la lista de tareas');
      return;
    }

    const normalizeStatus = (n: string) => {
      const s = (n || '').toLowerCase();
      if (s.includes('proceso')) return 'in_progress';
      if (s.includes('resuelto') || s.includes('cerrado')) return 'completed';
      return 'pending';
    };

    const normalizePriority = (n: string) => {
      const s = (n || '').toLowerCase();
      if (s.includes('alta') || s.includes('crítica')) return 'high';
      if (s.includes('media')) return 'medium';
      return 'low';
    };

    if (data) {
      // Filtrar tareas que están marcadas como Cerradas (eliminadas)
      const activeTasks = (data || []).filter((t: any) => (t.estados_ticket?.nombre || '') !== 'Cerrado');

      setTasks(activeTasks.map((t: any) => {
        // Ordenar asignaciones para obtener la más temprana como fecha de asignación inicial
        const sortedAssignments = t.asignados_tarea && t.asignados_tarea.length > 0
          ? [...t.asignados_tarea].sort((a, b) => new Date(a.asignado_en).getTime() - new Date(b.asignado_en).getTime())
          : [];
        
        return {
          id: t.id,
          title: t.titulo,
          description: t.descripcion,
          category: 'mantenimiento',
          priority: 'media', // Valor estático por defecto (columna inexistente en DB)
          status: normalizeStatus(t.estados_ticket?.nombre),
          assignee_ids: (t.asignados_tarea || []).map((at: any) => at.tecnico_id),
          created_at: t.creado_en,
          updated_at: t.actualizado_en,
          completed_at: t.completado_en,
          assigned_at: sortedAssignments.length > 0 ? sortedAssignments[0].asignado_en : null,
          asignados_detalle: sortedAssignments // Guardar los detalles completos de asignación para el modal
        };
      }));
    }
  };

  useEffect(() => {
    fetchData();

    // Suscripción en tiempo real para las tablas de tareas y sus asignaciones
    const channel = supabase
      .channel('tasks-realtime-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tareas' },
        () => {
          fetchTasks();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'asignados_tarea' },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const { canCreate, canEdit, canDelete } = usePermissions("Tareas");

  const filteredTasks = useMemo(() => {
    const base = tasks.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          (t.description || "").toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });

    return {
      pending: base.filter(t => t.status === 'pending'),
      in_progress: base.filter(t => t.status === 'in_progress'),
      completed: base.filter(t => t.status === 'completed')
    };
  }, [tasks, search]);

  const pagedTasks = useMemo(() => {
    const list = filter === 'pending' ? filteredTasks.pending :
                 filter === 'in_progress' ? filteredTasks.in_progress :
                 filteredTasks.completed;
    
    const page = filter === 'pending' ? pagePending :
                 filter === 'in_progress' ? pageInProgress :
                 pageCompleted;

    return list.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredTasks, filter, pagePending, pageInProgress, pageCompleted]);

  const totalPages = useMemo(() => {
    const listCount = filter === 'pending' ? filteredTasks.pending.length :
                      filter === 'in_progress' ? filteredTasks.in_progress.length :
                      filteredTasks.completed.length;
    return Math.ceil(listCount / itemsPerPage);
  }, [filteredTasks, filter]);

  const currentPage = filter === 'pending' ? pagePending :
                      filter === 'in_progress' ? pageInProgress :
                      pageCompleted;

  const setCurrentPage = (newPage: number) => {
    if (filter === 'pending') setPagePending(newPage);
    else if (filter === 'in_progress') setPageInProgress(newPage);
    else setPageCompleted(newPage);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.description) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }
    setIsSaving(true);

    // UUIDs de estados
    const PENDING_ID = statusMap[TICKET_STATUSES.ABIERTO]; // Abierto

    const { data: createdTask, error: taskError } = await supabase.from('tareas').insert({
      titulo: newTask.title,
      descripcion: newTask.description,
      estado_id: PENDING_ID,
    }).select('id').single();

    if (taskError) {
      toast.error('Hubo un error al crear la tarea.');
      return;
    }

    if (createdTask && newTask.assigneeIds.length > 0) {
      const assignments = newTask.assigneeIds.map(techId => ({
        tarea_id: createdTask.id,
        tecnico_id: techId
      }));
      await supabase.from('asignados_tarea').insert(assignments);
    }

    await fetchTasks();
    setNewTask({ title: '', description: '', category: 'mantenimiento', assigneeIds: [], priority: 'media' });
    setIsSaving(false);
    setShowCreate(false);
    toast.success('Tarea asignada correctamente');
  };

  const updateTaskStatus = async (id: string, status: string) => {
    const STATUS_MAP: Record<string, string> = {
      'pending': statusMap[TICKET_STATUSES.ABIERTO],
      'in_progress': statusMap[TICKET_STATUSES.EN_PROCESO],
      'completed': statusMap[TICKET_STATUSES.RESUELTO]
    };

    const isCompleted = status === 'completed';

    const { error } = await supabase.from('tareas').update({ 
      estado_id: STATUS_MAP[status] || STATUS_MAP['pending'],
      actualizado_en: new Date().toISOString(),
      completado_en: isCompleted ? new Date().toISOString() : null
    }).eq('id', id);

    if (error) {
      toast.error('Error al actualizar la tarea');
      return;
    }
    
    await fetchTasks();
    toast.success('Estado actualizado');
  };

  const openEdit = (task: Task) => {
    setEditForm({
      title: task.title,
      description: task.description || "",
      assigneeIds: task.assignee_ids || (task.assignee_id ? [task.assignee_id] : []),
      status: task.status
    });
    setEditingTask(task);
  };

  const saveEdit = async () => {
    if (!editingTask) return;
    setIsSaving(true);
    
    const STATUS_MAP: Record<string, string> = {
      'pending': statusMap[TICKET_STATUSES.ABIERTO],
      'in_progress': statusMap[TICKET_STATUSES.EN_PROCESO],
      'completed': statusMap[TICKET_STATUSES.RESUELTO]
    };

    const isCompleted = editForm.status === 'completed';
    const wasCompleted = editingTask.status === 'completed';

    const completedVal = isCompleted
      ? (wasCompleted ? editingTask.completed_at : new Date().toISOString())
      : null;

    const { error } = await supabase.from('tareas').update({
      titulo: editForm.title,
      descripcion: editForm.description,
      estado_id: STATUS_MAP[editForm.status] || STATUS_MAP['pending'],
      actualizado_en: new Date().toISOString(),
      completado_en: completedVal
    }).eq('id', editingTask.id);

    if (error) { toast.error('Error guardando cambios'); return; }

    // Actualizar asignados (borrar y re-insertar)
    await supabase.from('asignados_tarea').delete().eq('tarea_id', editingTask.id);
    if (editForm.assigneeIds.length > 0) {
      const assignments = editForm.assigneeIds.map(techId => ({
        tarea_id: editingTask.id,
        tecnico_id: techId
      }));
      await supabase.from('asignados_tarea').insert(assignments);
    }

    toast.success('Tarea actualizada');
    setIsSaving(false);
    setEditingTask(null);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    if (!window.confirm('¿Eliminar esta tarea (marcar como cerrada)?')) return;
    const CLOSED_ID = statusMap[TICKET_STATUSES.CERRADO];
    await supabase.from('tareas').update({ estado_id: CLOSED_ID }).eq('id', id);
    toast.success('Tarea marcada como cerrada');
    fetchTasks();
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "mantenimiento": return <Monitor className="h-4 w-4" />;
      case "infraestructura": return <Network className="h-4 w-4" />;
      default: return <Layers className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p.toLowerCase()) {
      case "alta": return "text-destructive bg-destructive/10 border-destructive/20";
      case "media": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      default: return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending": return { label: "Pendiente", icon: Clock, color: "text-blue-500 bg-blue-500/10", border: "border-blue-500" };
      case "in_progress": return { label: "En Proceso", icon: AlertCircle, color: "text-orange-500 bg-orange-500/10", border: "border-orange-500" };
      case "completed": return { label: "Completado", icon: CheckCircle2, color: "text-green-500 bg-green-500/10", border: "border-green-500" };
      default: return { label: status, icon: Clock, color: "text-muted-foreground bg-muted", border: "border-muted-foreground" };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Tareas</h1>
          <p className="text-muted-foreground text-sm">Asignación y seguimiento de labores técnicas preventivas.</p>
        </div>
        
        {canCreate && (
          <Button onClick={() => setShowCreate(!showCreate)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            {showCreate ? "Cancelar" : "Asignar Tarea"}
          </Button>
        )}

      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-primary/20 bg-primary/5 shadow-inner">
              <CardContent className="p-6">
                <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Título de la Tarea</Label>
                    <Input id="title" placeholder="ej. Formateo de equipo GUA-10" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="bg-background h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categoría</Label>
                    <Select value={newTask.category} onValueChange={(v: any) => setNewTask({...newTask, category: v})}>
                      <SelectTrigger className="bg-background h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                        <SelectItem value="infraestructura">Infraestructura</SelectItem>
                        <SelectItem value="otros">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4 lg:col-span-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Soporte Box */}
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-primary">Equipo Soporte Técnico</Label>
                        <div className="bg-background border border-border rounded-md px-3 py-2 max-h-[140px] overflow-y-auto space-y-1.5 custom-scrollbar shadow-sm">
                          {soporteTechs.map(tech => (
                            <div key={tech.id} className="flex items-center space-x-2 group">
                              <Checkbox 
                                id={`create-sop-${tech.id}`}
                                checked={newTask.assigneeIds.includes(tech.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) setNewTask({...newTask, assigneeIds: [...newTask.assigneeIds, tech.id]});
                                  else setNewTask({...newTask, assigneeIds: newTask.assigneeIds.filter(id => id !== tech.id)});
                                }}
                              />
                              <label htmlFor={`create-sop-${tech.id}`} className="text-xs text-foreground cursor-pointer select-none font-medium truncate flex-1">
                                {tech.full_name}
                              </label>
                              <Badge variant="outline" className="text-[8px] h-3 px-1 py-0 border-primary/20 text-primary bg-primary/5 uppercase font-bold shrink-0">SOP</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* IT Box */}
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Equipo IT Especializado</Label>
                        <div className="bg-background border border-border rounded-md px-3 py-2 max-h-[140px] overflow-y-auto space-y-1.5 custom-scrollbar shadow-sm">
                          {itTechs.map(tech => (
                            <div key={tech.id} className="flex items-center space-x-2 group">
                              <Checkbox 
                                id={`create-it-${tech.id}`}
                                checked={newTask.assigneeIds.includes(tech.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) setNewTask({...newTask, assigneeIds: [...newTask.assigneeIds, tech.id]});
                                  else setNewTask({...newTask, assigneeIds: newTask.assigneeIds.filter(id => id !== tech.id)});
                                }}
                              />
                              <label htmlFor={`create-it-${tech.id}`} className="text-xs text-foreground cursor-pointer select-none font-medium truncate flex-1">
                                {tech.full_name}
                              </label>
                              <Badge variant="outline" className="text-[8px] h-3 px-1 py-0 border-blue-500/20 text-blue-500 bg-blue-500/5 uppercase font-bold shrink-0">IT</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 lg:col-span-3">
                    <Label htmlFor="desc" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descripción Detallada</Label>
                    <Input id="desc" placeholder="Detalles de la labor..." value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="bg-background h-9 text-sm" />
                  </div>
                  <Button type="submit" className="w-full h-9" disabled={isSaving}>
                    {isSaving ? "Asignando..." : "Confirmar Asignación"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título o descripción..."
          className="pl-9 h-9 text-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Mobile column tabs */}
      <div className="flex md:hidden bg-muted/30 p-1.5 rounded-xl gap-1.5 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setFilter("pending")}
          className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            filter === "pending" ? "bg-amber-500 text-white shadow-md" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> PENDIENTE
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filter === "pending" ? "bg-white/20 text-white" : "bg-muted-foreground/10"}`}>
            {filteredTasks.pending.length}
          </span>
        </button>
        <button
          onClick={() => setFilter("in_progress")}
          className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            filter === "in_progress" ? "bg-blue-500 text-white shadow-md" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5" /> PROCESO
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filter === "in_progress" ? "bg-white/20 text-white" : "bg-muted-foreground/10"}`}>
            {filteredTasks.in_progress.length}
          </span>
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            filter === "completed" ? "bg-emerald-500 text-white shadow-md" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> LISTAS
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${filter === "completed" ? "bg-white/20 text-white" : "bg-muted-foreground/10"}`}>
            {filteredTasks.completed.length}
          </span>
        </button>
      </div>

      {/* Kanban board */}
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Cargando tareas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* ── Column: Pendiente ── */}
          <div className={filter !== "pending" ? "hidden md:block" : "block"}>
            <TaskKanbanColumn
              title="PENDIENTE"
              icon={Clock}
              color="bg-amber-500"
              tasks={filteredTasks.pending}
              page={pagePending}
              setPage={setPagePending}
              itemsPerPage={itemsPerPage}
              isLoading={isLoading}
              renderCard={(task) => (
                <TaskCard
                  task={task}
                  canEdit={canEdit}
                  soporteTechs={soporteTechs}
                  itTechs={itTechs}
                  getCategoryIcon={getCategoryIcon}
                  onEdit={openEdit}
                  onDelete={deleteTask}
                  onDetails={setDetailsTask}
                  onUpdateStatus={updateTaskStatus}
                />
              )}
            />
          </div>

          {/* ── Column: En Proceso ── */}
          <div className={filter !== "in_progress" ? "hidden md:block" : "block"}>
            <TaskKanbanColumn
              title="EN PROCESO"
              icon={AlertCircle}
              color="bg-blue-500"
              tasks={filteredTasks.in_progress}
              page={pageInProgress}
              setPage={setPageInProgress}
              itemsPerPage={itemsPerPage}
              isLoading={isLoading}
              renderCard={(task) => (
                <TaskCard
                  task={task}
                  canEdit={canEdit}
                  soporteTechs={soporteTechs}
                  itTechs={itTechs}
                  getCategoryIcon={getCategoryIcon}
                  onEdit={openEdit}
                  onDelete={deleteTask}
                  onDetails={setDetailsTask}
                  onUpdateStatus={updateTaskStatus}
                />
              )}
            />
          </div>

          {/* ── Column: Completado ── */}
          <div className={filter !== "completed" ? "hidden md:block" : "block"}>
            <TaskKanbanColumn
              title="COMPLETADAS"
              icon={CheckCircle2}
              color="bg-emerald-500"
              tasks={filteredTasks.completed}
              page={pageCompleted}
              setPage={setPageCompleted}
              itemsPerPage={itemsPerPage}
              isLoading={isLoading}
              renderCard={(task) => (
                <TaskCard
                  task={task}
                  canEdit={canEdit}
                  soporteTechs={soporteTechs}
                  itTechs={itTechs}
                  getCategoryIcon={getCategoryIcon}
                  onEdit={openEdit}
                  onDelete={deleteTask}
                  onDetails={setDetailsTask}
                  onUpdateStatus={updateTaskStatus}
                />
              )}
            />
          </div>
        </div>
      )}
      {/* Modal de Detalles */}
      <AnimatePresence>
        {detailsTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDetailsTask(null)} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card rounded-2xl border border-border/50 shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header fijo */}
              <div className="p-5 border-b border-border/50 bg-muted/10 flex items-center justify-between shrink-0">
                <h3 className="font-extrabold text-foreground flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Detalles de Tarea</h3>
                <button onClick={() => setDetailsTask(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>

              {/* Contenido expandible */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3.5 rounded-xl border border-border/40">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Título de la Tarea</p>
                    <p className="font-extrabold text-foreground text-sm leading-tight uppercase">{detailsTask.title}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Categoría</p>
                    <Badge variant="outline" className="text-[9px] font-black uppercase bg-background border-primary/20 text-primary py-0.5">
                      {detailsTask.category}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Descripción</p>
                    <p className="text-xs text-foreground bg-background p-2 rounded-lg border border-border/30 leading-relaxed italic">
                      "{detailsTask.description || "Sin descripción adicional."}"
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Estado Actual</p>
                    <p className="text-xs font-bold text-foreground capitalize flex items-center gap-1">
                      <span className={`h-2 w-2 rounded-full ${
                        detailsTask.status === 'pending' ? 'bg-amber-500' :
                        detailsTask.status === 'in_progress' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`} />
                      {detailsTask.status === 'pending' ? 'Pendiente' :
                       detailsTask.status === 'in_progress' ? 'En Proceso' : 'Completado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Prioridad</p>
                    <p className="text-xs font-bold text-foreground capitalize">{detailsTask.priority}</p>
                  </div>
                </div>

                {/* Línea de Tiempo del Ciclo de Vida */}
                <div className="pt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Historial y Ciclo de Vida
                  </p>
                  <div className="relative pl-6 border-l border-border/80 space-y-5 ml-3">
                    {/* Hito 1: Creado */}
                    <div className="relative">
                      <div className="absolute -left-[32px] top-0.5 bg-card border-2 border-amber-500 rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                        <Plus className="h-2.5 w-2.5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground">Tarea Registrada</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">
                          {new Date(detailsTask.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })}{" "}
                          {new Date(detailsTask.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()}
                        </p>
                      </div>
                    </div>

                    {/* Hito 2: Asignación */}
                    <div className="relative">
                      {detailsTask.assigned_at ? (
                        <>
                          <div className="absolute -left-[32px] top-0.5 bg-card border-2 border-blue-500 rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                            <Clock className="h-2.5 w-2.5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-foreground">Asignada y Planificada</p>
                            <p className="text-[10px] text-muted-foreground font-semibold mb-1.5">
                              {new Date(detailsTask.assigned_at).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })}{" "}
                              {new Date(detailsTask.assigned_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()}
                            </p>
                            {detailsTask.asignados_detalle && detailsTask.asignados_detalle.length > 0 && (
                              <div className="mt-1.5 space-y-1 bg-muted/40 p-2 rounded-lg border border-border/40 max-w-sm">
                                {detailsTask.asignados_detalle.map((at: any, idx: number) => {
                                  const name = [...soporteTechs, ...itTechs].find(tech => tech.id === at.tecnico_id)?.full_name || "Técnico de Soporte";
                                  return (
                                    <div key={idx} className="flex justify-between items-center text-[9px] text-muted-foreground font-medium italic">
                                      <span>• {name}</span>
                                      <span className="text-[8.5px] font-bold text-slate-400 shrink-0">
                                        {new Date(at.asignado_en).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}{" "}
                                        {new Date(at.asignado_en).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="absolute -left-[32px] top-0.5 bg-card border-2 border-slate-300 rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                            <Clock className="h-2.5 w-2.5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-400">Sin Asignación</p>
                            <p className="text-[10px] text-slate-400 font-semibold">Esta tarea no tiene técnicos asignados todavía.</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Hito 3: Terminado */}
                    <div className="relative">
                      {detailsTask.completed_at ? (
                        <>
                          <div className="absolute -left-[32px] top-0.5 bg-card border-2 border-emerald-500 rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-foreground">Completada y Cerrada</p>
                            <p className="text-[10px] text-muted-foreground font-semibold">
                              {new Date(detailsTask.completed_at).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })}{" "}
                              {new Date(detailsTask.completed_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="absolute -left-[32px] top-0.5 bg-card border-2 border-dashed border-slate-300 rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                            <CheckCircle2 className="h-2.5 w-2.5 text-slate-300" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-400">Resolución Pendiente</p>
                            <p className="text-[10px] text-slate-400 font-semibold">La tarea aún está en proceso de ejecución por el equipo técnico.</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer fijo */}
              <div className="p-5 border-t border-border/50 bg-muted/10 shrink-0">
                <Button className="w-full" variant="outline" onClick={() => setDetailsTask(null)}>Cerrar</Button>
              </div>
            </motion.div>
          </div>

        )}
      </AnimatePresence>

      {/* Modal de edición */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingTask(null)} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card rounded-2xl border border-border/50 shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-5 border-b border-border/50 bg-muted/10 flex items-center justify-between">
                <h3 className="font-extrabold text-foreground">Editar Tarea</h3>
                <button onClick={() => setEditingTask(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Título</Label>
                  <Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="h-10 bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descripción</Label>
                  <Input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="h-10 bg-background" />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {/* Soporte Edit Box */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-primary">Equipo Soporte</Label>
                    <div className="bg-background border border-border rounded-md px-3 py-2 max-h-[140px] overflow-y-auto space-y-1.5 custom-scrollbar shadow-sm">
                      {soporteTechs.map(tech => (
                        <div key={tech.id} className="flex items-center space-x-2 group">
                          <Checkbox 
                            id={`edit-sop-${tech.id}`}
                            checked={editForm.assigneeIds.includes(tech.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setEditForm({...editForm, assigneeIds: [...editForm.assigneeIds, tech.id]});
                              else setEditForm({...editForm, assigneeIds: editForm.assigneeIds.filter(id => id !== tech.id)});
                            }}
                          />
                          <label htmlFor={`edit-sop-${tech.id}`} className="text-xs text-foreground cursor-pointer select-none font-medium truncate flex-1">
                            {tech.full_name}
                          </label>
                          <Badge variant="outline" className="text-[8px] h-3 px-1 py-0 border-primary/20 text-primary bg-primary/5 uppercase font-bold shrink-0">SOP</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* IT Edit Box */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Equipo IT</Label>
                    <div className="bg-background border border-border rounded-md px-3 py-2 max-h-[140px] overflow-y-auto space-y-1.5 custom-scrollbar shadow-sm">
                      {itTechs.map(tech => (
                        <div key={tech.id} className="flex items-center space-x-2 group">
                          <Checkbox 
                            id={`edit-it-${tech.id}`}
                            checked={editForm.assigneeIds.includes(tech.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setEditForm({...editForm, assigneeIds: [...editForm.assigneeIds, tech.id]});
                              else setEditForm({...editForm, assigneeIds: editForm.assigneeIds.filter(id => id !== tech.id)});
                            }}
                          />
                          <label htmlFor={`edit-it-${tech.id}`} className="text-xs text-foreground cursor-pointer select-none font-medium truncate flex-1">
                            {tech.full_name}
                          </label>
                          <Badge variant="outline" className="text-[8px] h-3 px-1 py-0 border-blue-500/20 text-blue-500 bg-blue-500/5 uppercase font-bold shrink-0">IT</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Estado</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v})}>
                    <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="in_progress">En Proceso</SelectItem>
                      <SelectItem value="completed">Completado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-5 border-t border-border/50 bg-muted/10 flex gap-3">
                <Button variant="outline" className="w-full" onClick={() => setEditingTask(null)} disabled={isSaving}>Cancelar</Button>
                <Button className="w-full bg-primary hover:bg-primary/90 font-bold" onClick={saveEdit} disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tasks;
