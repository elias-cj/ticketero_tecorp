import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testTicketsQuery() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const sql = `
      SELECT 
        t.id, t.numero_ticket, t.titulo, t.descripcion, t.estado_id, t.prioridad_id, t.tipo_problema_id,
        t.solucion_id, t.centro_contacto_id, t.solicitante_id, t.tecnico_asignado_id, t.creado_en, t.actualizado_en,
        t.extension, t.puesto_trabajo, t.modalidad_trabajo, t.ip_vpn, t.nombre_solicitante, t.registro_estado,
        t.fecha_asignacion, t.fecha_cierre, t.escalados,
        CASE WHEN et.id IS NOT NULL THEN json_build_object('nombre', et.nombre) ELSE NULL END AS estados_ticket,
        CASE WHEN tp.id IS NOT NULL THEN json_build_object('nombre', tp.nombre) ELSE NULL END AS tipos_problema,
        CASE WHEN u.id IS NOT NULL THEN json_build_object('nombre_completo', u.nombre_completo) ELSE NULL END AS tecnico,
        CASE WHEN cc.id IS NOT NULL THEN json_build_object('nombre', cc.nombre, 'pais', cc.pais) ELSE NULL END AS call_centers
      FROM public.tickets t
      LEFT JOIN public.estados_ticket et ON et.id = t.estado_id
      LEFT JOIN public.tipos_problema tp ON tp.id = t.tipo_problema_id
      LEFT JOIN public.usuarios u ON u.id = t.tecnico_asignado_id
      LEFT JOIN public.call_centers cc ON cc.id = t.centro_contacto_id
      ORDER BY t.creado_en DESC
      LIMIT 3;
    `;

    const { rows } = await pool.query(sql);
    console.log('✅ Muestra de 3 tickets formateados con relaciones JSON:');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('❌ Error testing tickets query:', err.message);
  } finally {
    await pool.end();
  }
}

testTicketsQuery();
