import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Plus, ChevronDown, ChevronUp, ArrowRight, AlertTriangle, ExternalLink, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { COUNTRY_CODES } from "@/data/constants";
import ThemeToggle from "@/components/ThemeToggle";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queryKeys";


import { AnnouncementModal, AnnouncementLeftBanner } from "@/components/AnnouncementModalAndBanner";

const Index = () => {
  const queryClient = useQueryClient();
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(true);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Inicio | Support Connect</title>
      </Helmet>

      {/* Main Content Area */}
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <img src="/logo_tecorp.png" alt="TECORP" className="h-8 w-auto hidden dark:block" />
          <img src="/Logo-Tecorp-azul.jpg" alt="TECORP" className="h-8 w-auto block dark:hidden" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login">
              <Button size="sm">Iniciar Sesión</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <section className="px-3 py-4 sm:px-6 sm:py-8 pb-10">
        <div className="container mx-auto max-w-[1240px]">
          <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 justify-center items-start">
            {/* Anuncio Importante (Izquierda) */}
            <div className="w-full lg:w-72 shrink-0">
              <AnnouncementLeftBanner onReopen={() => setShowAnnouncementModal(true)} />
            </div>

            {/* Ticket Form (Center) */}
            <div className="flex-1 w-full lg:max-w-2xl">
              <FormCard />
            </div>

            {/* Sidebar (Right) */}
            <aside className="w-full lg:w-72 shrink-0 space-y-4">
              <SupportTeamWidget />
              <VPNInfoWidget />
            </aside>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t mt-auto">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>todos los derechos reservados Tecorp © 2026 .</span>
          <div className="flex gap-4">
            <span className="hover:text-foreground cursor-pointer">Política de Privacidad</span>
            <span className="hover:text-foreground cursor-pointer">Contactar Admin</span>
            <span className="hover:text-foreground cursor-pointer">Estado del Sistema</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* Inline Form Card */

const FormCard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    fullName: "", phone: "", phoneCountryCode: "+591",
    workstation: "", callCenter: "", problemType: "",
    affectedScope: "1",
    workMode: "presencial", description: "", vpnIp: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callCenters, setCallCenters] = useState<any[]>([]);
  const [problemTypes, setProblemTypes] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('call_centers').select('id, nombre').eq('esta_activo', true).order('nombre').then(({ data }) => {
      if (data) setCallCenters(data);
    });
    supabase.from('tipos_problema').select('id, nombre').eq('esta_activo', true).order('nombre').then(({ data }) => {
      if (data) setProblemTypes(data);
    });
    supabase.from('prioridades_ticket').select('id, nombre').then(({ data }) => {
      if (data) setPriorities(data);
    });
  }, []);

  useEffect(() => {
    if (form.workMode === "home-office") {
      setForm(prev => ({ ...prev, workstation: "Home Office" }));
    } else {
      setForm(prev => ({
        ...prev,
        vpnIp: "",
        workstation: prev.workstation === "Home Office" ? "" : prev.workstation
      }));
      setErrors(prev => {
        const next = { ...prev };
        delete next.vpnIp;
        return next;
      });
    }
  }, [form.workMode]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Requerido";
    if (!form.phone.trim() || !/^\d{7,15}$/.test(form.phone)) e.phone = "Número inválido";
    if (!form.workstation.trim()) e.workstation = "Requerido";
    if (!form.callCenter) e.callCenter = "Requerido";
    if (!form.problemType) e.problemType = "Requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    // NOTA: Ya no se insertan usuarios automáticamente. 'usuarios' es solo para accesos al sistema.
    const nombreCompleto = form.fullName.trim();

    // Buscar el tipo_problema_id
    const { data: tipoData } = await supabase
      .from('tipos_problema')
      .select('id')
      .eq('nombre', form.problemType)
      .single();

    // Buscar el estado 'Abierto'
    const { data: estadoData } = await supabase
      .from('estados_ticket')
      .select('id')
      .eq('nombre', 'Abierto')
      .single();

    // Mapear cantidad de afectados por número / rango a prioridad interna
    const getPriorityNameFromScope = (scopeVal: string): string => {
      if (!scopeVal) return "MEDIO";
      const norm = scopeVal.toString().trim().toLowerCase();
      if (norm.includes("todo") || norm.includes("servicio")) return "URGENTE";
      const num = parseInt(norm, 10);
      if (isNaN(num)) return "MEDIO";
      if (num === 1) return "BAJO";
      if (num >= 2 && num <= 4) return "MEDIO";
      if (num >= 5 && num <= 10) return "ALTO";
      if (num > 10) return "URGENTE";
      return "MEDIO";
    };

    const targetPriorityName = getPriorityNameFromScope(form.affectedScope);
    const matchedPriority = priorities.find(
      p => p.nombre?.toUpperCase() === targetPriorityName
    );
    const priorityId = matchedPriority ? matchedPriority.id : null;

    const { data, error } = await supabase.from('tickets').insert({
      titulo: form.problemType,
      descripcion: form.description ? `[Afectados: ${form.affectedScope}] ${form.description}` : `[Afectados: ${form.affectedScope}]`,
      centro_contacto_id: form.callCenter,
      tipo_problema_id: tipoData?.id || null,
      estado_id: estadoData?.id || null,
      solicitante_id: null,
      // Nuevos campos del reportante para el histórico
      nombre_solicitante: form.fullName.trim(),
      extension: `${form.phoneCountryCode} ${form.phone.trim()}`,
      puesto_trabajo: form.workstation.trim(),
      modalidad_trabajo: form.workMode,
      ip_vpn: form.workMode === 'home-office' ? form.vpnIp.trim() : null,
      registro_estado: 'activo'
    }).select('numero_ticket');

    setIsSubmitting(false);

    if (error) {
      toast.error("Error al crear el ticket", { description: error.message });
      return;
    }

    const tNumber = data && data[0] ? data[0].numero_ticket : 'TCK-NEW';
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets });
    toast.success(`¡Ticket ${tNumber} creado exitosamente!`, {
      description: "Estado: Abierto • Área: Soporte Técnico",
    });
    setForm({
      fullName: "", phone: "", phoneCountryCode: "+591",
      workstation: "", callCenter: "", problemType: "",
      affectedScope: "1",
      workMode: "presencial", description: "", vpnIp: "",
    });
    setErrors({});
  };

  return (
    <div className="bg-card border border-border/80 rounded-xl shadow-sm p-4 sm:p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground leading-tight">Nueva Solicitud de Soporte</h2>
          <p className="text-[11px] text-muted-foreground">Los campos marcados con * son obligatorios para el procesamiento.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="NOMBRE COMPLETO" required error={errors.fullName}>
            <Input placeholder="ej. Elena Rodríguez" value={form.fullName} className="h-8 text-xs"
              onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))} />
          </Field>
          <Field label="EXTENSIÓN / WHATSAPP" required error={errors.phone}>
            <div className="flex gap-1.5">
              <Select value={form.phoneCountryCode} onValueChange={v => setForm(prev => ({ ...prev, phoneCountryCode: v }))}>
                <SelectTrigger className="w-24 shrink-0 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} {c.country}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="XXXX-XXXX" value={form.phone} className="h-8 text-xs"
                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, "") }))} />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="CUBÍCULO / ID DE ESTACIÓN" error={errors.workstation}>
            <Input
              placeholder="ej. G5-6"
              value={form.workstation}
              disabled={form.workMode === "home-office"}
              onChange={e => setForm(prev => ({ ...prev, workstation: e.target.value }))}
              className={`h-8 text-xs ${form.workMode === "home-office" ? "opacity-60 cursor-not-allowed font-semibold bg-muted" : ""}`}
            />
          </Field>
          <Field label="CENTRO DE LLAMADAS (HUB)" required error={errors.callCenter}>
            <Select value={form.callCenter} onValueChange={v => setForm(prev => ({ ...prev, callCenter: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {callCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="CATEGORÍA DEL PROBLEMA" required error={errors.problemType}>
            <Select value={form.problemType} onValueChange={v => setForm(prev => ({ ...prev, problemType: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {problemTypes.map(pt => <SelectItem key={pt.id} value={pt.nombre}>{pt.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="MODALIDAD DE TRABAJO" required>
            <RadioGroup value={form.workMode} onValueChange={v => setForm(prev => ({ ...prev, workMode: v }))}
              className="flex gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="presencial" id="presencial" className="h-3.5 w-3.5" />
                <Label htmlFor="presencial" className="text-xs font-normal cursor-pointer">Presencial</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="home-office" id="home-office" className="h-3.5 w-3.5" />
                <Label htmlFor="home-office" className="text-xs font-normal cursor-pointer">Home Office</Label>
              </div>
            </RadioGroup>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="IP DE LA VPN (OPCIONAL)" error={errors.vpnIp}>
            <Input
              id="vpn-ip-input"
              placeholder="Opcional: Ej: 172.30.62.XX"
              value={form.vpnIp}
              disabled={form.workMode !== "home-office"}
              onChange={e => setForm(prev => ({ ...prev, vpnIp: e.target.value }))}
              className={`h-8 text-xs ${form.workMode !== "home-office" ? "opacity-40 cursor-not-allowed" : ""}`}
            />
          </Field>
          <Field label="CANTIDAD DE AFECTADOS" required error={errors.affectedScope}>
            <Select
              value={form.affectedScope}
              onValueChange={v => setForm(prev => ({ ...prev, affectedScope: v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar cantidad de afectados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="todo el servicio">todo el servicio</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="DESCRIPCIÓN DEL PROBLEMA (OPCIONAL)" error={errors.description}>
          <Textarea
            placeholder="Describe opcionalmente el error o comportamiento que estás experimentando..."
            rows={3} value={form.description} className="text-xs min-h-[64px]"
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          />
        </Field>

        <Button type="submit" size="sm" className="gap-2 text-xs font-bold px-5 py-2" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Enviar Ticket"}
        </Button>
      </form>
    </div>
  );
};

const Field = ({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    {children}
    {error && <p className="text-[10px] text-destructive">{error}</p>}
  </div>
);


const SupportTeamWidget = () => (
  <div className="bg-primary rounded-xl p-3.5 text-primary-foreground overflow-hidden relative shadow-sm">
    <div className="relative z-10">
      <h3 className="text-xs uppercase font-extrabold tracking-wider opacity-90">Horario de Atención</h3>
      <div className="mt-1.5 space-y-0.5">
        <p className="text-[11px] font-semibold">Lunes a Viernes: 7:00 AM - 1:00 AM</p>
        <p className="text-[11px] font-semibold">Sábados y Domingos: 8:00 AM - 8:00 PM</p>
      </div>
    </div>
    <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
  </div>
);

const VPNInfoWidget = () => (
  <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-sm relative overflow-hidden">
    <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wider">
      <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" />
      ¿Cómo obtener tu IP VPN?
    </h3>
    <div className="space-y-1 text-[11px] text-muted-foreground leading-snug mb-3">
      <p>1. Abre la aplicación <span className="font-bold text-foreground">FortiClient</span>.</p>
      <p>2. Ve a la sección <span className="font-bold text-foreground">Acceso Remoto</span>.</p>
      <p>3. Conéctate con tus credenciales.</p>
      <p>4. Copia la <span className="font-bold text-foreground">dirección IP</span> mostrada.</p>
    </div>
    <div className="bg-primary px-3 py-1.5 -mx-3.5 -mb-3.5 flex items-center justify-center">
      <span className="text-white font-extrabold text-[9px] uppercase tracking-wider">
        Solo para Home Office
      </span>
    </div>
  </div>
);



export default Index;
