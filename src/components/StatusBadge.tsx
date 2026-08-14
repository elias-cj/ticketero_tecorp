import { TicketStatus } from "@/types";

export type ExtendedBadgeStatus =
  | "abierto"
  | "en-proceso"
  | "escalado"
  | "resuelto"
  | "cerrado"
  | TicketStatus;

export const statusConfig: Record<string, { label: string; className: string; sublabel?: string }> = {
  abierto: { label: "ABIERTO", className: "status-badge status-open" },
  "en-proceso": { label: "EN PROCESO", className: "status-badge status-in-progress" },
  escalado: { label: "ESCALADO", className: "status-badge status-escalated", sublabel: "IT" },
  resuelto: { label: "RESUELTO", className: "status-badge status-resolved" },
  cerrado: { label: "CERRADO", className: "status-badge status-closed" },
  Abierto: { label: "ABIERTO", className: "status-badge status-open" },
  "En Proceso": { label: "EN PROCESO", className: "status-badge status-in-progress" },
  Escalado: { label: "ESCALADO", className: "status-badge status-escalated", sublabel: "IT" },
  Resuelto: { label: "RESUELTO", className: "status-badge status-resolved" },
  Cerrado: { label: "CERRADO", className: "status-badge status-closed" },
};

export const StatusBadge = ({ status }: { status?: string | null }) => {
  const normalizedKey = (status || "").toLowerCase().trim().replace(/\s+/g, '-');
  const cfg = statusConfig[status || ""] || statusConfig[normalizedKey] || {
    label: String(status || "UNKNOWN").toUpperCase(),
    className: "status-badge bg-muted text-muted-foreground",
  };

  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className={cfg.className}>{cfg.label}</span>
      {cfg.sublabel && (
        <span className="text-[10px] font-medium text-muted-foreground ml-0.5">{cfg.sublabel}</span>
      )}
    </div>
  );
};
