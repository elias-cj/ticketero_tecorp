import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testUpdate() {
  try {
    const stRes = await pool.query("SELECT id FROM me_estados_ticket WHERE LOWER(nombre) LIKE '%cerrado%' LIMIT 1").catch(() => pool.query("SELECT id FROM estados_ticket WHERE LOWER(nombre) LIKE '%cerrado%' LIMIT 1"));
    const solRes = await pool.query("SELECT id FROM soluciones LIMIT 1");
    
    console.log('Status ID:', stRes.rows[0]?.id);
    console.log('Solution ID:', solRes.rows[0]?.id);

    const ticketRes = await pool.query("SELECT id, estado_id, solucion_id, descripcion_solucion FROM tickets LIMIT 1");
    console.log('Sample ticket:', ticketRes.rows[0]);

    if (ticketRes.rows[0]) {
      const ticketId = ticketRes.rows[0].id;
      const res = await pool.query(
        'UPDATE public.tickets SET "estado_id" = $1, "solucion_id" = $2, "descripcion_solucion" = $3, "fecha_cierre" = $4 WHERE "id" = $5 RETURNING *',
        [stRes.rows[0]?.id, solRes.rows[0]?.id, 'Prueba de solucion', new Date().toISOString(), ticketId]
      );
      console.log('Updated rows count:', res.rowCount);
    }
  } catch (e) {
    console.error('PG ERROR:', e);
  } finally {
    pool.end();
  }
}
testUpdate();
