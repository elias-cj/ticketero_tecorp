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
    }: {
      ticketId: string;
      solutionId: string;
    }) => {
      const statusId = statusMap[TICKET_STATUSES.CERRADO];
      const { error } = await supabase
        .from("tickets")
        .update({
          estado_id: statusId,
          solucion_id: solutionId,
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
    onError: () => toast.error("Error al cerrar el ticket"),
  });

  // Escalar Ticket (Duplicando el registro para IT)
  const escalateMutation = useMutation({
    mutationFn: async ({
      ticketId,
      reason,
    }: {
      ticketId: string;
      reason: string;
    }) => {
      // 1. Obtener los datos del ticket original
      const { data: ticket, error: fetchError } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .single();

      if (fetchError || !ticket) {
        throw new Error("No se pudo obtener el ticket original.");
      }

      // 2. Determinar los IDs de estado
      const cerradoStatusId = statusMap[TICKET_STATUSES.CERRADO];
      const escaladoStatusId = statusMap[TICKET_STATUSES.ESCALADO];

      if (!cerradoStatusId || !escaladoStatusId) {
        throw new Error("No se encontraron los estados requeridos en la base de datos.");
      }

      // 3. Generar la nomenclatura TCKIT-XXXXX con numeración propia y secuencial
      const { data: lastItTicket } = await supabase
        .from("tickets")
        .select("numero_ticket")
        .like("numero_ticket", "TCKIT-%")
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextItNumber = 1;
      if (lastItTicket?.numero_ticket) {
        const lastNum = parseInt(lastItTicket.numero_ticket.replace("TCKIT-", ""), 10);
        if (!isNaN(lastNum)) nextItNumber = lastNum + 1;
      }
      const newItNumber = `TCKIT-${String(nextItNumber).padStart(5, "0")}`;

      // 4. Actualizar el ticket original (se queda en Soporte como Cerrado)
      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          estado_id: cerradoStatusId,
          escalados: false, // Se mantiene en Soporte
          fecha_cierre: new Date().toISOString(),
          actualizado_en: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // 5. Insertar el ticket duplicado para IT
      const { error: insertError } = await supabase
        .from("tickets")
        .insert({
          numero_ticket: newItNumber,
          titulo: ticket.titulo,
          descripcion: `[MOTIVO DE ESCALADO]: ${reason}\n\n[DESCRIPCIÓN ORIGINAL]: ${ticket.descripcion || "Sin descripción"}`,
          estado_id: escaladoStatusId,
          tipo_problema_id: ticket.tipo_problema_id,
          centro_contacto_id: ticket.centro_contacto_id,
          solicitante_id: ticket.solicitante_id,
          nombre_solicitante: ticket.nombre_solicitante,
          extension: ticket.extension,
          puesto_trabajo: ticket.puesto_trabajo,
          modalidad_trabajo: ticket.modalidad_trabajo,
          ip_vpn: ticket.ip_vpn,
          registro_estado: ticket.registro_estado,
          escalados: true, // Pasa a la cola de IT
          creado_en: new Date().toISOString(),
          actualizado_en: new Date().toISOString(),
          tecnico_asignado_id: null, // Listo para asignar en IT
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success("Ticket escalado a IT con éxito");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets });
    },
    onError: (error: any) => {
      console.error(error);
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
