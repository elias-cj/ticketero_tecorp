import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone, Maximize2 } from "lucide-react";

export const AnnouncementWidget = () => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
    }, 450);
  };

  const handleReopen = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop Fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isClosing ? 0 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Modal flotante con animación de desplazamiento/encogimiento hacia la izquierda */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={
                isClosing
                  ? {
                      scale: 0.25,
                      x: -420,
                      y: 80,
                      opacity: 0,
                    }
                  : { scale: 1, opacity: 1, y: 0, x: 0 }
              }
              exit={{ scale: 0.25, opacity: 0, x: -420 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 24,
              }}
              className="relative bg-card rounded-2xl overflow-hidden border border-border/60 p-2 sm:p-3 shadow-2xl max-w-2xl w-full z-10"
            >
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 h-9 w-9 rounded-full bg-black/75 hover:bg-black/95 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg border border-white/20"
                title="Cerrar anuncio"
              >
                <X className="h-5 w-5" />
              </button>

              <img
                src="/images/anuncio_importante.png"
                alt="Anuncio Importante - Plataforma de Tickets"
                className="w-full h-auto rounded-xl object-contain max-h-[80vh]"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Banner estático/persistente a la izquierda del formulario */}
      <AnimatePresence>
        {!isModalOpen && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0, x: -30 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="bg-card border rounded-2xl p-3.5 shadow-sm space-y-2.5 relative overflow-hidden group border-primary/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-extrabold text-xs uppercase tracking-wider">
                <Megaphone className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                <span>Anuncio Importante</span>
              </div>
              <button
                onClick={handleReopen}
                className="text-[10px] text-muted-foreground hover:text-primary font-semibold flex items-center gap-1 transition-colors"
                title="Ampliar anuncio"
              >
                <Maximize2 className="h-3 w-3" />
                Ampliar
              </button>
            </div>

            <div
              onClick={handleReopen}
              className="rounded-xl overflow-hidden border border-border/60 bg-muted/30 cursor-pointer transition-all hover:border-primary/50 hover:shadow-md group-hover:scale-[1.01]"
            >
              <img
                src="/images/anuncio_importante.png"
                alt="Anuncio Importante - Plataforma de Tickets"
                className="w-full h-auto object-cover rounded-lg"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const AnnouncementModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return null;
};

export const AnnouncementLeftBanner = ({ onReopen }: { onReopen?: () => void }) => {
  return <AnnouncementWidget />;
};
