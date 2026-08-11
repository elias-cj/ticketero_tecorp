import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function inspectDB() {
  const connectionString = process.env.DATABASE_URL;
  console.log(`Conectando a la base de datos PostgreSQL: ${connectionString.replace(/:[^:@]+@/, ':****@')}\n`);
  
  const pool = new pg.Pool({ connectionString });

  try {
    // 1. Información del servidor y base de datos
    const dbInfo = await pool.query("SELECT current_database(), current_user, version();");
    console.log('📌 INFORMACIÓN DE CONEXIÓN:');
    console.log(`- Base de datos: ${dbInfo.rows[0].current_database}`);
    console.log(`- Usuario activo: ${dbInfo.rows[0].current_user}`);
    console.log(`- Versión PostgreSQL: ${dbInfo.rows[0].version}\n`);

    // 2. Listado de tablas en el esquema public
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(`📋 TABLAS ENCONTRADAS EN 'public' (${tablesRes.rows.length} tablas):`);
    for (const row of tablesRes.rows) {
      const countRes = await pool.query(`SELECT COUNT(*) AS total FROM public."${row.table_name}";`);
      console.log(`   • ${row.table_name.padEnd(25)} : ${countRes.rows[0].total} registros`);
    }
    console.log('');

    // 3. Inspeccionar usuarios registrados
    const usersRes = await pool.query(`
      SELECT id, nombre_completo, email, esta_activo, debe_cambiar_password, creado_en 
      FROM public.usuarios 
      ORDER BY creado_en DESC
      LIMIT 10;
    `);

    console.log(`👤 USUARIOS REGISTRADOS EN LA BASE DE DATOS (Muestra de ${usersRes.rows.length}):`);
    console.table(usersRes.rows.map(u => ({
      ID: u.id,
      Nombre: u.nombre_completo,
      Email: u.email,
      Activo: u.esta_activo ? 'Sí' : 'No',
      'Cambiar Pass': u.debe_cambiar_password ? 'Sí' : 'No'
    })));

  } catch (err) {
    console.error('❌ Error de inspección de BD:', err.message);
  } finally {
    await pool.end();
  }
}

inspectDB();
