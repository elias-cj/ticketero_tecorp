import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const { rows } = await pool.query('SELECT id, numero_ticket, descripcion_solucion FROM tickets WHERE descripcion_solucion IS NOT NULL LIMIT 5');
  console.log('Tickets con descripcion_solucion en PostgreSQL:', rows);
  await pool.end();
}

check().catch(console.error);
