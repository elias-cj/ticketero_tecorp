import { TicketStatus } from "@/types";

export const statusConfig: Record<TicketStatus, { label: string; className: string; sublabel?: string }> = {
  abierto: { label: "ABIERTO", className: "status-badge status-open" },
  "en-proceso": { label: "EN PROCESO", className: "status-badge status-in-progress" },
  escalado: { label: "ESCALADO", className: "status-badge status-escalated", sublabel: "IT" },
  resuelto: { label: "RESUELTO", className: "status-badge status-resolved" },
  cerrado: { label: "CERRADO", className: "status-badge status-closed" },
};

export const StatusBadge = ({ status }: { status: any }) => {
  const cfg = statusConfig[status as TicketStatus] || { label: String(status || "UNKNOWN").toUpperCase(), className: "status-badge bg-muted text-muted-foreground" };
  
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className={cfg.className}>{cfg.label}</span>
      {cfg.sublabel && (
        <span className="text-[10px] font-medium text-muted-foreground ml-0.5">{cfg.sublabel}</span>
      )}
    </div>
  );
};
