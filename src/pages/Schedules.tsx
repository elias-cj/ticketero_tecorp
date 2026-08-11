import { useEffect, useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Search, 
  Info,
  CalendarDays,
  Users,
  UserPlus2,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const Schedules = () => {
  const { user } = useAuth();
  const today = new Date(2026, 3, 7); // As requested: April 7, 2026
  const [currentMonth, setCurrentMonth] = useState(today); 
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [searchTerm, setSearchTerm] = useState("");
  interface Shift { id: string; technician: string; time: string; }
  interface DaySchedule { date: string; shifts: Shift[]; }
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [allTechs, setAllTechs] = useState<{ id: string; name: string; type: string }[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Reassign state
  const [editingShift, setEditingShift] = useState<{id: string, name: string, time: string} | null>(null);
  const [newTechName, setNewTechName] = useState("");

  // Mass Reassign state
  const [isMassReassignOpen, setIsMassReassignOpen] = useState(false);
  const [sourceTech, setSourceTech] = useState("");
  const [targetTech, setTargetTech] = useState("");

  const isAdmin = user?.role === "admin" || user?.role === "superadmin" || user?.role === "it";

  const fetchSchedules = async () => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('horarios')
      .select('id, fecha_horario, usuarios(nombre_completo), turnos(nombre, hora_inicio, hora_fin)')
      .gte('fecha_horario', start)
      .lte('fecha_horario', end);

    if (data) {
      const groupedMap = new Map();
      data.forEach((item: any) => {
        const date = item.fecha_horario;
        if (!groupedMap.has(date)) {
          groupedMap.set(date, { date, shifts: [] });
        }
        const turnoNombre = item.turnos?.nombre || '';
        const horaInicio = item.turnos?.hora_inicio || '';
        const horaFin = item.turnos?.hora_fin || '';
        groupedMap.get(date).shifts.push({
          id: item.id,
          technician: item.usuarios?.nombre_completo || 'Sin asignar',
          time: `${turnoNombre} ${horaInicio}-${horaFin}`.trim(),
        });
      });
      setSchedules(Array.from(groupedMap.values()));
    }
  };

  const fetchTechs = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre_completo')
      .eq('esta_activo', true)
      .order('nombre_completo');
    
    const combined = (data || []).map(u => ({ id: u.id, name: u.nombre_completo, type: 'Técnico' }));
    setAllTechs(combined);
  };

  useEffect(() => {
    fetchSchedules();
    fetchTechs();
  }, [currentMonth]); // Re-fetch schedules when the month changes

  const handleReassign = async () => {
    if (!editingShift || !newTechName) return;
    
    const tech = allTechs.find(t => t.name === newTechName);
    if (!tech) return;

    setIsUpdating(true);
    const { error } = await supabase
      .from('horarios')
      .update({ tecnico_id: tech.id })
      .eq('id', editingShift.id);

    if (error) {
      toast.error("Error al reasignar técnico");
    } else {
      toast.success("Técnico reasignado con éxito");
      setEditingShift(null);
      fetchSchedules();
    }
    setIsUpdating(false);
  };

  const handleMassReassign = async () => {
    if (!sourceTech || !targetTech || sourceTech === targetTech) {
      toast.error("Seleccione técnicos diferentes");
      return;
    }

    const techOrigen = allTechs.find(t => t.name === sourceTech);
    const techDestino = allTechs.find(t => t.name === targetTech);
    if (!techOrigen || !techDestino) return;

    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    if (!window.confirm(`¿Estás seguro de reemplazar a ${sourceTech} por ${targetTech} en TODOS sus turnos de ${format(currentMonth, "MMMM", { locale: es })}?`)) return;

    setIsUpdating(true);
    const { error, count } = await supabase
      .from('horarios')
      .update({ tecnico_id: techDestino.id }, { count: 'exact' })
      .eq('tecnico_id', techOrigen.id)
      .gte('fecha_horario', start)
      .lte('fecha_horario', end);

    if (error) {
      toast.error("Error en la reasignación masiva");
    } else {
      toast.success(`Se reasignaron ${count || 0} turnos con éxito`);
      setIsMassReassignOpen(false);
      setSourceTech("");
      setTargetTech("");
      fetchSchedules();
    }
    setIsUpdating(false);
  };

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  const emptyDays = useMemo(() => {
    const firstDay = startOfMonth(currentMonth).getDay();
    // getDay() 0 is Sun, but our grid starts at Mon (1).
    // Mon: 1 -> 0 empty
    // Tue: 2 -> 1 empty
    // ...
    // Sun: 0 -> 6 empty
    return (firstDay + 6) % 7;
  }, [currentMonth]);

  const selectedDayInfo = useMemo(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return schedules.find(s => s.date === dateStr);
  }, [selectedDate, schedules]);

  const technicianSchedule = useMemo(() => {
    if (!searchTerm) return [];
    return schedules.filter(s => 
      s.shifts.some(sh => sh.technician.toLowerCase().includes(searchTerm.toLowerCase())) &&
      format(parseISO(s.date), "MM-yyyy") === format(currentMonth, "MM-yyyy")
    );
  }, [searchTerm, currentMonth, schedules]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const getShiftColor = (time: string) => {
    if (time.includes("Feriado")) return "bg-destructive/10 text-destructive border-destructive/20";
    if (time.includes("Descanso")) return "bg-muted text-muted-foreground border-border";
    if (time.includes("17:00")) return "bg-orange-500/10 text-orange-600 border-orange-200";
    if (time.includes("07:00")) return "bg-blue-500/10 text-blue-600 border-blue-200";
    return "bg-primary/10 text-primary border-primary/20";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Horarios de Técnicos</h1>
          <p className="text-muted-foreground text-sm">Cronograma oficial de turnos y feriados 2026.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsMassReassignOpen(true)}
              className="h-8 text-[10px] font-bold gap-2 border-primary/20 hover:bg-primary/5 text-primary"
            >
              <Users className="h-3.5 w-3.5" /> Gestión Mensual
            </Button>
          )}
          
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-[10px] font-bold min-w-[100px] text-center uppercase tracking-wider">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </span>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Column */}
        <Card className="lg:col-span-2 border-none ring-1 ring-border shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
                <CalendarDays className="h-4 w-4 text-primary" /> Calendario Mensual
              </CardTitle>
              <div className="flex gap-4 text-[10px] font-bold text-muted-foreground uppercase">
                <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-primary" /> Hoy</span>
                <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-destructive" /> Feriados</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b bg-muted/10">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(day => (
                <div key={day} className="py-3 text-center text-[10px] font-bold text-muted-foreground uppercase border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-border">
              {/* Empty padding cells */}
              {Array.from({ length: emptyDays }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] bg-muted/5 opacity-50" />
              ))}

              {daysInMonth.map((day, i) => {
                const dayInfo = schedules.find(s => s.date === format(day, "yyyy-MM-dd"));
                const isSelected = isSameDay(day, selectedDate);
                const isHoliday = dayInfo?.shifts.some(s => s.time === "Feriado");
                
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-[60px] p-1.5 transition-all flex flex-col items-start gap-0.5 group relative border-r border-b last:border-r-0 ${
                      isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary z-10" : "bg-card hover:bg-muted/20"
                    }`}
                  >
                    <span className={`text-[10px] font-bold ${
                      isSelected ? "text-primary scale-105" : isHoliday ? "text-destructive" : "text-foreground"
                    }`}>
                      {format(day, "d")}
                    </span>
                    
                    {dayInfo && dayInfo.shifts.length > 0 && (
                      <div className="w-full mt-auto flex flex-wrap gap-0.5">
                        {dayInfo.shifts.slice(0, 4).map((_, idx) => (
                          <div key={idx} className="h-0.5 w-[8px] rounded-full bg-primary/40" />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day / Search Column */}
        <div className="space-y-6">
          {/* Day Details */}
          <Card className="border-none ring-1 ring-border shadow-md overflow-hidden bg-gradient-to-br from-card to-muted/10">
            <CardHeader className="p-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-primary">
                    {format(selectedDate, "d 'de' MMMM", { locale: es })}
                  </CardTitle>
                  <CardDescription className="text-[9px] font-bold uppercase tracking-widest mt-0.5">Turnos</CardDescription>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {selectedDayInfo ? (
                <div className="divide-y divide-border/50">
                  {selectedDayInfo.shifts.map((shift, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between group hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-[10px] uppercase">
                          {shift.technician.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{shift.technician}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{shift.time}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className={`text-[9px] uppercase font-bold px-2 py-0.5 ${getShiftColor(shift.time)}`}>
                          {shift.time.includes("Feriado") ? "Feriado" : "Activo"}
                        </Badge>
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-[8px] font-bold gap-1 hover:bg-primary/10 text-primary"
                            onClick={() => {
                              setEditingShift({ id: shift.id, name: shift.technician, time: shift.time });
                              setNewTechName(shift.technician);
                            }}
                          >
                            <RefreshCw className="h-2.5 w-2.5" /> Reasignar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <Info className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-xs text-muted-foreground font-medium italic">No hay información cargada para esta fecha.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technician Search View */}
          <Card className="border-none ring-1 ring-border shadow-sm">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-[10px] font-bold flex items-center gap-2 uppercase tracking-widest">
                <Users className="h-3 w-3 text-primary" /> Buscar Técnico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input 
                  placeholder="ej. Elias Campos..." 
                  className="pl-8 h-8 text-[10px]" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {searchTerm && (
                <ScrollArea className="h-48 rounded-md border p-2 bg-muted/5">
                  <div className="space-y-2">
                    {technicianSchedule.length > 0 ? (
                      technicianSchedule.map((s, idx) => (
                        <div key={idx} className="p-2 rounded border bg-card text-[10px] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-primary">{format(parseISO(s.date), "dd MMM", { locale: es })}</span>
                            <span className="text-muted-foreground font-bold">{format(parseISO(s.date), "EEEE", { locale: es })}</span>
                          </div>
                          {s.shifts
                            .filter(sh => sh.technician.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map((sh, sidx) => (
                              <div key={sidx} className="flex items-center gap-1.5 text-foreground font-medium">
                                <Clock className="h-3 w-3 text-muted-foreground" /> {sh.time}
                              </div>
                            ))
                          }
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-muted-foreground text-center py-4">No se encontraron turnos este mes.</p>
                    )}
                  </div>
                </ScrollArea>
              )}
              {!searchTerm && (
                <p className="text-[10px] text-muted-foreground italic text-center py-2">Escribe el nombre de un técnico para ver su rol mensual.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reassign Dialog */}
      <Dialog open={!!editingShift} onOpenChange={(open) => !open && setEditingShift(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus2 className="h-5 w-5 text-primary" /> 
              Reasignar Técnico
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cambiando técnico para el turno <span className="font-bold text-foreground">{editingShift?.time}</span> del día <span className="font-bold text-foreground">{format(selectedDate, "PPP", { locale: es })}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nuevo Técnico Asignado</label>
              <Select value={newTechName} onValueChange={setNewTechName}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {allTechs.map((tech, i) => (
                    <SelectItem key={i} value={tech.name}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{tech.name}</span>
                        <Badge variant="outline" className="text-[8px] uppercase font-bold opacity-50">{tech.type}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingShift(null)} className="h-9 text-xs font-bold">Cancelar</Button>
            <Button onClick={handleReassign} disabled={isUpdating} className="h-9 text-xs font-bold gap-2">
              {isUpdating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Confirmar Cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mass Reassign Dialog */}
      <Dialog open={isMassReassignOpen} onOpenChange={setIsMassReassignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> 
              Reasignación Mensual
            </DialogTitle>
            <DialogDescription className="text-xs">
              Reemplaza a un técnico por otro en todos sus turnos de <span className="font-bold text-foreground">{format(currentMonth, "MMMM yyyy", { locale: es })}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Técnico a Reemplazar (Origen)</label>
              <Select value={sourceTech} onValueChange={setSourceTech}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {allTechs.map((tech, i) => (
                    <SelectItem key={i} value={tech.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{tech.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-4 w-4 text-muted-foreground/30 rotate-90 sm:rotate-0" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary">Técnico de Destino (Nuevo)</label>
              <Select value={targetTech} onValueChange={setTargetTech}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {allTechs.map((tech, i) => (
                    <SelectItem key={i} value={tech.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{tech.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-4 mt-2">
            <Button variant="ghost" onClick={() => setIsMassReassignOpen(false)} className="h-9 text-xs font-bold">Cancelar</Button>
            <Button 
              onClick={handleMassReassign} 
              disabled={isUpdating || !sourceTech || !targetTech} 
              className="h-9 text-xs font-bold gap-2 px-6"
            >
              {isUpdating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
              Aplicar a Todo el Mes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Schedules;
