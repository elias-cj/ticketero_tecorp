import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useSystem } from "@/contexts/SystemContext";

const isoMap: Record<string, string> = {
  "Panamá":    "PA",
  "Guatemala": "GT",
  "Bolivia":   "BO",
  "Nicaragua": "NI",
  "Paraguay":  "PY",
};

const normalizeCountryName = (name: string): string => {
  if (name.includes("Panamá")) return "Panamá";
  if (name.includes("Nicaragua")) return "Nicaragua";
  if (name.includes("Guatemala")) return "Guatemala";
  if (name.includes("Bolivia")) return "Bolivia";
  if (name.includes("Paraguay")) return "Paraguay";
  return name;
};

const getCCFlagGradient = (id: string) => {
  const cid = (id || "").toLowerCase();
  if (cid === "gt") return "linear-gradient(to bottom, #4997d0 33%, #ffffff 33% 66%, #4997d0 66%)";
  if (cid === "pa") return "linear-gradient(to bottom, #ffffff 25%, #005293 25% 50%, #d21034 50% 75%, #ffffff 75%)";
  if (cid === "bo") return "linear-gradient(to bottom, #d52b1e 33%, #f9e300 33% 66%, #007934 66%)";
  if (cid === "ni") return "linear-gradient(to bottom, #003594 33%, #ffffff 33% 66%, #003594 66%)";
  if (cid === "py") return "linear-gradient(to bottom, #d52b1e 33%, #ffffff 33% 66%, #0038a8 66%)";
  return "var(--primary)";
};

export function useDashboardAnalytics() {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedCC, setSelectedCC] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [activeTech, setActiveTech] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeProb, setActiveProb] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeWorkMode, setActiveWorkMode] = useState<string | null>(null);
  const [activeSede, setActiveSede] = useState<string | null>(null);
  const { isLoadingSystem } = useSystem();

  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEYS.analytics, timeFilter, dateRange],
    enabled: !isLoadingSystem,
    queryFn: async () => {
      // --- Consulta 1: Tickets con solo las columnas ligeras necesarias ---
      // Sin límite: Supabase pagina automáticamente; usamos range para traer todos.
      let allTickets: any[] = [];
      const PAGE_SIZE = 50000;
      let from = 0;
      let hasMore = true;

      // Aplicar filtro de fecha en la query de BD para reducir payload
      const buildBaseQuery = (offset: number) => {
        let q = supabase
          .from('tickets')
          .select(`
            creado_en,
            modalidad_trabajo,
            fecha_asignacion,
            fecha_cierre,
            escalados,
            estados_ticket:estado_id(nombre),
            tipos_problema:tipo_problema_id(nombre),
            tecnico:tecnico_asignado_id(nombre_completo),
            call_centers:centro_contacto_id(nombre, pais)
          `)
          .range(offset, offset + PAGE_SIZE - 1)
          .order('creado_en', { ascending: false });

        // Filtro de fecha en la BD para reducir datos en "today", "weekly", "monthly"
        if (timeFilter === 'today') {
          const s = new Date(); s.setUTCHours(0, 0, 0, 0);
          const iso = s.toISOString();
          q = q.or(`creado_en.gte.${iso},fecha_cierre.gte.${iso},fecha_asignacion.gte.${iso}`);
        } else if (timeFilter === 'weekly') {
          const w = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const iso = w.toISOString();
          q = q.or(`creado_en.gte.${iso},fecha_cierre.gte.${iso},fecha_asignacion.gte.${iso}`);
        } else if (timeFilter === 'monthly') {
          const m = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const iso = m.toISOString();
          q = q.or(`creado_en.gte.${iso},fecha_cierre.gte.${iso},fecha_asignacion.gte.${iso}`);
        } else if (timeFilter === 'custom' && dateRange.start && dateRange.end) {
          const startDate = new Date(dateRange.start + 'T00:00:00');
          const endDate = new Date(dateRange.end + 'T23:59:59.999');
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const startIso = startDate.toISOString();
            q = q.or(`creado_en.gte.${startIso},fecha_cierre.gte.${startIso},fecha_asignacion.gte.${startIso}`);
          }
        }

        return q;
      };

      while (hasMore) {
        const { data: page, error: pageError } = await buildBaseQuery(from);
        if (pageError) throw pageError;
        if (!page || page.length === 0) { hasMore = false; break; }
        allTickets = allTickets.concat(page);
        if (page.length < PAGE_SIZE) { hasMore = false; } else { from += PAGE_SIZE; }
      }

      // Normalizar los tickets al formato esperado por los cálculos de analytics
      const tickets = allTickets.map((t: any) => {
        const ccEntry = Array.isArray(t.call_centers) ? t.call_centers[0] : t.call_centers;
        const techEntry = Array.isArray(t.tecnico) ? t.tecnico[0] : (t.tecnico || t.tecnico_asignado);
        const statusEntry = Array.isArray(t.estados_ticket) ? t.estados_ticket[0] : t.estados_ticket;
        const probEntry = Array.isArray(t.tipos_problema) ? t.tipos_problema[0] : t.tipos_problema;

        const raw_mode = (t.modalidad_trabajo || '').toLowerCase();
        const work_mode =
          raw_mode === 'home-office' || raw_mode === 'home office' || raw_mode === 'remoto'
            ? 'Home Office'
            : raw_mode === 'presencial' || raw_mode === 'oficina'
            ? 'Presencial'
            : 'Otros';

        return {
          created_at: t.creado_en,
          status: statusEntry?.nombre || 'Desconocido',
          problem_type: probEntry?.nombre || 'General',
          country: ccEntry?.pais || 'Otros',
          ccName: ccEntry?.nombre || 'Sin Centro',
          assigneeName: techEntry?.nombre_completo || 'Sin Asignar',
          work_mode,
          fecha_asignacion: t.fecha_asignacion,
          fecha_cierre: t.fecha_cierre,
          escalados: t.escalados,
        };
      });

      // --- Consulta 2: KPIs rápidos (conteos simples) y Técnicos de Soporte ---
      const [unassignedRes, escalatedRes, tasksRes, soporteUsersRes] = await Promise.all([
        supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .is('tecnico_asignado_id', null),
        supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('escalados', true),
        supabase
          .from('tareas')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('usuarios')
          .select(`
            id,
            nombre_completo,
            esta_activo,
            roles_usuario(roles(nombre))
          `)
          .eq('esta_activo', true),
      ]);

      const soporteTechNames = new Set<string>();

      (soporteUsersRes.data || []).forEach((u: any) => {
        const rolesArr = Array.isArray(u.roles_usuario) ? u.roles_usuario : [];
        const hasSoporte = rolesArr.some((ru: any) => {
          const rawStr = typeof ru === 'string' ? ru : JSON.stringify(ru);
          const rName = (ru?.roles?.nombre || ru?.nombre || rawStr).toLowerCase();
          if (rName === 'it' || rName.includes('it especializ') || rName.includes('infraestructura') || rName.includes('bi')) {
            return false;
          }
          return rName.includes('soporte') || rName.includes('tecnico') || rName.includes('técnico');
        });

        if (hasSoporte && u.nombre_completo) {
          soporteTechNames.add(u.nombre_completo.trim().toLowerCase());
        }
      });

      return {
        tickets,
        soporteTechNames,
        kpis: {
          unassignedCount: unassignedRes.count || 0,
          escalatedCount: escalatedRes.count || 0,
          pendingTasks: tasksRes.count || 0,
        },
      };
    },
    staleTime: 1000 * 5,
    refetchInterval: 10000,
    placeholderData: (prev) => prev,
  });

  // Query para estadísticas mensuales fijas (Mes Actual y Mes Pasado)
  const { data: monthlyStats, isLoading: isLoadingMonthly } = useQuery({
    queryKey: [QUERY_KEYS.analytics, "monthly-kpis", selected, selectedCC, activeTech, activeProb, activeStatus, activeWorkMode, activeSede],
    enabled: !isLoadingSystem,
    queryFn: async () => {
      const now = new Date();
      const firstCurrent = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const firstLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastLast = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

      const applyFilters = (q: any) => {
        let query = q;
        if (selectedCC) {
          query = query.eq('call_centers.nombre', selectedCC);
        } else if (selected) {
          query = query.eq('call_centers.pais', selected);
        }

        if (activeTech) query = query.eq('tecnico.nombre_completo', activeTech);
        if (activeProb) query = query.eq('tipos_problema.nombre', activeProb);
        if (activeStatus) query = query.eq('estados_ticket.nombre', activeStatus);
        if (activeSede) query = query.eq('call_centers.nombre', activeSede);
        
        if (activeWorkMode) {
          const mode = activeWorkMode.toLowerCase();
          if (mode === 'home office') {
            query = query.in('modalidad_trabajo', ['home-office', 'home office', 'remoto']);
          } else if (mode === 'presencial') {
            query = query.in('modalidad_trabajo', ['presencial', 'oficina']);
          } else {
            query = query.eq('modalidad_trabajo', activeWorkMode);
          }
        }
        return query;
      };

      const baseSelect = `
        id, 
        call_centers!inner(nombre, pais),
        tecnico:tecnico_asignado_id(nombre_completo),
        tipos_problema:tipo_problema_id(nombre),
        estados_ticket:estado_id(nombre)
      `;

      let qCurrent = supabase.from('tickets').select(baseSelect, { count: 'exact', head: true }).gte('creado_en', firstCurrent);
      let qLast = supabase.from('tickets').select(baseSelect, { count: 'exact', head: true }).gte('creado_en', firstLast).lte('creado_en', lastLast);

      qCurrent = applyFilters(qCurrent);
      qLast = applyFilters(qLast);

      const [resCurrent, resLast] = await Promise.all([qCurrent, qLast]);

      return {
        currentMonth: resCurrent.count || 0,
        lastMonth: resLast.count || 0
      };
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });

  const analytics = useMemo(() => {
    const empty = {
      total: 0, resolved: 0, open: 0, inProg: 0, homeOffice: 0, presencial: 0,
      ccList: [] as any[], mapData: {} as Record<string, number>,
      techData: [] as any[], probData: [] as any[], statusData: [] as any[],
      workModeData: [] as any[], sedeData: [] as any[],
      last7DaysData: [] as any[], monthlyData: [] as any[], countryData: [] as any[],
      avgWaitingTimeData: [] as any[], avgAttentionTimeData: [] as any[], avgTechAttentionTimeData: [] as any[],
      currentMonthCount: 0,
      lastMonthCount: 0,
    };
    if (!rawData?.tickets) return empty;

    const now = new Date();

    const isInPeriod = (dateStr: string | null | undefined) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (timeFilter === "today") {
        const s = new Date(); s.setUTCHours(0, 0, 0, 0);
        return d >= s;
      } else if (timeFilter === "weekly") {
        const w = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= w;
      } else if (timeFilter === "monthly") {
        const m = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return d >= m;
      } else if (timeFilter === "custom" && dateRange.start && dateRange.end) {
        const s = new Date(dateRange.start + 'T00:00:00');
        const e = new Date(dateRange.end + 'T23:59:59.999');
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
          return d >= s && d <= e;
        }
      }
      return true; // "all"
    };

    const getFilteredTicketsForMetric = (dateField: 'created_at' | 'fecha_asignacion' | 'fecha_cierre') => {
      return rawData.tickets.filter(t => {
        // En base a la fecha de la métrica
        const dateVal = dateField === 'created_at' ? t.created_at : t[dateField];
        if (!isInPeriod(dateVal)) return false;

        const matchGeo = selectedCC
          ? t.ccName === selectedCC
          : selected
          ? normalizeCountryName(t.country) === normalizeCountryName(selected)
          : activeSede
          ? t.ccName === activeSede
          : true;

        if (!matchGeo) return false;

        const matchOthers =
          (!activeTech || t.assigneeName === activeTech) &&
          (!activeProb || t.problem_type === activeProb) &&
          (!activeStatus || t.status === activeStatus) &&
          (!activeWorkMode || t.work_mode?.toLowerCase() === activeWorkMode?.toLowerCase());

        return matchOthers;
      });
    };

    // Tickets filtrados por creación (volumen general)
    const fullyFiltered = getFilteredTicketsForMetric('created_at');

    const total = fullyFiltered.length;
    const resolved = fullyFiltered.filter(t => ["resuelto", "cerrado"].includes(t.status?.toLowerCase())).length;
    const open = fullyFiltered.filter(t => ["abierto", "open"].includes(t.status?.toLowerCase())).length;
    const inProg = fullyFiltered.filter(t => ["en progreso", "en_progreso"].includes(t.status?.toLowerCase())).length;
    const homeOffice = fullyFiltered.filter(t => ["home office", "home-office", "remoto"].includes(t.work_mode?.toLowerCase() || '')).length;
    const presencial = fullyFiltered.filter(t => ["presencial", "oficina"].includes(t.work_mode?.toLowerCase() || '')).length;

    // CC data + map intensity
    const ccs: Record<string, { country: string; tickets: number }> = {};
    const intensityData: Record<string, number> = {};
    fullyFiltered.forEach(t => {
      ccs[t.ccName] = { country: t.country, tickets: (ccs[t.ccName]?.tickets || 0) + 1 };
      const iso = isoMap[normalizeCountryName(t.country)];
      if (iso) intensityData[iso] = (intensityData[iso] || 0) + 1;
    });

    const ccList = Object.entries(ccs).map(([name, data]) => ({
      name, country: data.country, count: data.tickets,
      code: isoMap[normalizeCountryName(data.country)] || "PA",
    })).sort((a, b) => b.count - a.count);

    const mapData = selected
      ? { [isoMap[normalizeCountryName(selected)] || "PA"]: intensityData[isoMap[normalizeCountryName(selected)]] || 1 }
      : intensityData;

    const soporteTechNamesRaw = rawData?.soporteTechNames || new Set<string>();
    const normalizeStr = (str: string) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const soporteTechSet = new Set(Array.from(soporteTechNamesRaw).map(n => normalizeStr(n)));

    // Charts: Filtrar ÚNICAMENTE usuarios que tienen asignado el rol de Técnico de Soporte
    const techData = Object.entries(
      fullyFiltered.reduce((acc: any, t) => {
        const normName = normalizeStr(t.assigneeName || "");
        if (t.assigneeName !== "Sin Asignar") {
          const isSoporte = soporteTechSet.has(normName);
          if (isSoporte) {
            acc[t.assigneeName] = (acc[t.assigneeName] || 0) + 1;
          }
        }
        return acc;
      }, {})
    ).map(([name, value]: any) => ({ name, value })).sort((a: any, b: any) => b.value - a.value).slice(0, 8);

    const probData = Object.entries(
      fullyFiltered.reduce((acc: any, t) => {
        acc[t.problem_type || "General"] = (acc[t.problem_type || "General"] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]: any) => ({ name, value })).sort((a: any, b: any) => b.value - a.value).slice(0, 8);

    const statusData = Object.entries(
      fullyFiltered.reduce((acc: any, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]: any) => ({ name, value })).sort((a: any, b: any) => b.value - a.value);

    const workModeData = [
      { name: 'Presencial', value: presencial },
      { name: 'Home Office', value: homeOffice },
      { name: 'Otros', value: total - presencial - homeOffice > 0 ? total - presencial - homeOffice : 0 },
    ].filter(d => d.value > 0);

    const sedeData = Object.entries(ccs)
      .map(([name, data]) => ({
        name: name.replace(/^call center\s*/i, '').trim(),
        fullName: name,
        value: data.tickets,
        country: data.country,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);

    // Last 7 days
    const last7: Record<string, { name: string; tickets: number; date: Date }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
      last7[key] = { name: key, tickets: 0, date: new Date(d) };
    }
    fullyFiltered.forEach(t => {
      const key = new Date(t.created_at).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
      if (last7[key]) last7[key].tickets += 1;
    });
    const last7DaysData = Object.values(last7).sort((a, b) => a.date.getTime() - b.date.getTime()).map(({ name, tickets }) => ({ name, tickets }));

    // Monthly trend (last 6 months)
    const monthlyMap: Record<string, { name: string; tickets: number; date: Date }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now); d.setMonth(now.getMonth() - i); d.setDate(1);
      const key = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      monthlyMap[key] = { name: key, tickets: 0, date: new Date(d) };
    }
    fullyFiltered.forEach(t => {
      const d = new Date(t.created_at);
      const key = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      if (monthlyMap[key]) monthlyMap[key].tickets++;
    });
    const monthlyData = Object.values(monthlyMap).sort((a, b) => a.date.getTime() - b.date.getTime()).map(({ name, tickets }) => ({ name, tickets }));

    const countryData = Object.entries(
      fullyFiltered.reduce((acc: any, t) => {
        acc[t.country || "Desconocido"] = (acc[t.country || "Desconocido"] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => (b.value as number) - (a.value as number));

    // Time Metrics (Waiting and Attention)
    const waitingTimes: Record<string, number[]> = {};
    const attentionTimes: Record<string, number[]> = {};

    // Filtrados para tiempos de espera (en base a la fecha de asignación en este periodo)
    const waitingFiltered = getFilteredTicketsForMetric('fecha_asignacion');
    waitingFiltered.forEach(t => {
      const cc = t.ccName;
      if (t.created_at && t.fecha_asignacion) {
        const start = new Date(t.created_at).getTime();
        const end = new Date(t.fecha_asignacion).getTime();
        const diffMinutes = (end - start) / (1000 * 60);
        if (diffMinutes >= 0) {
          if (!waitingTimes[cc]) waitingTimes[cc] = [];
          waitingTimes[cc].push(diffMinutes);
        }
      }
    });

    // Filtrados para tiempos de atención (en base a la fecha de cierre en este periodo)
    const attentionFiltered = getFilteredTicketsForMetric('fecha_cierre');
    attentionFiltered.forEach(t => {
      const cc = t.ccName;
      if (t.fecha_asignacion && t.fecha_cierre) {
        const start = new Date(t.fecha_asignacion).getTime();
        const end = new Date(t.fecha_cierre).getTime();
        const diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours >= 0) {
          if (!attentionTimes[cc]) attentionTimes[cc] = [];
          attentionTimes[cc].push(diffHours);
        }
      }
    });

    const avgWaitingTimeData = Object.entries(waitingTimes).map(([name, values]) => ({
      name: name.replace(/^call center\s*/i, '').trim(),
      value: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    })).sort((a, b) => b.value - a.value);

    const avgAttentionTimeData = Object.entries(attentionTimes).map(([name, values]) => ({
      name: name.replace(/^call center\s*/i, '').trim(),
      value: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 60) // Convert hours to minutes and round
    })).sort((a, b) => b.value - a.value);

    // 3. Attention Time per Technician (en base a los cerrados en este periodo)
    const techAttentionTimes: Record<string, number[]> = {};
    attentionFiltered.forEach(t => {
      const normName = normalizeStr(t.assigneeName || "");
      const startDate = t.fecha_asignacion || t.created_at;
      if (t.assigneeName !== "Sin Asignar" && startDate && t.fecha_cierre) {
        const esSoporte = soporteTechSet.has(normName);
        if (esSoporte) {
          const start = new Date(startDate).getTime();
          const end = new Date(t.fecha_cierre).getTime();
          const diffMinutes = (end - start) / (1000 * 60);
          if (diffMinutes >= 0) {
            if (!techAttentionTimes[t.assigneeName]) techAttentionTimes[t.assigneeName] = [];
            techAttentionTimes[t.assigneeName].push(diffMinutes);
          }
        }
      }
    });

    const avgTechAttentionTimeData = Object.entries(techAttentionTimes).map(([name, values]) => ({
      name,
      value: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    })).sort((a, b) => b.value - a.value);

    // Calcular Mes Actual y Mes Pasado dinámicamente desde los datos reales
    const latestDate = rawData.tickets.reduce((max: Date, t: any) => {
      if (!t.created_at) return max;
      const d = new Date(t.created_at);
      return d > max ? d : max;
    }, new Date(0));

    const targetMonth = latestDate.getTime() > 0 ? latestDate.getMonth() : now.getMonth();
    const targetYear = latestDate.getTime() > 0 ? latestDate.getFullYear() : now.getFullYear();

    const prevMonthDate = new Date(targetYear, targetMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    const currentMonthCountData = rawData.tickets.filter((t: any) => {
      if (!t.created_at) return false;
      const d = new Date(t.created_at);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    }).length;

    const lastMonthCountData = rawData.tickets.filter((t: any) => {
      if (!t.created_at) return false;
      const d = new Date(t.created_at);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }).length;

    return { 
      total, resolved, open, inProg, homeOffice, presencial, ccList, mapData, techData, probData, statusData, workModeData, sedeData, last7DaysData, monthlyData, countryData, avgWaitingTimeData, avgAttentionTimeData, avgTechAttentionTimeData,
      currentMonthCount: currentMonthCountData,
      lastMonthCount: lastMonthCountData
    };
  }, [rawData, selected, selectedCC, timeFilter, dateRange, activeTech, activeProb, activeStatus, activeWorkMode, activeSede, monthlyStats]);

  // Realtime polling para PostgreSQL local
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  return {
    loading: isLoading || isLoadingSystem || isLoadingMonthly,
    analytics,
    kpis: rawData?.kpis || { unassignedCount: 0, escalatedCount: 0, pendingTasks: 0 },
    filters: {
      selected, setSelected, selectedCC, setSelectedCC,
      timeFilter, setTimeFilter, dateRange, setDateRange,
      activeTech, setActiveTech,
      activeCat, setActiveCat,
      activeProb, setActiveProb,
      activeStatus, setActiveStatus,
      activeWorkMode, setActiveWorkMode,
      activeSede, setActiveSede,
    },
    fetchData: refetch,
    isoMap,
    normalizeCountryName,
    getCCFlagGradient,
  };
}
