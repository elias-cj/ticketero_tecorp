import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { ExtendedTicket } from "../types";
import { useTicketMetadata } from "./useTicketMetadata";
import { useSystem } from "@/contexts/SystemContext";

const PAGE_SIZE = 20;

export const useColumnTickets = (
  statusKey: "abierto" | "en-proceso" | "cerrado" | "escalado",
  search: string = "",
  queue: "soporte" | "it" = "soporte"
) => {
  const { techniciansMap } = useTicketMetadata();
  const { statusMap } = useSystem();

  const [page, setPage] = useState(1);

  // Resetear la página si cambia la búsqueda
  useEffect(() => {
    setPage(1);
  }, [search]);

  // 1. Query para obtener el conteo total en este estado
  const { data: totalCount = 0 } = useQuery({
    queryKey: [...QUERY_KEYS.tickets, "count", statusKey, search, queue, Object.keys(statusMap).length],
    queryFn: async () => {
      const statusIds = Object.entries(statusMap)
        .filter(([name]) => {
          const s = name.toLowerCase();
          if (statusKey === "cerrado") return s.includes("cerrado") || s.includes("resuelto");
          if (statusKey === "escalado") return s.includes("escalado") && !s.includes("cerrado") && !s.includes("resuelto");
          if (statusKey === "en-proceso") return s.includes("proceso") && !s.includes("cerrado") && !s.includes("resuelto");
          if (statusKey === "abierto") return s === "abierto";
          return false;
        })
        .map(([, id]) => id);

      if (statusIds.length === 0) return 0;

      let query = supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .in("estado_id", statusIds);

      // NUEVA LÓGICA: Filtrar por la columna 'escalados'
      if (queue === "it") {
        query = query.eq("escalados", true);
      } else {
        query = query.eq("escalados", false);
      }

      if (search) {
        const searchTerm = search.trim().split(/\s+/).join(' & ');
        query = query.textSearch('vector_busqueda', searchTerm);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    },
    enabled: Object.keys(statusMap).length > 0,
    refetchInterval: 3000,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // 2. Query paginada para los tickets de la columna actual
  const paginatedQuery = useQuery({
    queryKey: [...QUERY_KEYS.tickets, "column", statusKey, search, page, queue, Object.keys(statusMap).length],
    queryFn: async () => {
      const statusIds = Object.entries(statusMap)
        .filter(([name]) => {
          const s = name.toLowerCase();
          if (statusKey === "cerrado") return s.includes("cerrado") || s.includes("resuelto");
          if (statusKey === "escalado") return s.includes("escalado") && !s.includes("cerrado") && !s.includes("resuelto");
          if (statusKey === "en-proceso") return s.includes("proceso") && !s.includes("cerrado") && !s.includes("resuelto");
          if (statusKey === "abierto") return s === "abierto";
          return false;
        })
        .map(([, id]) => id);

      if (statusIds.length === 0) return [];

      const orderByField = statusKey === "cerrado" ? "numero_ticket" : "creado_en";
      const orderAsc = statusKey !== "cerrado";

      const ticketFields = `
        id, numero_ticket, titulo, descripcion,
        estado_id, solicitante_id,
        creado_en, actualizado_en, tecnico_asignado_id,
        extension, puesto_trabajo, modalidad_trabajo, ip_vpn,
        nombre_solicitante, registro_estado, fecha_asignacion, fecha_cierre,
        estados_ticket ( nombre ),
        tipos_problema ( nombre ),
        call_centers ( id, nombre, codigo, pais, nombre_corto, codigo_telefono, color_bandera ),
        solicitante:usuarios!solicitante_id ( nombre_completo, telefono ),
        tecnico:usuarios!tecnico_asignado_id ( nombre_completo ),
        soluciones ( titulo )
      `;

      let query = supabase
        .from("tickets")
        .select(ticketFields)
        .in("estado_id", statusIds);

      // NUEVA LÓGICA: Filtrar por la columna 'escalados'
      if (queue === "it") {
        query = query.eq("escalados", true);
      } else {
        query = query.eq("escalados", false);
      }

      if (search) {
        const searchTerm = search.trim().split(/\s+/).join(' & ');
        query = query.textSearch('vector_busqueda', searchTerm);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await query
        .order(orderByField, { ascending: orderAsc })
        .range(from, to);

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: Object.keys(statusMap).length > 0,
    refetchInterval: 3000,
  });

  // 3. Mapeo reactivo de tickets (para asegurar que los nombres se actualicen en cuanto cargue el mapa)
  const tickets = useMemo((): ExtendedTicket[] => {
    if (!paginatedQuery.data) return [];

    const normalizeStatus = (nombreEstado: string): ExtendedTicket["status"] => {
      const s = (nombreEstado || "").toLowerCase();
      if (s.includes("cerrado")) return "cerrado";
      if (s.includes("resuelto")) return "resuelto";
      if (s.includes("proceso")) return "en-proceso";
      if (s.includes("escalado")) return "escalado";
      return "abierto";
    };

    const getPriorityRank = (t: ExtendedTicket): number => {
      const desc = (t.description || t.descripcion || "").toLowerCase();
      let scopeVal = "";
      if (desc.includes("[afectados:")) {
        const match = desc.match(/\[afectados:\s*([^\]]+)\]/i);
        if (match && match[1]) {
          scopeVal = match[1].trim();
        }
      }

      if (scopeVal.includes("todo") || scopeVal.includes("servicio")) return 4; // URGENTE
      const num = parseInt(scopeVal, 10);
      if (!isNaN(num)) {
        if (num > 10) return 4; // URGENTE
        if (num >= 5 && num <= 10) return 3; // ALTO
        if (num >= 2 && num <= 4) return 2; // MEDIO
        if (num === 1) return 1; // BAJO
      }
      return 2; // Default MEDIO
    };

    const mapped = paginatedQuery.data.map((t) => {
      const cc = t.call_centers as any;
      const cleanCC = cc?.nombre_corto || cc?.nombre || "N/A";
      const estadoNombre = (t.estados_ticket as any)?.nombre || "Abierto";
      const tipoNombre = (t.tipos_problema as any)?.nombre || t.titulo || "Ticket";
      const solicitanteNombre = t.nombre_solicitante || (t.solicitante as any)?.nombre_completo || "Usuario";
      const telFull = (t.extension || (t.solicitante as any)?.telefono || "").trim();
      const phoneClean = telFull.replace(/\D/g, "");
      let rawPhoneCode = cc?.codigo_telefono || "591";

      if ((cc?.pais?.toLowerCase() === "bolivia" || cc?.nombre_corto === "BO") && rawPhoneCode === "592") {
        rawPhoneCode = "591";
      }
      const pCC = `+${rawPhoneCode}`;
      const flagGradient = cc?.color_bandera || "var(--primary)";

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
        phone: phoneClean || "",
        phoneCountryCode: pCC,
        flagGradient: flagGradient,
        status: normalizeStatus(estadoNombre),
        assignedArea: t.escalados ? "IT Especializado" : "Soporte Técnico",
        assignedTo: (t.tecnico as any)?.nombre_completo || "No asignado",
        workMode: t.modalidad_trabajo === "home-office" ? "home-office" : "presencial",
        createdAt: t.creado_en,
        updatedAt: t.actualizado_en,
        estado_id: t.estado_id,
        solicitante_id: t.solicitante_id,
        tecnico_asignado_id: t.tecnico_asignado_id,
        ip_vpn: t.ip_vpn,
        registro_estado: t.registro_estado,
        escalados: t.escalados,
        fechaAsignacion: t.fecha_asignacion,
        fechaCierre: t.fecha_cierre,
        solutionName: (t.soluciones as any)?.titulo || null,
        extension: t.extension || null,
      } as ExtendedTicket;
    });

    if (statusKey === "abierto" || statusKey === "escalado") {
      return mapped.sort((a, b) => {
        const rankA = getPriorityRank(a);
        const rankB = getPriorityRank(b);
        if (rankB !== rankA) {
          return rankB - rankA; // Del más alto (4 = URGENTE) al más bajo (1 = BAJO)
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return mapped;
  }, [paginatedQuery.data, statusKey, techniciansMap]);

  return {
    tickets,
    totalCount,
    page,
    totalPages,
    setPage,
    isFetching: paginatedQuery.isFetching,
    isLoading: paginatedQuery.isLoading,
  };
};
