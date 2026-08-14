import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useSystem } from "@/contexts/SystemContext";
import { TICKET_STATUSES } from "@/lib/constants";
import { toast } from "sonner";

export const useTicketActions = () => {
  const queryClient = useQueryClient();
  const { statusMap } = useSystem();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets });

  // Asignar Técnico
  const assignMutation = useMutation({
    mutationFn: async ({
      ticketId,
      techId,
    }: {
      ticketId: string;
      techId: string;
    }) => {
      const statusId = Object.entries(statusMap).find(
        ([name]) => name.toLowerCase() === TICKET_STATUSES.EN_PROCESO.toLowerCase()
      )?.[1];

      if (!statusId) {
        throw new Error(`Estado "${TICKET_STATUSES.EN_PROCESO}" no encontrado en la base de datos.`);
      }

      const { error } = await supabase
        .from("tickets")
        .update({
          tecnico_asignado_id: techId,
          estado_id: statusId,
          actualizado_en: new Date().toISOString(),
          fecha_asignacion: new Date().toISOString(),
        })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onMutate: async ({ ticketId, techId }) => {
      // Cancelar refetches salientes
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tickets });

      // Guardar estado previo
      const previousTickets = queryClient.getQueryData(QUERY_KEYS.tickets);

      // Actualizar caché de forma optimista (esto es simplificado, en producción se buscaría el ticket en todas las columnas)
      // Pero la invalidación inmediata ayuda a que se sienta rápido
      return { previousTickets };
    },
    onSuccess: () => {
      toast.success("Ticket asignado correctamente");
      // Refrescar solo al final
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets });
    },
    onError: (error: any, _, context) => {
      if (context?.previousTickets) {
        queryClient.setQueryData(QUERY_KEYS.tickets, context.previousTickets);
      }
      console.error("Assign error:", error);
      toast.error(error.message || "Error al asignar técnico");
    },
  });

  // Cambiar Estado (Genérico)
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      ticketId,
      newStatusName,
    }: {
      ticketId: string;
      newStatusName: string;
    }) => {
      const statusId = Object.entries(statusMap).find(
        ([name]) => name.toLowerCase() === newStatusName.toLowerCase()
      )?.[1];

      if (!statusId) throw new Error("Estado no encontrado");

      const isEnProceso = newStatusName.toLowerCase() === TICKET_STATUSES.EN_PROCESO.toLowerCase();
      const isCerrado = newStatusName.toLowerCase() === TICKET_STATUSES.CERRADO.toLowerCase();
      
      const payload: any = {
        estado_id: statusId,
        actualizado_en: new Date().toISOString(),
      };
      if (isEnProceso) payload.fecha_asignacion = new Date().toISOString();
      if (isCerrado) payload.fecha_cierre = new Date().toISOString();

      const { error } = await supabase
        .from("tickets")
        .update(payload)
        .eq("id", ticketId);
      if (error) throw error;
    },
    onMutate: async () => {
      // Simplemente cancelamos para evitar parpadeos
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tickets });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets });
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Cerrar Ticket
  const closeMutation = useMutation({
    mutationFn: async ({
      ticketId,
      solutionId,
      solutionDescription,
    }: {
      ticketId: string;
      solutionId: string;
      solutionDescription?: string;
    }) => {
      const statusId =
        statusMap[TICKET_STATUSES.CERRADO] ||
        Object.entries(statusMap).find(
          ([name]) => name.toLowerCase().trim() === TICKET_STATUSES.CERRADO.toLowerCase().trim()
        )?.[1];

      if (!statusId) {
        throw new Error(`Estado "${TICKET_STATUSES.CERRADO}" no encontrado en la base de datos.`);
      }

      const { error } = await supabase
        .from("tickets")
        .update({
          estado_id: statusId,
          solucion_id: solutionId,
          descripcion_solucion: solutionDescription?.trim() || null,
          actualizado_en: new Date().toISOString(),
          fecha_cierre: new Date().toISOString(),
        })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket cerrado correctamente");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets });
    },
    onError: (error: any) => {
      console.error("Error al cerrar ticket:", error);
      toast.error(error?.message || "Error al cerrar el ticket");
    },
  });

  // Escalar Ticket (Atómico en backend)
  const escalateMutation = useMutation({
    mutationFn: async ({
      ticketId,
      reason,
    }: {
      ticketId: string;
      reason: string;
    }) => {
      const apiUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:3001';
      let token = '';
      try {
        const stored = localStorage.getItem('auth');
        if (stored) token = JSON.parse(stored)?.token || '';
      } catch {
        // fallback
      }

      const res = await fetch(`${apiUrl}/api/tickets/${ticketId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Error al escalar el ticket.');
      }

      return await res.json();
    },
    onSuccess: () => {
      toast.success("Ticket escalado a IT con éxito");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets });
    },
    onError: (error: any) => {
      console.error("Error al escalar ticket:", error);
      toast.error(error.message || "Error al escalar ticket");
    },
  });

  return {
    assignTicket: assignMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    closeTicket: closeMutation.mutateAsync,
    escalateTicket: escalateMutation.mutateAsync,
    isPending:
      assignMutation.isPending ||
      updateStatusMutation.isPending ||
      closeMutation.isPending ||
      escalateMutation.isPending,
  };
};
