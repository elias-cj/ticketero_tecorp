import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabase";
import { type CallCenter } from "@/types";
import { toast } from "sonner";
import { useSystem } from "@/contexts/SystemContext";
import { TICKET_STATUSES } from "@/lib/constants";
import { AnnouncementModal, AnnouncementLeftBanner } from "@/components/AnnouncementModalAndBanner";

const CreateTicket = () => {
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [callCenters, setCallCenters] = useState<CallCenter[]>([]);
  const [problemTypes, setProblemTypes] = useState<any[]>([]);
  const [countryCodes, setCountryCodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { statusMap } = useSystem();

  const [priorities, setPriorities] = useState<any[]>([]);
  const [workMode, setWorkMode] = useState("presencial");
  const [form, setForm] = useState({
    fullName: "",
    workstation: "",
    callCenter: "",
    problemType: "",
    affectedScope: "1",
    description: "",
    phone: "",
    phoneCountryCode: "+591",
    vpnIp: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [cc, pt, pr] = await Promise.all([
          supabase.from("call_centers").select("*").eq("esta_activo", true).order("nombre"),
          supabase.from("tipos_problema").select("*").eq("esta_activo", true).order("nombre"),
          supabase.from("prioridades_ticket").select("*"),
        ]);
        if (cc.data) setCallCenters(cc.data);
        if (pt.data) setProblemTypes(pt.data);
        if (pr.data) setPriorities(pr.data);
        
        // Códigos de país por defecto
        setCountryCodes([
          { code: "+591", country: "BO" },
          { code: "+502", country: "GT" },
          { code: "+507", country: "PA" },
          { code: "+505", country: "NI" },
          { code: "+595", country: "PY" },
          { code: "+1", country: "US" },
          { code: "+52", country: "MX" },
        ]);
      } catch (error) {
        console.error(error);
        toast.error("Error al cargar opciones");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Requerido";
    if (!form.workstation.trim()) e.workstation = "Requerido";
    if (!form.callCenter) e.callCenter = "Selecciona un call center";
    if (!form.problemType) e.problemType = "Selecciona un tipo";
    if (!form.affectedScope) e.affectedScope = "Selecciona la cantidad de afectados";
    if (!form.phone.trim()) e.phone = "Número requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
    if (workMode === "home-office") {
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
  }, [workMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return; // Prevención extrema de doble clic
    if (!validate()) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      // 1. Obtener ID del estado 'Abierto'
      const openStatusId = statusMap[TICKET_STATUSES.ABIERTO];

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

      const { data, error } = await supabase
        .from("tickets")
        .insert({
          nombre_solicitante: form.fullName,
          puesto_trabajo: form.workstation,
          centro_contacto_id: form.callCenter,
          tipo_problema_id: form.problemType, // ID del tipo de problema
          descripcion: form.description ? `[Afectados: ${form.affectedScope}] ${form.description}` : `[Afectados: ${form.affectedScope}]`,
          modalidad_trabajo: workMode,
          extension: `${form.phoneCountryCode} ${form.phone}`,
          ip_vpn: workMode === "home-office" ? form.vpnIp : null,
          estado_id: openStatusId,
          registro_estado: "activo",
          titulo: `Ticket de ${form.fullName}`
        })
        .select("numero_ticket");

      if (error) throw error;

      if (data && data[0]) {
        setTicketNumber(data[0].numero_ticket);
        setSubmitted(true);
        toast.success("Ticket registrado correctamente");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al registrar el ticket");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border rounded-xl p-8 max-w-md w-full text-center shadow-lg"
        >
          <div className="h-16 w-16 rounded-full bg-status-resolved/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-status-resolved" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">¡Ticket Creado!</h2>
          <p className="text-muted-foreground mb-4">Tu ticket ha sido registrado exitosamente.</p>
          <div className="bg-muted rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground">Número de ticket</p>
            <p className="text-3xl font-bold text-primary">#{ticketNumber}</p>
            <p className="text-xs text-muted-foreground mt-1">Estado: Abierto • Área: Soporte Técnico</p>
          </div>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Volver al inicio
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-primary">
            Operational Nexus
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Anuncio Importante (Izquierda) */}
          <div className="w-full lg:w-80 shrink-0">
            <AnnouncementLeftBanner onReopen={() => setShowAnnouncementModal(true)} />
          </div>

          <div className="flex-1 w-full">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold text-foreground mb-1">Crear Ticket de Soporte</h2>
              <p className="text-muted-foreground mb-8">Completa todos los campos para registrar tu solicitud.</p>

          {isLoading ? (
            <div className="py-20 text-center bg-card rounded-xl border border-dashed border-border/50">
              <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Cargando opciones...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Fila 1: Nombre y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="NOMBRE COMPLETO" required error={errors.fullName}>
                   <Input
                    placeholder="Tu nombre completo"
                    value={form.fullName}
                    onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                </Field>
                <Field label="EXTENSIÓN / WHATSAPP" required error={errors.phone}>
                  <div className="flex gap-2">
                    <Select
                      value={form.phoneCountryCode}
                      onValueChange={(v) => setForm(prev => ({ ...prev, phoneCountryCode: v }))}
                    >
                      <SelectTrigger className="w-24 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code} {c.country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Solo números"
                      value={form.phone}
                      onChange={(e) =>
                        setForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, "") }))
                      }
                    />
                  </div>
                </Field>
              </div>

              {/* Fila 2: Estación y Call Center */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="CUBÍCULO / ESTACIÓN" error={errors.workstation}>
                  <Input
                    placeholder="Ej: C5-6"
                    value={form.workstation}
                    disabled={workMode === "home-office"}
                    onChange={(e) => setForm(prev => ({ ...prev, workstation: e.target.value }))}
                    className={workMode === "home-office" ? "opacity-60 cursor-not-allowed font-semibold bg-muted" : ""}
                  />
                </Field>
                <Field label="CALL CENTER" required error={errors.callCenter}>
                  <Select
                    value={form.callCenter}
                    onValueChange={(v) => setForm(prev => ({ ...prev, callCenter: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {callCenters.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Fila 3: Categoría y Modalidad de Trabajo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="CATEGORÍA DEL PROBLEMA" required error={errors.problemType}>
                  <Select
                    value={form.problemType}
                    onValueChange={(v) => setForm(prev => ({ ...prev, problemType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {problemTypes.map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>
                          {pt.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="MODALIDAD DE TRABAJO" required>
                  <RadioGroup
                    value={workMode}
                    onValueChange={(v) => setWorkMode(v)}
                    className="flex gap-4 pt-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="presencial" id="ct-presencial" />
                      <Label htmlFor="ct-presencial" className="text-sm font-normal cursor-pointer">
                        Presencial
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="home-office" id="ct-homeoffice" />
                      <Label htmlFor="ct-homeoffice" className="text-sm font-normal cursor-pointer">
                        Home Office
                      </Label>
                    </div>
                  </RadioGroup>
                </Field>
              </div>

              {/* Fila 4: IP VPN y Cantidad de Afectados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="IP DE LA VPN (OPCIONAL)" error={errors.vpnIp}>
                  <Input
                    id="vpn-ip-input"
                    placeholder="Opcional: Ej: 172.30.62.XX"
                    value={form.vpnIp}
                    disabled={workMode !== "home-office"}
                    onChange={(e) => setForm(prev => ({ ...prev, vpnIp: e.target.value }))}
                    className={workMode !== "home-office" ? "opacity-40 cursor-not-allowed" : ""}
                  />
                  {workMode === "home-office" && (
                    <div className="mt-3 bg-card border rounded-lg overflow-hidden shadow-sm">
                      <div className="p-3">
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Puedes encontrar tu IP conectándote a la VPN en <span className="font-bold text-foreground">FortiClient</span> (sección Acceso Remoto).
                        </p>
                      </div>
                      <div className="bg-primary py-1.5 flex items-center justify-center">
                        <span className="text-white font-black text-[9px] uppercase tracking-widest">
                          Aplica solo para los de Home Office
                        </span>
                      </div>
                    </div>
                  )}
                </Field>
                <Field label="CANTIDAD DE AFECTADOS" required error={errors.affectedScope}>
                  <Select
                    value={form.affectedScope}
                    onValueChange={(v) => setForm(prev => ({ ...prev, affectedScope: v }))}
                  >
                    <SelectTrigger>
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

              {/* Descripción */}
              <Field label="DESCRIPCIÓN DEL PROBLEMA (OPCIONAL)" error={errors.description}>
                <Textarea
                  placeholder="Describe opcionalmente el problema que estás experimentando..."
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </Field>

              {/* Botón */}
              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto gap-2"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Ticket"
                  )}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  </div>
</div>
  );
};

const Field = ({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

export default CreateTicket;
