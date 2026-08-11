import { useState } from "react";
import { Download, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Export = () => {
  const [isExporting, setIsExporting] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(todayStr);
  const [fechaFin, setFechaFin] = useState(todayStr);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 1. Obtener datos maestros para mapeo
      const [usuariosRes] = await Promise.all([
        supabase.from('usuarios').select('id, nombre_completo'),
      ]);

      const mapaTecnicos = new Map<string, string>();
      usuariosRes.data?.forEach(u => mapaTecnicos.set(u.id, u.nombre_completo));

      // 2. Filtro de fechas basado en el rango seleccionado
      const startDate = new Date(`${fechaInicio}T00:00:00`).toISOString();
      const endDate = new Date(`${fechaFin}T23:59:59`).toISOString();

      // 3. Obtener tickets del rango de fechas con Paginación (para superar límite de 1000 de Supabase)
      let ticketsBrutos: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;

      while (hasMore) {
        const { data: ticketsChunk, error: errorCarga } = await supabase
          .from('tickets')
          .select(`
            id,
            numero_ticket,
            tipos_problema(nombre),
            call_centers(nombre),
            descripcion,
            creado_en,
            fecha_asignacion,
            fecha_cierre,
            puesto_trabajo,
            modalidad_trabajo,
            nombre_solicitante,
            tecnico_asignado_id,
            soluciones(titulo),
            estados_ticket(nombre)
          `)
          .gte('creado_en', startDate)
          .lte('creado_en', endDate)
          .order('creado_en', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (errorCarga) throw errorCarga;

        if (ticketsChunk && ticketsChunk.length > 0) {
          ticketsBrutos = [...ticketsBrutos, ...ticketsChunk];
          page++;
          // Si trajo menos de 1000, significa que ya no hay más páginas
          if (ticketsChunk.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      if (!ticketsBrutos || ticketsBrutos.length === 0) {
        toast.info("No se encontraron tickets en el rango seleccionado.");
        setIsExporting(false);
        return;
      }

      // 4. Agrupar los tickets por Call Center y guardar un consolidado
      const ticketsPorCC: Record<string, any[]> = {};
      const todosLosTickets: any[] = []; // Array global para la pestaña "Todos"

      ticketsBrutos.forEach(t => {
        const ccName = (t.call_centers as any)?.nombre || "Sin Call Center";
        
        if (!ticketsPorCC[ccName]) {
          ticketsPorCC[ccName] = [];
        }

        const ticketData = {
          "Call Center": ccName, // Útil para la pestaña global
          "Fecha Creación": new Date(t.creado_en).toLocaleString('es-ES'),
          "Fecha Asignación": t.fecha_asignacion ? new Date(t.fecha_asignacion).toLocaleString('es-ES') : "Pendiente",
          "Fecha Finalización": t.fecha_cierre ? new Date(t.fecha_cierre).toLocaleString('es-ES') : "N/A",
          "Tipo Problema": (t.tipos_problema as any)?.nombre || "General",
          "Solicitante": t.nombre_solicitante || "Anónimo",
          "Puesto": t.puesto_trabajo || "No especificado",
          "Modalidad": t.modalidad_trabajo || "Presencial",
          "Técnico Asignado": t.tecnico_asignado_id ? (mapaTecnicos.get(t.tecnico_asignado_id) || "Desconocido") : "Sin Asignar",
          "Estado": (t.estados_ticket as any)?.nombre || "Pendiente",
          "Solución": (t.soluciones as any)?.titulo || "N/A",
          "Descripción": t.descripcion || ""
        };

        ticketsPorCC[ccName].push(ticketData);
        todosLosTickets.push(ticketData);
      });

      // 5. Crear el libro de Excel (Workbook)
      const libroTrabajo = XLSX.utils.book_new();

      // 6. Añadir primero la pestaña de "Todos"
      const hojaTodos = XLSX.utils.json_to_sheet(todosLosTickets);
      hojaTodos['!cols'] = [
        { wch: 20 }, // Call Center
        { wch: 22 }, // Fecha Creación
        { wch: 22 }, // Fecha Asignación
        { wch: 22 }, // Fecha Finalización
        { wch: 25 }, // Tipo Problema
        { wch: 25 }, // Solicitante
        { wch: 15 }, // Puesto
        { wch: 15 }, // Modalidad
        { wch: 25 }, // Técnico Asignado
        { wch: 15 }, // Estado
        { wch: 30 }, // Solución
        { wch: 50 }, // Descripción
      ];
      XLSX.utils.book_append_sheet(libroTrabajo, hojaTodos, "TODOS");

      // 7. Iterar por cada Call Center y crear sus propias pestañas
      Object.keys(ticketsPorCC).forEach(ccName => {
        const datosExcel = ticketsPorCC[ccName];
        const hojaTrabajo = XLSX.utils.json_to_sheet(datosExcel);
        
        // Configurar el ancho de las columnas para que sea legible
        hojaTrabajo['!cols'] = [
          { wch: 20 }, // Call Center
          { wch: 22 }, // Fecha Creación
          { wch: 22 }, // Fecha Asignación
          { wch: 22 }, // Fecha Finalización
          { wch: 25 }, // Tipo Problema
          { wch: 25 }, // Solicitante
          { wch: 15 }, // Puesto
          { wch: 15 }, // Modalidad
          { wch: 25 }, // Técnico Asignado
          { wch: 15 }, // Estado
          { wch: 30 }, // Solución
          { wch: 50 }, // Descripción
        ];

        // Limpiar el nombre del Call Center para que sea un nombre de hoja válido en Excel
        // Máximo 31 caracteres y sin caracteres especiales
        const sheetName = ccName.replace(/[\\/?*[\]]/g, '').substring(0, 31);
        
        // Añadir la hoja al libro
        XLSX.utils.book_append_sheet(libroTrabajo, hojaTrabajo, sheetName);
      });

      // 8. Exportar y descargar
      const fileName = `Reporte_Tickets_${fechaInicio}_al_${fechaFin}.xlsx`;
      
      XLSX.writeFile(libroTrabajo, fileName);

      toast.success("Exportación completada", {
        description: `Se han exportado los tickets agrupados en ${Object.keys(ticketsPorCC).length} Call Centers.`
      });

    } catch (error) {
      console.error("Error en la exportación:", error);
      toast.error("Error al exportar los datos. Revisa la consola.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] p-4">
      <Card className="w-full max-w-md border-none shadow-xl bg-card/50 ring-1 ring-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <Download className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Reporte Mensual General</CardTitle>
          <CardDescription>
            Genera un archivo Excel único con todos los tickets del periodo, separados por pestañas según el Call Center.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Fecha Inicio
              </label>
              <Input 
                type="date" 
                value={fechaInicio} 
                onChange={(e) => setFechaInicio(e.target.value)} 
                className="bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Fecha Fin
              </label>
              <Input 
                type="date" 
                value={fechaFin} 
                onChange={(e) => setFechaFin(e.target.value)} 
                className="bg-background"
              />
            </div>
          </div>

          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="w-full font-bold h-12 gap-2 mt-4"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Procesando Datos...
              </>
            ) : (
              <>
                Descargar Excel
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Export;
