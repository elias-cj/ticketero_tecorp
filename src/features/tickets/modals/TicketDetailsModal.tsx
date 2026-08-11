import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ExtendedTicket } from "../types";
import {
  Eye,
  User,
  Globe,
  Activity,
  CheckCircle2,
  Clock,
  MessageCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

interface TicketDetailsModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  ticket: ExtendedTicket | null;
}

export const TicketDetailsModal = ({
  isOpen,
  setIsOpen,
  ticket,
}: TicketDetailsModalProps) => {
  if (!ticket) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return (
        date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
        " " +
        date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()
      );
    } catch {
      return dateStr;
    }
  };

  const openWhatsApp = () => {
    if (!ticket.phone) return;
    const phoneDigits = ticket.phone.replace(/\D/g, "");
    const knownPrefixes = ["591", "502", "507", "505", "592", "595"];
    const hasKnownPrefix = knownPrefixes.some((p) => phoneDigits.startsWith(p));
    window.open(hasKnownPrefix ? `https://wa.me/${phoneDigits}` : `https://wa.me/591${phoneDigits}`, "_blank");
  };

  const cleanPhone = ticket.phone ? ticket.phone.replace(/^(591|502|507|505|592|595)/, "") : null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-lg border-none shadow-2xl bg-card p-0 overflow-hidden rounded-2xl">

        {/* ── Header ── */}
        <div className="relative px-4 pt-4 pb-3 flex items-center border-b border-border/40 bg-muted/10">
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ background: ticket.flagGradient }}
          />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Eye className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[11px] font-black uppercase tracking-wider text-foreground leading-none">
                DETALLE DE TICKET
              </DialogTitle>
              <DialogDescription className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase leading-none mt-0.5">
                CASO #{ticket.number}
              </DialogDescription>
            </div>
          </div>
          {/* mr-8 para dejar espacio al botón X nativo de Radix */}
          <div className="shrink-0 mr-8">
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        {/* ── Body compacto ── */}
        <div className="px-4 py-3 space-y-3">

          {/* Tipo y Descripción — con soporte para tickets escalados */}
          {(() => {
            const raw = ticket.description || "";
            const isEscalado = raw.includes("[MOTIVO DE ESCALADO]:") && raw.includes("[DESCRIPCIÓN ORIGINAL]:");
            const motivoEscalado = isEscalado
              ? raw.split("[DESCRIPCIÓN ORIGINAL]:")[0].replace("[MOTIVO DE ESCALADO]:", "").trim()
              : null;
            const descripcionOriginal = isEscalado
              ? raw.split("[DESCRIPCIÓN ORIGINAL]:")[1]?.trim()
              : raw;

            return (
              <div className="bg-muted/20 rounded-xl border border-border/30 px-3 py-2.5 space-y-1.5">
                <div>
                  <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">TIPO DE PROBLEMA</span>
                  <p className="text-[10.5px] font-extrabold text-foreground uppercase leading-tight">{ticket.problemType}</p>
                </div>

                {isEscalado ? (
                  <div className="border-t border-border/30 pt-1.5 grid grid-cols-2 gap-2">
                    {/* Descripción original */}
                    <div className="bg-background/50 rounded-lg border border-border/40 px-2.5 py-2">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        DESCRIPCIÓN ORIGINAL
                      </span>
                      <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                        &quot;{descripcionOriginal || "Sin descripción."}&quot;
                      </p>
                    </div>
                    {/* Motivo de escalado */}
                    <div className="bg-amber-500/5 rounded-lg border border-amber-500/20 px-2.5 py-2">
                      <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest block mb-1">
                        MOTIVO DE ESCALADO
                      </span>
                      <p className="text-[9px] text-amber-600 font-semibold leading-relaxed">
                        {motivoEscalado || "Sin motivo."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-border/30 pt-1.5">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">DESCRIPCIÓN</span>
                    <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                      &quot;{descripcionOriginal || "Sin descripción."}&quot;
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Grid 2 columnas: Solicitante + Área */}
          <div className="grid grid-cols-2 gap-2">
            {/* Solicitante */}
            <div className="bg-muted/10 rounded-xl border border-border/30 px-3 py-2 space-y-1.5">
              <h4 className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                <User className="h-2.5 w-2.5" /> SOLICITANTE
              </h4>
              <div className="space-y-1 text-[9.5px]">
                <div>
                  <span className="text-muted-foreground">Nombre: </span>
                  <span className="font-bold text-foreground">{ticket.fullName}</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-muted-foreground">Modalidad: </span>
                  <Badge
                    variant="outline"
                    className={`text-[7.5px] font-black uppercase py-0 px-1.5 h-4 ${
                      ticket.workMode === "home-office"
                        ? "border-blue-500/20 text-blue-500 bg-blue-500/5"
                        : "border-orange-500/20 text-orange-500 bg-orange-500/5"
                    }`}
                  >
                    {ticket.workMode === "home-office" ? "Home Office" : "Presencial"}
                  </Badge>
                </div>
                {ticket.workMode === "home-office" && ticket.ip_vpn && (
                  <div>
                    <span className="text-muted-foreground">IP: </span>
                    <span className="font-mono font-bold text-blue-500 text-[8.5px]">{ticket.ip_vpn}</span>
                  </div>
                )}
                {ticket.workMode !== "home-office" && ticket.workstation && (
                  <div>
                    <span className="text-muted-foreground">Estación: </span>
                    <span className="font-bold text-foreground">{ticket.workstation}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 pt-0.5">
                  {cleanPhone ? (
                    <button
                      onClick={openWhatsApp}
                      className="flex items-center gap-1 bg-[#25D366] text-white px-2 py-0.5 rounded-full shadow-sm hover:brightness-105 transition-all font-black text-[8.5px]"
                    >
                      <MessageCircle className="h-2.5 w-2.5 fill-white" />
                      {cleanPhone}
                    </button>
                  ) : (
                    <span className="text-[9px] text-muted-foreground font-semibold">Sin número</span>
                  )}
                </div>
              </div>
            </div>

            {/* Área / Técnico */}
            <div className="bg-muted/10 rounded-xl border border-border/30 px-3 py-2 space-y-1.5">
              <h4 className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                <Globe className="h-2.5 w-2.5" /> ÁREA
              </h4>
              <div className="space-y-1 text-[9.5px]">
                <div>
                  <span className="text-muted-foreground">Call Center: </span>
                  <span className="font-bold text-foreground">{ticket.callCenter}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Técnico: </span>
                  <span className="font-bold text-foreground">
                    {ticket.assignedTo === "No asignado" ? "Sin asignar" : ticket.assignedTo}
                  </span>
                </div>
                {ticket.solutionName && (
                  <div className="mt-1 pt-1 border-t border-emerald-500/20">
                    <span className="text-[7.5px] font-black text-emerald-600 uppercase tracking-widest">Solución:</span>
                    <p className="text-[9px] font-bold text-emerald-600 leading-tight">{ticket.solutionName}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Línea de tiempo compacta horizontal */}
          <div className="bg-muted/10 rounded-xl border border-border/30 px-3 py-2.5">
            <h4 className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-1 mb-2.5">
              <Activity className="h-2.5 w-2.5" /> CICLO DE VIDA
            </h4>
            <div className="flex items-start">
              {/* Hito 1: Creado */}
              <div className="flex-1 flex flex-col items-center text-center gap-1">
                <div className="h-6 w-6 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center shadow-sm">
                  <Clock className="h-3 w-3 text-amber-500" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-foreground leading-none">Creado</p>
                  <p className="text-[7.5px] text-muted-foreground font-semibold leading-snug">{formatDate(ticket.createdAt)}</p>
                </div>
              </div>

              {/* Conector */}
              <div className="flex-none mt-3 w-4 h-[2px] bg-border/60 shrink-0" />

              {/* Hito 2: Asignado */}
              <div className="flex-1 flex flex-col items-center text-center gap-1">
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shadow-sm ${
                  ticket.fechaAsignacion
                    ? "bg-blue-500/10 border-blue-500"
                    : "bg-muted/30 border-dashed border-slate-400"
                }`}>
                  <User className={`h-3 w-3 ${ticket.fechaAsignacion ? "text-blue-500" : "text-slate-400 animate-pulse"}`} />
                </div>
                <div>
                  <p className={`text-[8px] font-black leading-none ${ticket.fechaAsignacion ? "text-foreground" : "text-slate-400"}`}>Asignado</p>
                  <p className="text-[7.5px] text-muted-foreground font-semibold leading-snug">
                    {ticket.fechaAsignacion ? formatDate(ticket.fechaAsignacion) : "Pendiente"}
                  </p>
                </div>
              </div>

              {/* Conector */}
              <div className="flex-none mt-3 w-4 h-[2px] bg-border/60 shrink-0" />

              {/* Hito 3: Cerrado */}
              <div className="flex-1 flex flex-col items-center text-center gap-1">
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shadow-sm ${
                  ticket.status === "cerrado" || ticket.status === "resuelto"
                    ? "bg-emerald-500/10 border-emerald-500"
                    : "bg-muted/30 border-dashed border-slate-400"
                }`}>
                  <CheckCircle2 className={`h-3 w-3 ${
                    ticket.status === "cerrado" || ticket.status === "resuelto"
                      ? "text-emerald-500"
                      : "text-slate-300"
                  }`} />
                </div>
                <div>
                  <p className={`text-[8px] font-black leading-none ${
                    ticket.status === "cerrado" || ticket.status === "resuelto" ? "text-foreground" : "text-slate-400"
                  }`}>Cerrado</p>
                  <p className="text-[7.5px] text-muted-foreground font-semibold leading-snug">
                    {ticket.status === "cerrado" || ticket.status === "resuelto"
                      ? formatDate(ticket.fechaCierre || ticket.updatedAt)
                      : "Pendiente"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
