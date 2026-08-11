import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface EscalateTicketModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  handleConfirmEscalate: (reason: string) => Promise<void>;
  isEscalatingAction: boolean;
}

export const EscalateTicketModal = ({
  isOpen,
  setIsOpen,
  handleConfirmEscalate,
  isEscalatingAction,
}: EscalateTicketModalProps) => {
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (reason.trim().length < 10) return;
    await handleConfirmEscalate(reason.trim());
    setReason("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => {
      if (!isEscalatingAction) {
        setIsOpen(val);
        if (!val) setReason("");
      }
    }}>
      <DialogContent className="sm:max-w-[450px] border-none shadow-2xl backdrop-blur-xl bg-card/95">
        <DialogHeader>
          <DialogTitle className="text-xl font-black italic uppercase flex items-center gap-2 text-amber-500">
            <AlertCircle className="h-5 w-5" />
            ESCALAR TICKET A IT
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-tight opacity-70">
            Ingresa la justificación o motivo del escalado. Este campo es obligatorio para transferir el caso al área de IT Especializado.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
              Motivo del Escalado (Mínimo 10 caracteres)
            </Label>
            <Textarea
              placeholder="Describa brevemente el problema detectado y las validaciones previas realizadas por Soporte Técnico..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="font-semibold border-border/40 focus:ring-amber-500/20 bg-background/50 text-xs"
              disabled={isEscalatingAction}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={isEscalatingAction || reason.trim().length < 10}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black tracking-widest uppercase shadow-lg shadow-amber-500/20 py-6"
          >
            {isEscalatingAction ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "ESCALAR TICKET DEFINITIVAMENTE"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
