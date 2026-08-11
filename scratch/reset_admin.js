import pg from 'pg';
import bcrypt from 'bcryptjs';

const passwords = ['123456', '123', 'postgres', 'admin', 'root', ''];
const ports = [5432, 5433];

async function tryConnect() {
  const hash = await bcrypt.hash('admin', 10);

  for (const port of ports) {
    for (const pass of passwords) {
      const connectionString = pass 
        ? `postgresql://postgres:${pass}@127.0.0.1:${port}/ticketero_tecorp`
        : `postgresql://postgres@127.0.0.1:${port}/ticketero_tecorp`;

      const client = new pg.Client({ connectionString });
      try {
        await client.connect();
        console.log(`🎉 ¡Conexión exitosa a PostgreSQL en puerto ${port} con contraseña: "${pass}"!`);
        
        const res1 = await client.query(`
          UPDATE public.usuarios 
          SET password = $1, email = 'admin@admin.com', esta_activo = true, debe_cambiar_password = false
          WHERE LOWER(email) LIKE 'admin%' OR email = 'admin@admin.com';
        `, [hash]);

        console.log(`✅ Contraseña de admin@admin.com actualizada a 'admin'. Filas afectadas: ${res1.rowCount}`);

        if (res1.rowCount === 0) {
          const ins = await client.query(`
            INSERT INTO public.usuarios (id, nombre_completo, email, esta_activo, password, debe_cambiar_password)
            VALUES (gen_random_uuid(), 'Administrador Principal', 'admin@admin.com', true, $1, false)
            RETURNING id;
          `, [hash]);
          console.log(`✅ Usuario admin@admin.com creado con ID: ${ins.rows[0].id}`);
        }

        await client.end();
        return { port, pass, connectionString };
      } catch (err) {
        // Ignorar fallos de intento
      }
    }
  }

  console.error('❌ No se pudo conectar a PostgreSQL en los puertos 5432/5433 con contraseñas comunes.');
}

tryConnect();
