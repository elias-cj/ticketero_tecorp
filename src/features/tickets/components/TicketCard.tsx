import { UserPlus, ChevronRight, CheckCircle, AlertCircle, MessageCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import { ExtendedTicket } from "../types";

interface TicketCardProps {
  t: ExtendedTicket;
  canAssign: boolean;
  technicians: { id: string; full_name: string }[];
  handleAssign: (ticketId: string, techId: string) => void;
  updateTicketStatus: (ticketId: string, newStatusName: string) => void;
  escalateTicket: (ticketId: string) => void;
  user: any;
  getWhatsAppUrl: (t: ExtendedTicket) => string;
  flagGradient: string;
  onOpenCloseDialog: (id: string) => void;
  currentQueue: "it" | "soporte";
  onOpenDetails: (t: ExtendedTicket) => void;
}

export const TicketCard = ({
  t,
  canAssign,
  technicians,
  handleAssign,
  updateTicketStatus, // eslint-disable-line @typescript-eslint/no-unused-vars
  escalateTicket,
  user,
  getWhatsAppUrl,
  flagGradient,
  onOpenCloseDialog,
  currentQueue,
  onOpenDetails,
}: TicketCardProps) => {
  const userRole = (user?.role || "").toLowerCase().trim();
  const isSoporteTecnico = userRole === "soporte técnico" || userRole === "soporte";

  const permissions = user?.permissions || {};
  const isSuperAdmin = userRole === "superadmin" || userRole === "superadm" || userRole === "administrador supremo";
  const canCall = isSuperAdmin || Boolean(permissions["Tickets"]?.includes("LLAMAR"));
  const canEditTicket = isSuperAdmin || Boolean(permissions["Tickets"]?.includes("EDITAR"));

  // Solo roles autorizados pueden ver el detalle del ticket
  const rolesConAcceso = ["soporte", "soporte técnico", "it", "it especializado", "admin", "administrador", "superadmin", "superadm", "administrador supremo"];
  const canViewDetails = rolesConAcceso.some((r) => userRole.includes(r));

  const getPriorityFromTicket = (ticket: ExtendedTicket) => {
    const desc = (ticket.description || ticket.descripcion || "").toLowerCase();
    let scopeVal = "";
    if (desc.includes("[afectados:")) {
      const match = desc.match(/\[afectados:\s*([^\]]+)\]/i);
      if (match && match[1]) {
        scopeVal = match[1].trim();
      }
    }

    let label = "MEDIO";
    if (scopeVal) {
      if (scopeVal.includes("todo") || scopeVal.includes("servicio")) {
        label = "URGENTE";
      } else {
        const num = parseInt(scopeVal, 10);
        if (!isNaN(num)) {
          if (num === 1) label = "BAJO";
          else if (num >= 2 && num <= 4) label = "MEDIO";
          else if (num >= 5 && num <= 10) label = "ALTO";
          else if (num > 10) label = "URGENTE";
        }
      }
    }

    switch (label) {
      case "BAJO":
        return { label: "BAJO", style: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
      case "MEDIO":
        return { label: "MEDIO", style: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
      case "ALTO":
        return { label: "ALTO", style: "bg-orange-500/10 text-orange-600 border-orange-500/20" };
      case "URGENTE":
        return { label: "URGENTE", style: "bg-rose-500/10 text-rose-600 border-rose-500/20 animate-pulse font-black" };
      default:
        return { label: "MEDIO", style: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    }
  };

  const priorityInfo = getPriorityFromTicket(t);

  return (
    <Card className="border-none ring-1 ring-border/50 hover:ring-primary/40 transition-all shadow-sm group bg-card overflow-hidden rounded-xl">
      <div className="h-[2px] w-full" style={{ background: flagGradient }} />
      <CardContent className="p-2.5 space-y-2">
        {/* Header: Ticket Number, Date and Criticality Priority Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md border border-blue-500/20">
              {t.number}
            </span>
            <span className="text-[8.5px] text-slate-400 font-bold italic">
              {new Date(t.createdAt).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })}{" "}
              {new Date(t.createdAt).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }).toLowerCase()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {canViewDetails && (
              <button
                onClick={() => onOpenDetails(t)}
                className="h-5 w-5 flex items-center justify-center rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-primary transition-colors border border-border/40 animate-in fade-in zoom-in-95 duration-200"
                title="Ver detalles del ticket"
              >
                <Eye className="h-3 w-3" />
              </button>
            )}
            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${priorityInfo.style}`}>
              {priorityInfo.label}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-3 bg-blue-600 rounded-full shrink-0" />
          <h4 className="text-[10px] font-black leading-none text-foreground uppercase tracking-tight">
            {t.problemType}
          </h4>
        </div>

        {/* User Info Box */}
        <div className="py-1.5 px-3 bg-muted/40 rounded-lg border border-border/40 space-y-1">
          <div className="flex flex-col">
            <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">
              USUARIO
            </span>
            <span className="text-[9.5px] font-black text-foreground leading-none">
              {t.fullName}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">
              DESCRIPCIÓN
            </span>
            <p className="text-[8.5px] text-muted-foreground leading-tight font-medium italic line-clamp-1">
              "{(() => {
                const raw = t.description || "Sin descripción";
                if (raw.includes("[MOTIVO DE ESCALADO]:") && raw.includes("[DESCRIPCIÓN ORIGINAL]:")) {
                  return raw.split("[DESCRIPCIÓN ORIGINAL]:")[0].replace("[MOTIVO DE ESCALADO]:", "").trim() || "Sin motivo";
                }
                return raw;
              })()}"
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1 -mt-1">
          {canAssign && t.status === "abierto" && (
            (isSoporteTecnico && currentQueue !== "it") ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAssign(t.id, user.id)}
                className="h-7 px-2.5 text-[9px] font-black border-border bg-muted/50 rounded-lg shadow-sm hover:bg-primary hover:text-white transition-all"
              >
                <UserPlus className="h-3 w-3 mr-1" /> ASIGNARME
              </Button>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[9px] font-black border-border bg-muted/50 rounded-lg shadow-sm hover:bg-muted"
                  >
                    <UserPlus className="h-3 w-3 mr-1" /> ASIG
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1">
                  <div className="space-y-0.5">
                    {technicians.map((tech: any) => (
                      <PopoverClose key={tech.id} asChild>
                        <button
                          onClick={() => handleAssign(t.id, tech.id)}
                          className="w-full text-left px-2 py-1.5 text-[10px] font-bold rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-between"
                        >
                          {tech.full_name} <ChevronRight className="h-3 w-3" />
                        </button>
                      </PopoverClose>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )
          )}

          {(t.status === "en-proceso" || t.status === "escalado") && (currentQueue === "it" || !isSoporteTecnico) && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-[9px] font-black border-border bg-muted/50 rounded-lg shadow-sm"
                >
                  <UserPlus className="h-3 w-3 mr-1" /> RE-ASIG
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1">
                <div className="space-y-0.5">
                  <div className="px-2 py-1 mb-1 text-[7px] font-black text-muted-foreground uppercase tracking-widest bg-muted/50 rounded">
                    Técnicos Disponibles
                  </div>
                  {technicians.map((tech: any) => (
                    <PopoverClose key={tech.id} asChild>
                      <button
                        onClick={() => handleAssign(t.id, tech.id)}
                        className="w-full text-left px-2 py-1.5 text-[10px] font-bold rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-between"
                      >
                        {tech.full_name} <ChevronRight className="h-3 w-3" />
                      </button>
                    </PopoverClose>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Botones de Cierre / Escalado */}
          {canEditTicket && (
            <div className="flex items-center gap-1 ml-auto">
              {!(currentQueue === "it" && t.status === "escalado") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenCloseDialog(t.id)}
                  className="h-7 px-2.5 text-[9px] font-black border-emerald-200 text-emerald-600 bg-emerald-50/30 rounded-lg hover:bg-emerald-500 hover:text-white"
                >
                  <CheckCircle className="h-3 w-3 mr-1" /> CERRAR
                </Button>
              )}

              {currentQueue === "soporte" && t.status !== "escalado" && !t.escalados && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => escalateTicket(t.id)}
                  className="h-7 px-2.5 text-[9px] font-black border-amber-200 text-amber-600 bg-amber-50/30 rounded-lg hover:bg-amber-500 hover:text-white"
                >
                  <AlertCircle className="h-3 w-3 mr-1" /> ESCALAR
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Info Bar with WhatsApp */}
        <div className="flex items-center justify-between gap-1 py-1 px-1 bg-muted/30 border border-border/50 rounded-2xl mt-2">
          <div className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1 px-1">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">TEC</span>
              <span className="text-[9px] font-black text-foreground truncate italic">
                {t.assignedTo === "No asignado" ? "Sin asignar" : t.assignedTo}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-border" />
            <div className="flex flex-col items-center flex-1 px-1">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">EST</span>
              <span
                className="text-[9px] font-black truncate"
                style={{ color: t.workMode === "home-office" ? "#3b82f6" : "#f16b14" }}
              >
                {t.workstation || (t.workMode === "home-office" ? "Home Office" : "—")}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-border" />
            <div className="flex flex-col items-center flex-1 px-1">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">CC</span>
              <span className="text-[9px] font-black text-foreground uppercase truncate">
                {t.callCenter}
              </span>
            </div>
          </div>

          {/* WhatsApp Button Pill — Condicionado a Permiso LLAMAR */}
          {canCall && (
            <button
              onClick={() => window.open(getWhatsAppUrl(t), "_blank")}
              className="flex items-center gap-1.5 bg-[#25D366] text-white px-2 py-1 rounded-full shadow-sm hover:brightness-105 transition-all shrink-0 ml-1"
            >
              <MessageCircle className="h-2.5 w-2.5 fill-white text-white" />
              <span className="text-[8px] font-black tracking-tight">
                {t.phone ? t.phone.replace(/^(591|502|507|505)/, "") : "SIN NÚM"}
              </span>
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
