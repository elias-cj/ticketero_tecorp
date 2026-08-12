import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/queryKeys";

let lastSoundAt = 0;
const SOUND_COOLDOWN_MS = 2000;

// Pre-cargar el audio a nivel de módulo
const notificationSound = typeof Audio !== "undefined" ? new Audio("/tono/hangouts_message.ogg") : null;
if (notificationSound) {
  notificationSound.preload = "auto";
}

// Desbloqueo de reproducción automática (Autoplay Browser Policy)
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  if (notificationSound) {
    notificationSound.play().then(() => {
      notificationSound.pause();
      notificationSound.currentTime = 0;
    }).catch(() => {
      audioUnlocked = false; // reintentar en el próximo clic si fue bloqueado
    });
  }
}

if (typeof window !== "undefined") {
  const handleUserInteraction = () => {
    unlockAudio();
    window.removeEventListener("click", handleUserInteraction);
    window.removeEventListener("keydown", handleUserInteraction);
  };
  window.addEventListener("click", handleUserInteraction);
  window.addEventListener("keydown", handleUserInteraction);
}

// Generador de Tono Web Audio API (Fallback 100% garantizado si el archivo OGG falla o es bloqueado)
function playWebAudioChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Tono 1: Mi (E5 - 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tono 2: Si (B5 - 987.77 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.warn("Web Audio chime fallback failed:", e);
  }
}

export function playNotificationSound() {
  const now = Date.now();
  if (now - lastSoundAt < SOUND_COOLDOWN_MS) return;
  lastSoundAt = now;

  const isSoundEnabled = localStorage.getItem("ticket_sound_enabled") !== "false";
  if (!isSoundEnabled) return;

  if (notificationSound) {
    notificationSound.currentTime = 0;
    notificationSound.play().catch((err) => {
      console.warn("Reproducción OGG bloqueada o fallida, usando tono Web Audio API:", err);
      playWebAudioChime();
    });
  } else {
    playWebAudioChime();
  }
}

export const useTicketRealtime = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  
  const lastKnownTicketIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // 1. Cargar el último ticket al montar el componente
    const initRealtime = async () => {
      try {
        const { data } = await supabase
          .from("tickets")
          .select("id, creado_en")
          .order("creado_en", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.id) {
          lastKnownTicketIdRef.current = data.id;
        }
        isInitializedRef.current = true;
        setStatus("connected");
      } catch (e) {
        console.error("Error al inicializar tiempo real:", e);
        setStatus("error");
      }
    };

    initRealtime();

    // 2. Polling cada 3 segundos para detectar NUEVOS tickets
    const intervalId = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("tickets")
          .select("id, creado_en")
          .order("creado_en", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.id) {
          // Si ya estaba inicializado y el ID del ticket más reciente es diferente -> ¡NUEVO TICKET!
          if (isInitializedRef.current && lastKnownTicketIdRef.current && data.id !== lastKnownTicketIdRef.current) {
            lastKnownTicketIdRef.current = data.id;
            playNotificationSound();
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets });
          } else {
            lastKnownTicketIdRef.current = data.id;
          }
        }
        setStatus("connected");
      } catch (e) {
        console.error("Error en polling de tickets:", e);
      }
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [queryClient]);

  return { status };
};
