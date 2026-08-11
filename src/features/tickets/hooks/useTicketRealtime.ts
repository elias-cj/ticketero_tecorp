import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/queryKeys";

// Guarda de deduplicación: almacena el ID del último ticket que disparó el sonido
// y el timestamp en que sonó. Cualquier repetición dentro de 3 segundos es silenciada.
let lastSoundTicketId: string | null = null;
let lastSoundAt = 0;
const SOUND_COOLDOWN_MS = 3000;

// Pre-cargar el audio a nivel de módulo (una sola instancia para toda la app)
const notificationSound = typeof Audio !== "undefined" ? new Audio("/tono/hangouts_message.ogg") : null;
if (notificationSound) {
  notificationSound.preload = "auto";
}

function playNotification() {
  const now = Date.now();
  if (now - lastSoundAt < SOUND_COOLDOWN_MS) return; // cooldown activo
  lastSoundAt = now;

  const isSoundEnabled = localStorage.getItem("ticket_sound_enabled") !== "false";
  if (!isSoundEnabled || !notificationSound) return;

  notificationSound.currentTime = 0;
  notificationSound.play().catch((err) => {
    console.warn("Audio playback blocked or failed:", err);
  });
}

export const useTicketRealtime = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"connecting" | "connected" | "error">(
    "connecting"
  );

  useEffect(() => {
    // Polling periódico para tiempo real sobre API local PostgreSQL
    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets });
    }, 3000);

    setStatus("connected");

    return () => {
      clearInterval(intervalId);
    };
  }, [queryClient]);

  return { status };
};
