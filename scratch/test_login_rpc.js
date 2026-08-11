import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function testLoginLogic() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString });

  try {
    const emailInput = 'admin@admin.com';
    const passwordInput = 'admin';

    console.log(`🔍 Probando proceso de login con: email="${emailInput}", password="${passwordInput}"\n`);

    // 1. Buscar usuario por email (LOWER)
    const { rows } = await pool.query(
      'SELECT id, nombre_completo, email, telefono, url_avatar, esta_activo, password, debe_cambiar_password FROM public.usuarios WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [emailInput]
    );

    if (rows.length === 0) {
      console.error('❌ Resultado: No se encontró ningún usuario con ese email.');
      return;
    }

    const user = rows[0];
    console.log('✅ Usuario encontrado en la tabla public.usuarios:');
    console.log(`- ID: ${user.id}`);
    console.log(`- Nombre: ${user.nombre_completo}`);
    console.log(`- Email en BD: ${user.email}`);
    console.log(`- Está Activo: ${user.esta_activo}`);
    console.log(`- Hash almacenado: ${user.password}\n`);

    // 2. Verificar contraseña con Bcrypt
    const isBcrypt = user.password && user.password.startsWith('$2');
    console.log(`🔐 Formato de contraseña en BD: ${isBcrypt ? 'Hash Bcrypt ($2...)' : 'Texto Plano'}`);

    let valid = false;
    if (isBcrypt) {
      valid = await bcrypt.compare(passwordInput, user.password);
    } else {
      valid = (user.password === passwordInput);
    }

    console.log(`👉 ¿Contraseña válida?: ${valid ? '✅ SÍ' : '❌ NO'}\n`);

    if (!valid) {
      console.error('❌ El hash almacenado NO coincide con la contraseña "admin".');
      
      // Vamos a forzar la actualización del hash de 'admin@admin.com' inmediatamente
      const newHash = await bcrypt.hash(passwordInput, 10);
      await pool.query('UPDATE public.usuarios SET password = $1, esta_activo = true WHERE id = $2', [newHash, user.id]);
      console.log('✨ ¡Se acaba de re-escribir el hash Bcrypt para "admin" en la BD!');
    }

    // 3. Probar la consulta de roles y permisos
    const { rows: rRows } = await pool.query(`
      SELECT 
        r.id AS rol_id,
        r.nombre AS rol_nombre,
        r.descripcion AS rol_descripcion,
        m.nombre AS modulo,
        a.nombre AS accion
      FROM public.roles_usuario ru
      JOIN public.roles r ON ru.rol_id = r.id
      LEFT JOIN public.permisos_rol pr ON r.id = pr.rol_id
      LEFT JOIN public.permisos p ON pr.permiso_id = p.id
      LEFT JOIN public.modulos m ON p.modulo_id = m.id
      LEFT JOIN public.acciones a ON p.accion_id = a.id
      WHERE ru.usuario_id = $1 AND r.esta_activo = true;
    `, [user.id]);

    console.log(`🛡️ Roles y permisos encontrados (${rRows.length} filas asociadas al usuario):`);
    console.table(rRows.slice(0, 5));

  } catch (err) {
    console.error('❌ Error testing login:', err);
  } finally {
    await pool.end();
  }
}

testLoginLogic();
