import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Conectando a BD...');
  const pool = new pg.Pool({ connectionString });

  try {
    const hash = await bcrypt.hash('admin', 10);

    const res = await pool.query(`
      UPDATE public.usuarios 
      SET password = $1, esta_activo = true, debe_cambiar_password = false
      WHERE LOWER(email) = 'admin@admin.com';
    `, [hash]);

    console.log(`✅ Contraseña del usuario del sistema (admin@admin.com) actualizada a 'admin'. (Filas afectadas: ${res.rowCount})`);

    const userCheck = await pool.query("SELECT id, email, esta_activo, password FROM public.usuarios WHERE LOWER(email) = 'admin@admin.com';");
    console.log('👤 Usuario en BD:', userCheck.rows[0]);

  } catch (err) {
    console.error('❌ Error al actualizar contraseña:', err.message);
  } finally {
    await pool.end();
  }
}

main();
