import { ChevronRight, ChevronLeft, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExtendedTicket } from "../types";

interface KanbanColumnProps {
  title: string;
  icon: any; // Lucide icon
  color: string;
  tickets: ExtendedTicket[];
  totalCount: number;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  renderCard: (ticket: ExtendedTicket) => React.ReactNode;
  isLoading: boolean;
}

export const KanbanColumn = ({
  title,
  icon: Icon,
  color,
  tickets,
  totalCount,
  page,
  totalPages,
  setPage,
  renderCard,
  isLoading,
}: KanbanColumnProps) => (
  <div className="flex flex-col bg-muted/20 border border-border/60 rounded-2xl overflow-hidden shadow-sm">
    <div className="px-4 py-3 border-b flex items-center justify-between bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div
          className={`h-6 w-6 rounded-lg ${color} flex items-center justify-center shadow-lg`}
        >
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest text-foreground">
          {title}
        </span>
      </div>
      <Badge variant="outline" className="bg-background text-[10px] font-black h-5 px-2">
        {totalCount}
      </Badge>
    </div>

    <div className="flex-1 p-3 space-y-3">
      {isLoading ? (
        <div
          key="loader-view"
          className="flex flex-col items-center justify-center h-40 gap-2 opacity-50"
        >
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-widest">
            Sincronizando...
          </p>
        </div>
      ) : tickets.length > 0 ? (
        <div key="ticket-list-view" className="space-y-3">
          {tickets.map((t: any) => (
            <div key={t.id}>{renderCard(t)}</div>
          ))}
        </div>
      ) : (
        <div
          key="empty-view"
          className="flex flex-col items-center justify-center h-40 gap-2 opacity-20 bg-muted/30 rounded-xl border border-dashed border-border mt-2"
        >
          <AlertCircle className="h-8 w-8" />
          <p className="text-[10px] font-bold uppercase">Sin tickets</p>
        </div>
      )}
    </div>

    {totalPages > 1 && (
      <div className="p-2 border-t bg-card/30 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1 || isLoading}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-[10px] font-black tracking-widest text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || isLoading}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )}
  </div>
);
