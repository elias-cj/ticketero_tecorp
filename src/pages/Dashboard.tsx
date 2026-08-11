import { useCallback, useRef, useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, AreaChart, Area, PieChart, Pie, CartesianGrid } from "recharts";
import { VectorMap } from "@react-jvectormap/core";
import { worldMill } from "@react-jvectormap/world";
import { RefreshCcw, Ticket, AlertTriangle, TrendingUp, ClipboardList, Calendar as CalendarIcon, Filter, X, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const CHART_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];
const MODE_COLORS: Record<string, string> = { "Presencial": "#10b981", "Home Office": "#3b82f6", "Otros": "#94a3b8" };

const CTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-3 text-xs">
      <p className="font-black text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || p.fill }} className="font-bold">{p.name || "Tickets"}: <span className="text-foreground">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const { loading, analytics, kpis, filters, fetchData, isoMap, normalizeCountryName, getCCFlagGradient } = useDashboardAnalytics();
  const { selected, setSelected, selectedCC, setSelectedCC, timeFilter, setTimeFilter, dateRange, setDateRange,
    activeTech, setActiveTech, activeProb, setActiveProb, activeStatus, setActiveStatus,
    activeWorkMode, setActiveWorkMode, activeSede, setActiveSede } = filters;

  const dashboardPerms = user?.permissions?.['Dashboard'] || [];
  const role = (user?.role || "").toLowerCase();
  const rawRoleName = (user?.roleName || "").toLowerCase().trim();

  const isSuperAdmin = ["superadmin", "super", "superadm", "administrador supremo", "supremo"].includes(role);

  const isSoporteTecnico = rawRoleName.includes("soporte") || role.includes("soporte") || rawRoleName.includes("técnico") || rawRoleName.includes("tecnico");

  // canSeeAll se usa para ver todos los países/sedes en el dashboard
  const isTechStaff = role.includes("soporte") || role.includes("it") || role.includes("tecnico") || role.includes("especializado");
  const canSeeAll = isSuperAdmin || isTechStaff;

  // canSeeEfficiency controla los últimos 3 gráficos (rendimiento)
  const canSeeEfficiency = isSuperAdmin || isSoporteTecnico || isTechStaff;

  const canSee = dashboardPerms.includes('VER') || canSeeAll;
  const mapRef = useRef<any>(null);

  const handleRegionClick = useCallback((_e: any, code: string) => {
    const name = Object.entries(isoMap).find(([, v]) => v === code)?.[0];
    if (name) setSelected(selected === name ? null : name);
  }, [selected, setSelected, isoMap]);

  // Limpieza de tooltips zombis de jVectorMap al desmontar
  useEffect(() => {
    return () => {
      const tips = document.querySelectorAll('.jvectormap-tip');
      tips.forEach(t => t.remove());
    };
  }, []);

  if (!canSee && !loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center"><Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" /><h1 className="text-xl font-bold">Acceso Denegado</h1></div>
    </div>
  );

  if (loading && analytics.total === 0) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );

  const kpiCards = [
    { label: "Total Procesados", value: analytics.total, icon: Ticket, color: "from-slate-700 to-slate-900", filter: null },
    { label: "Mes Actual", value: analytics.currentMonthCount, icon: CalendarIcon, color: "from-red-500 to-red-700", filter: null },
    { label: "Mes Pasado", value: analytics.lastMonthCount, icon: TrendingUp, color: "from-orange-500 to-orange-700", filter: null },
    { label: "Tareas", value: kpis.pendingTasks, icon: ClipboardList, color: "from-violet-500 to-violet-700", filter: null },
  ];

  const hasFilters = activeTech || activeProb || activeStatus || activeWorkMode || activeSede;
  const clearAll = () => { setActiveTech(null); setActiveProb(null); setActiveStatus(null); setActiveWorkMode(null); setActiveSede(null); };

  return (
    <div className="p-3 md:p-6 space-y-4 bg-background min-h-screen">
      <Helmet><title>Dashboard — Ticketero</title></Helmet>

      {/* HEADER: fila 1 — título + controles de fecha */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground/50">Métricas en Tiempo Real</p>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter italic">DASHBOARD</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Filtro de fecha */}
          <div className="relative">
            <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <select value={timeFilter} onChange={e => { setTimeFilter(e.target.value); if (e.target.value !== "custom") setDateRange({ start: "", end: "" }); }}
              className="pl-8 pr-6 py-1.5 rounded-xl text-[10px] font-black uppercase bg-card border border-border appearance-none cursor-pointer focus:outline-none">
              <option value="all">Todos</option>
              <option value="today">Hoy</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="custom">Personalizado</option>
            </select>
            <Filter className="absolute right-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground pointer-events-none" />
          </div>
          <button onClick={() => fetchData()} className="p-1.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* HEADER: fila 2 — CCs con scroll horizontal */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-3 px-3 md:mx-0 md:px-0 md:flex-wrap">
        {/* TODOS */}
        <button onClick={() => { setSelectedCC(null); setSelected(null); }}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border shadow-sm transition-all ${!selectedCC && !selected ? "bg-slate-900 text-white border-slate-900" : "bg-card text-slate-600 border-border"}`}>
          TODOS <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${!selectedCC && !selected ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{analytics.total}</span>
        </button>

        {(() => {
          const visibleCCs = analytics.ccList.filter(c => {
            const lbl = c.name.replace(/^call center\s*/i, "").trim();
            return dashboardPerms.includes(lbl) || canSeeAll;
          });
          const shown = visibleCCs.slice(0, 2);
          const rest = visibleCCs.slice(2);
          const activeInRest = rest.some(c => c.name === selectedCC);
          return (
            <>
              {shown.map(c => {
                const lbl = c.name.replace(/^call center\s*/i, "").trim();
                const active = selectedCC === c.name;
                return (
                  <button key={c.name} onClick={() => { setSelectedCC(active ? null : c.name); setSelected(active ? null : c.country); }}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border shadow-sm transition-all ${active ? "bg-slate-900 text-white border-slate-900" : "bg-card text-slate-600 border-border"}`}>
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: getCCFlagGradient(c.code) }} />
                    {lbl} <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${active ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{c.count}</span>
                  </button>
                );
              })}
              {rest.length > 0 && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => {
                      const el = document.getElementById('cc-dropdown');
                      if (el) el.classList.toggle('hidden');
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border shadow-sm transition-all ${activeInRest ? "bg-slate-900 text-white border-slate-900" : "bg-card text-slate-600 border-border"
                      }`}>
                    {activeInRest ? `${selectedCC?.replace(/^call center\s*/i, "").trim()} ·` : `+${rest.length}`}
                    <span className="text-base leading-none">›</span>
                  </button>
                  <div
                    id="cc-dropdown"
                    className="hidden absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-2xl shadow-xl p-2 flex flex-col gap-1 min-w-[200px] max-h-64 overflow-y-auto"
                  >
                    {rest.map(c => {
                      const lbl = c.name.replace(/^call center\s*/i, "").trim();
                      const active = selectedCC === c.name;
                      return (
                        <button key={c.name}
                          onClick={() => {
                            setSelectedCC(active ? null : c.name);
                            setSelected(active ? null : c.country);
                            document.getElementById('cc-dropdown')?.classList.add('hidden');
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all text-left ${active ? "bg-slate-900 text-white" : "hover:bg-muted text-slate-600"
                            }`}>
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: getCCFlagGradient(c.code) }} />
                          {lbl}
                          <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold ${active ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{c.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Custom date range */}
      {timeFilter === "custom" && (
        <div className="bg-card border border-border/50 p-4 rounded-2xl flex flex-col md:flex-row items-end gap-4">
          <div className="space-y-1 flex-1"><label className="text-[10px] font-black uppercase text-muted-foreground">Desde</label>
            <div className="relative"><CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input type="date" className="pl-9 h-9 text-xs" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
            </div></div>
          <div className="space-y-1 flex-1"><label className="text-[10px] font-black uppercase text-muted-foreground">Hasta</label>
            <div className="relative"><CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input type="date" className="pl-9 h-9 text-xs" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
            </div></div>
          <Button variant="ghost" size="sm" onClick={() => setTimeFilter("all")} className="h-9 text-muted-foreground hover:text-destructive"><X className="h-4 w-4 mr-1" />Limpiar</Button>
        </div>
      )}

      {/* Active filters */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Filtros:</span>
          {activeTech && <Badge className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 cursor-pointer hover:bg-destructive hover:text-white" onClick={() => setActiveTech(null)}>Técnico: {activeTech} <X className="h-3 w-3" /></Badge>}
          {activeProb && <Badge className="text-[10px] gap-1 bg-sky-500/15 text-sky-600 border-sky-500/30 cursor-pointer hover:bg-destructive hover:text-white" onClick={() => setActiveProb(null)}>Problema: {activeProb} <X className="h-3 w-3" /></Badge>}
          {activeStatus && <Badge className="text-[10px] gap-1 bg-amber-500/15 text-amber-600 border-amber-500/30 cursor-pointer hover:bg-destructive hover:text-white" onClick={() => setActiveStatus(null)}>Estado: {activeStatus} <X className="h-3 w-3" /></Badge>}
          {activeWorkMode && <Badge className="text-[10px] gap-1 bg-violet-500/15 text-violet-600 border-violet-500/30 cursor-pointer hover:bg-destructive hover:text-white" onClick={() => setActiveWorkMode(null)}>Modalidad: {activeWorkMode} <X className="h-3 w-3" /></Badge>}
          {activeSede && <Badge className="text-[10px] gap-1 bg-pink-500/15 text-pink-600 border-pink-500/30 cursor-pointer hover:bg-destructive hover:text-white" onClick={() => setActiveSede(null)}>Sede: {activeSede.replace(/^call center\s*/i, "").trim()} <X className="h-3 w-3" /></Badge>}
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 text-[10px] font-black text-muted-foreground hover:text-destructive underline">Limpiar todos</Button>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map(k => (
          <div key={k.label} onClick={() => k.filter?.()}
            className={`bg-gradient-to-br ${k.color} text-white rounded-2xl p-3 md:p-5 flex items-center gap-3 shadow-lg ${k.filter ? "cursor-pointer hover:opacity-90 active:scale-[0.98]" : ""} transition-all`}>
            <div className="h-9 w-9 md:h-12 md:w-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <k.icon className="h-4 w-4 md:h-6 md:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] font-bold uppercase opacity-70 leading-tight">{k.label}</p>
              <p className="text-2xl md:text-3xl font-black leading-tight">{k.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MAP + TECHNICIANS */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex flex-col lg:flex-row">
          {/* Technicians */}
          <div className="w-full lg:w-[26%] p-5 border-r border-border bg-muted/5 flex flex-col min-h-[380px]">
            <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4">🏆 Top Técnicos <span className="text-primary">(clic para filtrar)</span></h3>
            <div className="flex-1 relative">
              <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                <BarChart data={analytics.techData} layout="vertical" barSize={14} margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold' }} width={85} tickLine={false} axisLine={false} />
                  <Tooltip content={<CTooltip />} />
                  <Bar dataKey="value" onClick={(p: any) => setActiveTech(p.name === activeTech ? null : p.name)} radius={[0, 6, 6, 0]} cursor="pointer">
                    {analytics.techData.map((e, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={!activeTech || activeTech === e.name ? 1 : 0.25} />
                    ))}
                    <LabelList dataKey="value" position="right" fontSize={10} fontWeight="bold" fill="hsl(var(--foreground))" opacity={0.7} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {analytics.techData.length === 0 && <div className="absolute inset-0 flex items-center justify-center opacity-30"><p className="text-xs font-bold uppercase">Sin datos</p></div>}
            </div>
          </div>
          {/* Map */}
          <div className="w-full lg:w-[74%] min-h-[380px] p-4 bg-muted/5 relative flex items-center justify-center">
            <p className="absolute top-4 left-5 text-[10px] font-black uppercase text-muted-foreground tracking-widest">🌎 Distribución Geográfica</p>
            <div style={{ width: "100%", height: "370px" }}>
              <div ref={(node) => { if (node) { const orig = node.removeChild.bind(node); node.removeChild = (c: Node) => { try { return orig(c); } catch (e: any) { if (e.name === "NotFoundError") return c; throw e; } } } }} style={{ width: "100%", height: "100%" }}>
                <VectorMap mapRef={mapRef} map={worldMill} backgroundColor="transparent" zoomOnScroll={false} onRegionClick={handleRegionClick}
                  style={{ width: "100%", height: "100%" }}
                  focusOn={selected ? { region: isoMap[normalizeCountryName(selected)] || "PA", x: 0.5, y: 0.5, scale: normalizeCountryName(selected) === "Bolivia" ? 3.5 : 5, animate: true } : { x: 0.35, y: 0.6, scale: 2.2, animate: true }}
                  regionStyle={{ initial: { fill: "hsl(var(--muted-foreground) / 0.12)", stroke: "hsl(var(--border) / 0.3)", strokeWidth: 0.3 }, hover: { fillOpacity: 0.8, cursor: "pointer" }, selected: { fill: "hsl(var(--primary))" } }}
                  series={{ regions: [{ values: analytics.mapData, scale: ["#bfdbfe", "#1d4ed8"], normalizeFunction: "polynomial", attribute: "fill" }] }}
                  onRegionTipShow={(_e: any, tip: any, code: string) => {
                    const r = Object.entries(isoMap).find(([, v]) => v === code);
                    if (!r) return;
                    const count = analytics.mapData[code];
                    // Si hay un país seleccionado y este no es, no mostramos el tooltip
                    if (selected && isoMap[normalizeCountryName(selected)] !== code) {
                      _e.preventDefault();
                      return;
                    }
                    tip.html(`<b>${r[0]}</b>: ${count || 0} tickets`);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS ROW: Last7 | ProblemTypes | WorkMode */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Last 7 days */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-[10px] uppercase font-black opacity-70 tracking-widest">Últimos 7 Días</p>
          <p className="font-black text-base mb-3">Tickets por día</p>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={analytics.last7DaysData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <defs><linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fff" stopOpacity={0.3} /><stop offset="95%" stopColor="#fff" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CTooltip />} />
              <Area dataKey="tickets" stroke="#fff" strokeWidth={2} fill="url(#aGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Problem Types */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-[10px] uppercase font-black opacity-70 tracking-widest">Tipos de Problema</p>
          <p className="font-black text-base mb-1">Principales incidencias <span className="text-[9px] opacity-60">(clic para filtrar)</span></p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={analytics.probData.slice(0, 5)} layout="vertical" barSize={12} margin={{ top: 0, right: 35, left: -5, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 9 }} width={80} tickLine={false} axisLine={false} />
              <Tooltip content={<CTooltip />} />
              <Bar dataKey="value" onClick={(p: any) => setActiveProb(p.name === activeProb ? null : p.name)} radius={[0, 4, 4, 0]} cursor="pointer" fill="#a5b4fc">
                {analytics.probData.slice(0, 5).map((e, i) => (
                  <Cell key={i} fill="#a5b4fc" opacity={!activeProb || activeProb === e.name ? 1 : 0.3} />
                ))}
                <LabelList dataKey="value" position="right" fill="rgba(255,255,255,0.8)" fontSize={10} fontWeight="bold" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Work Mode donut */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-[10px] uppercase font-black opacity-70 tracking-widest">Modalidad</p>
          <p className="font-black text-base mb-1">Trabajo <span className="text-[9px] opacity-60">(clic para filtrar)</span></p>
          <div className="flex items-center gap-3">
            <ResponsiveContainer width="50%" height={130}>
              <PieChart>
                <Pie data={analytics.workModeData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}
                  onClick={(p: any) => setActiveWorkMode(p.name === activeWorkMode ? null : p.name)}>
                  {analytics.workModeData.map((e, i) => (
                    <Cell key={i} fill={MODE_COLORS[e.name] || CHART_COLORS[i]} opacity={!activeWorkMode || activeWorkMode === e.name ? 1 : 0.3} cursor="pointer" />
                  ))}
                </Pie>
                <Tooltip content={<CTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {analytics.workModeData.map((e, i) => (
                <button key={i} onClick={() => setActiveWorkMode(e.name === activeWorkMode ? null : e.name)}
                  className={`flex items-center gap-2 text-left transition-opacity ${activeWorkMode && activeWorkMode !== e.name ? "opacity-30" : "opacity-100"}`}>
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: MODE_COLORS[e.name] || CHART_COLORS[i] }} />
                  <span className="text-[10px] font-bold truncate">{e.name}</span>
                  <span className="text-[10px] font-black ml-auto">{e.value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SEDE DISTRIBUTION (full width) */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Distribución por Sede</p>
            <p className="font-black text-base text-foreground">Carga operativa por Call Center <span className="text-[10px] text-muted-foreground font-normal">(clic para filtrar)</span></p>
          </div>
          {activeSede && <Badge className="bg-pink-500/10 text-pink-600 border-pink-500/20 cursor-pointer" onClick={() => setActiveSede(null)}>{activeSede.replace(/^call center\s*/i, "").trim()} <X className="h-3 w-3 ml-1" /></Badge>}
        </div>
        <ResponsiveContainer width="100%" height={analytics.sedeData.length * 38 + 20}>
          <BarChart data={analytics.sedeData} layout="vertical" barSize={20} margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 'bold' }} width={130} tickLine={false} axisLine={false} />
            <Tooltip content={<CTooltip />} />
            <Bar dataKey="value" onClick={(p: any) => setActiveSede(p.fullName === activeSede ? null : p.fullName)} radius={[0, 8, 8, 0]} cursor="pointer">
              {analytics.sedeData.map((e, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={!activeSede || activeSede === e.fullName ? 1 : 0.25} />
              ))}
              <LabelList dataKey="value" position="right" fontSize={11} fontWeight="bold" fill="hsl(var(--foreground))" opacity={0.7} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* OPERATIONAL LOAD: SuperAdmin & Soporte Técnico solamente */}
      {canSeeEfficiency && (
        <div className="space-y-5 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Waiting Time Chart */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div>
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Tiempo de Respuesta</p>
                <p className="font-black text-base text-foreground">Promedio de espera para asignación <span className="text-[10px] text-muted-foreground font-normal">(en minutos)</span></p>
              </div>
              <div className="mt-4">
                {analytics.avgWaitingTimeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(120, analytics.avgWaitingTimeData.length * 35)}>
                    <BarChart data={analytics.avgWaitingTimeData} layout="vertical" barSize={15} margin={{ top: 10, right: 50, left: 0, bottom: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold' }} width={100} tickLine={false} axisLine={false} />
                      <Tooltip content={<CTooltip />} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#f59e0b">
                        <LabelList dataKey="value" position="right" fontSize={10} fontWeight="bold" fill="hsl(var(--foreground))" formatter={(v: number) => `${v}m`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[120px] flex items-center justify-center opacity-30 border-2 border-dashed border-border rounded-xl">
                    <p className="text-xs font-bold uppercase">Datos insuficientes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Attention Time Chart (CC) */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div>
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Eficiencia por Sede</p>
                <p className="font-black text-base text-foreground">Promedio de atención por Call Center <span className="text-[10px] text-muted-foreground font-normal">(en minutos)</span></p>
              </div>
              <div className="mt-4">
                {analytics.avgAttentionTimeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(120, analytics.avgAttentionTimeData.length * 35)}>
                    <BarChart data={analytics.avgAttentionTimeData} layout="vertical" barSize={15} margin={{ top: 10, right: 50, left: 0, bottom: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold' }} width={100} tickLine={false} axisLine={false} />
                      <Tooltip content={<CTooltip />} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#10b981">
                        <LabelList dataKey="value" position="right" fontSize={10} fontWeight="bold" fill="hsl(var(--foreground))" formatter={(v: number) => `${v}m`} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[120px] flex items-center justify-center opacity-30 border-2 border-dashed border-border rounded-xl">
                    <p className="text-xs font-bold uppercase">Sin cierres registrados</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Attention Time Chart (Technicians) */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div>
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Rendimiento Técnico Individual</p>
              <p className="font-black text-base text-foreground">Tiempo promedio de resolución por técnico <span className="text-[10px] text-muted-foreground font-normal">(en minutos)</span></p>
            </div>
            <div className="mt-4">
              {analytics.avgTechAttentionTimeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(120, analytics.avgTechAttentionTimeData.length * 35)}>
                  <BarChart data={analytics.avgTechAttentionTimeData} layout="vertical" barSize={15} margin={{ top: 10, right: 60, left: 20, bottom: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold' }} width={120} tickLine={false} axisLine={false} />
                    <Tooltip content={<CTooltip />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {analytics.avgTechAttentionTimeData.map((e: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                      <LabelList dataKey="value" position="right" fontSize={10} fontWeight="bold" fill="hsl(var(--foreground))" formatter={(v: number) => `${v} min`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[120px] flex items-center justify-center opacity-30 border-2 border-dashed border-border rounded-xl">
                  <p className="text-xs font-bold uppercase">Sin datos de técnicos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
