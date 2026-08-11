import pg from 'pg';
import bcrypt from 'bcryptjs';

async function main() {
  // Configuración directa de conexión a PostgreSQL sin contraseña
  const pool = new pg.Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'ticketero_tecorp'
  });

  try {
    const res = await pool.query('SELECT current_database(), current_user;');
    console.log('✅ Conexión exitosa a PostgreSQL:', res.rows[0]);

    // Generar hash para Memo_13031995
    const hash = await bcrypt.hash('Memo_13031995', 10);

    const updateRes = await pool.query(`
      UPDATE public.usuarios 
      SET password = $1, esta_activo = true, debe_cambiar_password = false
      WHERE LOWER(email) = 'admin@admin.com';
    `, [hash]);

    console.log(`✅ Contraseña de admin@admin.com actualizada a 'Memo_13031995'. Filas afectadas: ${updateRes.rowCount}`);

    const userRes = await pool.query("SELECT id, email, esta_activo, password FROM public.usuarios WHERE LOWER(email) = 'admin@admin.com';");
    console.log('👤 Datos de usuario admin:', userRes.rows[0]);

  } catch (err) {
    console.error('❌ Error de conexión/query:', err.message);
  } finally {
    await pool.end();
  }
}

main();
