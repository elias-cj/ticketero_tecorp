import { Loader2, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CloseTicketModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  solutions: { id: string; name: string }[];
  selectedSolutionId: string;
  setSelectedSolutionId: (id: string) => void;
  solutionDescription?: string;
  setSolutionDescription?: (desc: string) => void;
  handleConfirmClose: () => void;
  isClosingAction: boolean;
}

export const CloseTicketModal = ({
  isOpen,
  setIsOpen,
  solutions,
  selectedSolutionId,
  setSelectedSolutionId,
  solutionDescription = "",
  setSolutionDescription,
  handleConfirmClose,
  isClosingAction,
}: CloseTicketModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[420px] border-none shadow-2xl backdrop-blur-xl bg-card/95">
        <DialogHeader>
          <DialogTitle className="text-xl font-black italic uppercase flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            CERRAR TICKET
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-tight opacity-70">
            Selecciona la solución técnica aplicada para este caso.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
              Tipo de Solución <span className="text-emerald-500">*</span>
            </Label>
            <Select onValueChange={setSelectedSolutionId} value={selectedSolutionId}>
              <SelectTrigger className="w-full font-bold border-border/40 focus:ring-emerald-500/20 bg-background/50 h-10">
                <SelectValue placeholder="-- SELECCIONAR SOLUCIÓN --" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]" position="popper" side="bottom">
                {solutions.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    className="text-[11px] font-bold uppercase py-2"
                  >
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 flex items-center justify-between">
              <span>Detalle de la Solución</span>
              <span className="text-[9px] text-muted-foreground font-semibold lowercase italic">(opcional)</span>
            </Label>
            <Textarea
              placeholder="Escribe una breve descripción o notas adicionales sobre cómo fue resuelto el problema..."
              value={solutionDescription}
              onChange={(e) => setSolutionDescription && setSolutionDescription(e.target.value)}
              className="font-medium text-xs border-border/40 focus:ring-emerald-500/20 bg-background/50 min-h-[90px] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleConfirmClose}
            disabled={isClosingAction || !selectedSolutionId}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black tracking-widest uppercase shadow-lg shadow-emerald-500/20 py-6"
          >
            {isClosingAction ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "CERRAR TICKET DEFINITIVAMENTE"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
