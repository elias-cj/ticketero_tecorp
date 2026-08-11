import { AlertCircle, Timer, CheckCircle } from "lucide-react";
import { KanbanColumn } from "./KanbanColumn";
import { TicketCard } from "./TicketCard";

interface ColumnData {
  data: any[];
  totalCount: number;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  isLoading: boolean;
}

interface KanbanBoardProps {
  columns: {
    open: ColumnData;
    inProgress: ColumnData;
    completed: ColumnData;
  };
  effectiveQueue: "it" | "soporte";
  isMobile: boolean;
  activeMobileColumn: "open" | "inProgress" | "completed";
  setActiveMobileColumn: (val: "open" | "inProgress" | "completed") => void;
  isLoading: boolean;

  // Card Props
  canAssign: boolean;
  technicians: any[];
  handleAssign: (ticketId: string, techId: string) => void;
  updateTicketStatus: (ticketId: string, status: string) => void;
  escalateTicket: (ticketId: string) => void;
  user: any;

  onOpenCloseDialog: (id: string) => void;
  onOpenDetails: (t: any) => void;
}

export const KanbanBoard = ({
  columns,
  effectiveQueue,
  isMobile,
  activeMobileColumn,
  setActiveMobileColumn,
  isLoading,
  canAssign,
  technicians,
  handleAssign,
  updateTicketStatus,
  escalateTicket,
  user,

  onOpenCloseDialog,
  onOpenDetails,
}: KanbanBoardProps) => {
  const renderTicketCard = (t: any) => (
    <TicketCard
      t={t}
      canAssign={canAssign}
      technicians={technicians}
      handleAssign={handleAssign}
      updateTicketStatus={updateTicketStatus}
      escalateTicket={escalateTicket}
      user={user}
      getWhatsAppUrl={(t: any) => {
        if (!t.phone) return "#";
        const phoneDigits = t.phone.replace(/\D/g, "");
        const knownPrefixes = ["591", "502", "507", "505", "592", "595"];
        
        // Si el número ya empieza con un prefijo conocido, lo usamos tal cual
        const hasKnownPrefix = knownPrefixes.some(pref => phoneDigits.startsWith(pref));
        
        if (hasKnownPrefix) {
          return `https://wa.me/${phoneDigits}`;
        }

        // Por defecto para todos los demás, usamos Bolivia (591)
        return `https://wa.me/591${phoneDigits}`;
      }}
      flagGradient={t.flagGradient || "var(--primary)"}
      onOpenCloseDialog={onOpenCloseDialog}
      currentQueue={effectiveQueue}
      onOpenDetails={onOpenDetails}
    />
  );

  return (
    <div className="space-y-4">
      {/* --- Mobile Kanban Tabs --- */}
      {isMobile && (
        <div className="flex bg-muted/30 p-1.5 rounded-xl gap-1.5 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveMobileColumn("open")}
            className={`flex-1 py-2 px-1 sm:px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 ${activeMobileColumn === "open"
                ? "bg-amber-500 text-white shadow-md"
                : "text-muted-foreground hover:bg-muted/50"
              }`}
          >
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> ABIERTOS
            </div>
            <div
              className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeMobileColumn === "open"
                  ? "bg-white/20 text-white"
                  : "bg-muted-foreground/10"
                }`}
            >
              {columns.open.totalCount}
            </div>
          </button>

          <button
            onClick={() => setActiveMobileColumn("inProgress")}
            className={`flex-1 py-2 px-1 sm:px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 ${activeMobileColumn === "inProgress"
                ? "bg-blue-500 text-white shadow-md"
                : "text-muted-foreground hover:bg-muted/50"
              }`}
          >
            <div className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" /> PROCESO
            </div>
            <div
              className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeMobileColumn === "inProgress"
                  ? "bg-white/20 text-white"
                  : "bg-muted-foreground/10"
                }`}
            >
              {columns.inProgress.totalCount}
            </div>
          </button>

          <button
            onClick={() => setActiveMobileColumn("completed")}
            className={`flex-1 py-2 px-1 sm:px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 ${activeMobileColumn === "completed"
                ? "bg-emerald-500 text-white shadow-md"
                : "text-muted-foreground hover:bg-muted/50"
              }`}
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" /> TERMINADOS
            </div>
            <div
              className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeMobileColumn === "completed"
                  ? "bg-white/20 text-white"
                  : "bg-muted-foreground/10"
                }`}
            >
              {columns.completed.totalCount}
            </div>
          </button>
        </div>
      )}

      {/* --- Kanban Board --- */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start"
      >
        {/* Column: Abierto */}
        <div
          key="col-open-stable"
          className={
            isMobile && activeMobileColumn !== "open" ? "hidden md:block" : "block"
          }
        >
          <KanbanColumn
            title={effectiveQueue === "it" ? "ESCALADOS" : "ABIERTOS"}
            icon={AlertCircle}
            color="bg-amber-500"
            tickets={columns.open.data}
            totalCount={columns.open.totalCount}
            page={columns.open.page}
            totalPages={columns.open.totalPages}
            setPage={columns.open.setPage}
            isLoading={columns.open.isLoading}
            renderCard={renderTicketCard}
          />
        </div>

        {/* Column: En Proceso */}
        <div
          key="col-progress-stable"
          className={
            isMobile && activeMobileColumn !== "inProgress"
              ? "hidden md:block"
              : "block"
          }
        >
          <KanbanColumn
            title="EN PROCESO"
            icon={Timer}
            color="bg-blue-500"
            tickets={columns.inProgress.data}
            totalCount={columns.inProgress.totalCount}
            page={columns.inProgress.page}
            totalPages={columns.inProgress.totalPages}
            setPage={columns.inProgress.setPage}
            isLoading={columns.inProgress.isLoading}
            renderCard={renderTicketCard}
          />
        </div>

        {/* Column: Terminado */}
        <div
          key="col-completed-stable"
          className={
            isMobile && activeMobileColumn !== "completed"
              ? "hidden md:block"
              : "block"
          }
        >
          <KanbanColumn
            title="TERMINADOS"
            icon={CheckCircle}
            color="bg-emerald-500"
            tickets={columns.completed.data}
            totalCount={columns.completed.totalCount}
            page={columns.completed.page}
            totalPages={columns.completed.totalPages}
            setPage={columns.completed.setPage}
            isLoading={columns.completed.isLoading}
            renderCard={renderTicketCard}
          />
        </div>
      </div>
    </div>
  );
};
