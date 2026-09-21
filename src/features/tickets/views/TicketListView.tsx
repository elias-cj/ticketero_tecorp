import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Volume2, VolumeX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { CloseTicketModal } from "../modals/CloseTicketModal";
import { EscalateTicketModal } from "../modals/EscalateTicketModal";
import { KanbanBoard } from "../components/KanbanBoard";
import { useTicketActions } from "../hooks/useTicketActions";
import { useTicketRealtime } from "../hooks/useTicketRealtime";
import { useTicketMetadata } from "../hooks/useTicketMetadata";
import { useColumnTickets } from "../hooks/useColumnTickets";
import { TicketDetailsModal } from "../modals/TicketDetailsModal";
import { ExtendedTicket } from "../types";

export const TicketListView = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("ticket_sound_enabled") !== "false";
  });

  const handleToggleSound = (checked: boolean) => {
    setSoundEnabled(checked);
    localStorage.setItem("ticket_sound_enabled", checked ? "true" : "false");
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Persistir queueView en la URL
  const queueView = (searchParams.get("cola") as "soporte" | "it") || "soporte";
  const setQueueView = (val: "soporte" | "it") => {
    setSearchParams((prev) => {
      prev.set("cola", val);
      return prev;
    });
  };



  // Hooks de Capa de Datos (Carga por Columnas)
  const colOpen = useColumnTickets(queueView === "it" ? "escalado" : "abierto", debouncedSearch, queueView);
  const colProgress = useColumnTickets("en-proceso", debouncedSearch, queueView);
  const colCompleted = useColumnTickets("cerrado", debouncedSearch, queueView);

  const {
    assignTicket,
    updateStatus,
    closeTicket,
    escalateTicket,
    isPending: isMutationPending,
  } = useTicketActions();
  const { status: realtimeStatus } = useTicketRealtime();
  const { solutions, useTechniciansByQueue } = useTicketMetadata();

  const permissions = user?.permissions || {};
  const userRole = (user?.role || "soporte").toLowerCase();
  const isSuperAdmin =
    userRole === "superadmin" ||
    userRole === "administrador supremo" ||
    userRole === "superadm";

  const hasPermission = (moduleName: string, action: string = "VER") => {
    if (isSuperAdmin) return true;
    return permissions[moduleName]?.includes(action);
  };

  const showITQueue = hasPermission("Cola IT", "VER");
  const canAssign = hasPermission("Tickets", "EDITAR");
  const effectiveQueue = showITQueue ? queueView : "soporte";

  // user.role es el nombre del rol activo del usuario
  const currentUserRoleNames: string[] = [];
  if (user?.role) currentUserRoleNames.push(user.role);
  if (user?.roleName) currentUserRoleNames.push(user.roleName);

  const currentUserId = user?.userId || user?.id;
  const { data: technicians = [] } = useTechniciansByQueue(
    effectiveQueue,
    currentUserId,
    currentUserRoleNames
  );

  // Modal States
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [ticketToClose, setTicketToClose] = useState<string | null>(null);
  const [selectedSolutionId, setSelectedSolutionId] = useState<string>("");
  const [solutionDescription, setSolutionDescription] = useState<string>("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTicketDetails, setSelectedTicketDetails] = useState<ExtendedTicket | null>(null);
  const [isEscalateDialogOpen, setIsEscalateDialogOpen] = useState(false);
  const [ticketToEscalate, setTicketToEscalate] = useState<string | null>(null);

  // Responsive logic
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileColumn, setActiveMobileColumn] = useState<
    "open" | "inProgress" | "completed"
  >("open");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleConfirmClose = async () => {
    if (!ticketToClose || !selectedSolutionId) return;
    await closeTicket({ 
      ticketId: ticketToClose, 
      solutionId: selectedSolutionId,
      solutionDescription 
    });
    setIsCloseDialogOpen(false);
    setTicketToClose(null);
    setSelectedSolutionId("");
    setSolutionDescription("");
  };

  const handleConfirmEscalate = async (reason: string) => {
    if (!ticketToEscalate) return;
    await escalateTicket({ ticketId: ticketToEscalate, reason });
    setIsEscalateDialogOpen(false);
    setTicketToEscalate(null);
  };

  // La lógica de filtrado ahora se maneja en el servidor a través de useColumnTickets





  const columns = {
    open: {
      data: colOpen.tickets,
      totalCount: colOpen.totalCount,
      page: colOpen.page,
      totalPages: colOpen.totalPages,
      setPage: colOpen.setPage,
      isLoading: colOpen.isLoading,
    },
    inProgress: {
      data: colProgress.tickets,
      totalCount: colProgress.totalCount,
      page: colProgress.page,
      totalPages: colProgress.totalPages,
      setPage: colProgress.setPage,
      isLoading: colProgress.isLoading,
    },
    completed: {
      data: colCompleted.tickets,
      totalCount: colCompleted.totalCount,
      page: colCompleted.page,
      totalPages: colCompleted.totalPages,
      setPage: colCompleted.setPage,
      isLoading: colCompleted.isLoading,
    },
  };



  return (
    <div id="ticket-list-root" translate="no" className="space-y-2 -mt-2 notranslate">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {showITQueue && (
            <div className="flex items-center bg-muted/40 border border-border/60 rounded-full p-0.5 gap-1 shadow-sm">
              <button
                onClick={() => {
                  setQueueView("soporte");
                  colOpen.setPage(1); colProgress.setPage(1); colCompleted.setPage(1);
                  setActiveMobileColumn("open");
                }}
                className={`px-4 py-1 text-[9px] font-black tracking-wider rounded-full transition-all ${
                  queueView === "soporte"
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                SOPORTE
              </button>
              <button
                onClick={() => {
                  setQueueView("it");
                  colOpen.setPage(1); colProgress.setPage(1); colCompleted.setPage(1);
                  setActiveMobileColumn("open");
                }}
                className={`px-4 py-1 text-[9px] font-black tracking-wider rounded-full transition-all ${
                  queueView === "it"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                COLA IT
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-2">
            <div className={`h-1.5 w-1.5 rounded-full ${realtimeStatus === "connected" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
              {realtimeStatus === "connected" ? "ONLINE" : "OFFLINE"}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-4 px-2.5 py-1 bg-muted/40 border border-border/60 rounded-full shadow-sm">
            {soundEnabled ? (
              <Volume2 className="h-3 w-3 text-emerald-500 animate-pulse" />
            ) : (
              <VolumeX className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
              SONIDO
            </span>
            <Switch
              checked={soundEnabled}
              onCheckedChange={handleToggleSound}
              className="h-4 w-7 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-muted-foreground/30 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3 data-[state=unchecked]:[&>span]:translate-x-0"
              id="ticket-sound-toggle"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-8 w-40 h-7 text-[10px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <KanbanBoard
        columns={columns}
        effectiveQueue={effectiveQueue}
        isMobile={isMobile}
        activeMobileColumn={activeMobileColumn}
        setActiveMobileColumn={setActiveMobileColumn}
        isLoading={false} // Ahora lo maneja cada columna
        canAssign={canAssign}
        technicians={technicians}
        handleAssign={(ticketId, techId) => assignTicket({ ticketId, techId })}
        updateTicketStatus={(ticketId, newStatusName) => updateStatus({ ticketId, newStatusName })}
        escalateTicket={(id) => {
          setTicketToEscalate(id);
          setIsEscalateDialogOpen(true);
        }}
        user={user}
        onOpenCloseDialog={(id: string) => {
          setTicketToClose(id);
          setIsCloseDialogOpen(true);
        }}
        onOpenDetails={(t: ExtendedTicket) => {
          setSelectedTicketDetails(t);
          setIsDetailsOpen(true);
        }}
      />

      <CloseTicketModal
        isOpen={isCloseDialogOpen}
        setIsOpen={setIsCloseDialogOpen}
        solutions={solutions}
        selectedSolutionId={selectedSolutionId}
        setSelectedSolutionId={setSelectedSolutionId}
        solutionDescription={solutionDescription}
        setSolutionDescription={setSolutionDescription}
        handleConfirmClose={handleConfirmClose}
        isClosingAction={isMutationPending}
      />

      <EscalateTicketModal
        isOpen={isEscalateDialogOpen}
        setIsOpen={setIsEscalateDialogOpen}
        handleConfirmEscalate={handleConfirmEscalate}
        isEscalatingAction={isMutationPending}
      />

      <TicketDetailsModal
        isOpen={isDetailsOpen}
        setIsOpen={setIsDetailsOpen}
        ticket={selectedTicketDetails}
      />
    </div>
  );
};
