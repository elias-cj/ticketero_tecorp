import pg from 'pg';
import bcrypt from 'bcryptjs';

const candidates = [
  'root',
  'postgres',
  '123456',
  '123',
  'admin',
  'Memo_13031995',
  'secret',
  '1234',
  'password',
  'laragon'
];

async function findPassword() {
  const hash = await bcrypt.hash('Memo_13031995', 10);

  for (const pass of candidates) {
    const client = new pg.Client({
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      password: String(pass),
      database: 'ticketero_tecorp'
    });

    try {
      await client.connect();
      console.log(`\n🎉 ¡¡CONEXIÓN EXITOSA!! La contraseña de tu PostgreSQL local es: "${pass}"`);

      // Actualizar admin@admin.com con la contraseña Memo_13031995
      const res = await client.query(`
        UPDATE public.usuarios 
        SET password = $1, esta_activo = true, debe_cambiar_password = false
        WHERE LOWER(email) = 'admin@admin.com';
      `, [hash]);

      console.log(`✅ Contraseña del usuario admin@admin.com en la BD establecida a 'Memo_13031995'. (Filas actualizadas: ${res.rowCount})`);

      await client.end();
      return { pass };
    } catch (err) {
      // Continuar buscando
    }
  }

  console.log('\n⚠️ No se encontró la contraseña en la lista de contraseñas comunes.');
}

findPassword();
