import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { ExtendedTicket, TicketRow } from "../types";
import { useTicketMetadata } from "./useTicketMetadata";

export const useTickets = (daysLimit?: number) => {
  const { techniciansMap } = useTicketMetadata();

  return useQuery({
    queryKey: daysLimit ? [QUERY_KEYS.tickets, daysLimit] : [QUERY_KEYS.tickets],
    queryFn: async () => {
      const ticketFields = `
        id, numero_ticket, titulo, descripcion,
        estado_id, solicitante_id,
        creado_en, actualizado_en, tecnico_asignado_id,
        extension, puesto_trabajo, modalidad_trabajo, ip_vpn,
        nombre_solicitante, registro_estado, fecha_asignacion, fecha_cierre,
        estados_ticket ( nombre ),
        tipos_problema ( nombre ),
        call_centers ( id, nombre, codigo, pais ),
        solicitante:usuarios!solicitante_id ( nombre_completo, telefono ),
        soluciones ( titulo )
      `;

      let allData: TicketRow[] = [];
      let hasMore = true;
      let from = 0;
      const step = 1000;

      while (hasMore) {
        let query = supabase
          .from("tickets")
          .select(ticketFields)
          .order("creado_en", { ascending: false })
          .range(from, from + step - 1);

        if (daysLimit) {
          const date = new Date();
          date.setDate(date.getDate() - daysLimit);
          query = query.gte("creado_en", date.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data || data.length === 0) break;

        allData = [...allData, ...(data as any[])];
        if (data.length < step) hasMore = false;
        from += step;
      }

      return allData;
    },
    select: (rawTickets): ExtendedTicket[] => {
      const normalizeStatus = (nombreEstado: string): ExtendedTicket["status"] => {
        const s = (nombreEstado || "").toLowerCase();
        if (s.includes("cerrado")) return "cerrado";
        if (s.includes("resuelto")) return "resuelto";
        if (s.includes("proceso")) return "en-proceso";
        if (s.includes("escalado")) return "escalado";
        return "abierto";
      };

      return (rawTickets as any[]).map((t) => {
        const cc = t.call_centers as any;
        const rawName = cc?.nombre || "N/A";
        let cleanCC = rawName
          .replace(/Call Center /i, "")
          .replace(/Nacional /i, "")
          .trim();
        const mapping: Record<string, string> = {
          Seguros: "Nacional S.",
          "Televenta Panamá": "Tel. Panamá",
          "Televenta Nicaragua": "Tel. Nicaragua",
        };
        cleanCC = mapping[cleanCC] || cleanCC;
        const estadoNombre = (t.estados_ticket as any)?.nombre || "Abierto";
        const tipoNombre =
          (t.tipos_problema as any)?.nombre || t.titulo || "Ticket";
        const solicitanteNombre =
          t.nombre_solicitante ||
          (t.solicitante as any)?.nombre_completo ||
          "Usuario";

        const country = cc?.pais || "Bolivia";
        const countryCodeMap: Record<string, string> = {
          "Bolivia": "+591",
          "Panamá": "+507",
          "Guatemala": "+502",
          "Nicaragua": "+505",
          "Paraguay": "+595"
        };

        const telFull = t.extension || (t.solicitante as any)?.telefono || "";
        const phoneClean = telFull.replace(/\D/g, "");
        const pCC = telFull.startsWith("+")
          ? telFull.substring(0, 4)
          : countryCodeMap[country] || "+591";

        return {
          id: t.id,
          numero_ticket: t.numero_ticket || "0",
          titulo: tipoNombre,
          descripcion: t.descripcion || "",
          number: t.numero_ticket || "0",
          fullName: solicitanteNombre,
          workstation: t.puesto_trabajo || "",
          callCenter: cleanCC,
          callCenterId: cc?.id || "unknown",
          callCenterCode: cc?.codigo || "BO",
          country: cc?.pais || "Bolivia",
          problemType: tipoNombre,
          description: t.descripcion || "",
          phone: phoneClean,
          phoneCountryCode: pCC,
          status: normalizeStatus(estadoNombre),
          assignedArea:
            normalizeStatus(estadoNombre) === "escalado"
              ? "IT Especializado"
              : "Soporte Técnico",
          assignedTo: techniciansMap.get(t.tecnico_asignado_id) || "No asignado",
          workMode:
            t.modalidad_trabajo === "home-office"
              ? "home-office"
              : "presencial",
          createdAt: t.creado_en,
          updatedAt: t.actualizado_en,
          estado_id: t.estado_id,
          solicitante_id: t.solicitante_id,
          tecnico_asignado_id: t.tecnico_asignado_id,
          ip_vpn: t.ip_vpn,
          registro_estado: t.registro_estado,
          fechaAsignacion: t.fecha_asignacion,
          fechaCierre: t.fecha_cierre,
          solutionName: (t.soluciones as any)?.titulo || null,
          extension: t.extension || null,
        } as ExtendedTicket;
      });
    },
    staleTime: 1000 * 60, // 1 minuto de frescura
  });
};
