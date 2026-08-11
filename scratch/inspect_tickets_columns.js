import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkColumns() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'tickets';
  `);
  console.log('📋 COLUMNAS DE LA TABLA tickets:', rows.map(r => r.column_name));
  await pool.end();
}

checkColumns();
