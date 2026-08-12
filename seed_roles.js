import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SPEC = {
  'Administrador Supremo': {
    'Call Centers': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR'],
    'Cola IT': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR'],
    'Configuración': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR'],
    'Dashboard': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR'],
    'Exportación': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR'],
    'Horarios': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR'],
    'Inventario': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR'],
    'Licencias': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR'],
    'Roles': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR'],
    'Soluciones': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR'],
    'Tareas': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR'],
    'Tickets': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR'],
    'Usuarios': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR'],
    'Tipos de Problema': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'LLAMAR']
  },
  'BI': {
    'Exportación': ['VER']
  },
  'it': {
    'Call Centers': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Dashboard': ['VER'],
    'Exportación': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Soluciones': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Tickets': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Tipos de Problema': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR']
  },
  'Técnico de Soporte': {
    'Call Centers': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Cola IT': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Dashboard': ['VER'],
    'Horarios': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Inventario': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Soluciones': ['VER'],
    'Tareas': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Tickets': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR']
  },
  'Usuario Autorizado': {
    'Dashboard': ['VER'],
    'Exportación': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Soluciones': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Tickets': ['VER'],
    'Tipos de Problema': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR']
  },
  'semiadm': {
    'Call Centers': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Dashboard': ['VER'],
    'Exportación': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Soluciones': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Tickets': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR'],
    'Tipos de Problema': ['VER', 'CREAR', 'EDITAR', 'ELIMINAR']
  }
};

async function seedDefaultPermissions() {
  const roles = (await pool.query('SELECT id, nombre FROM roles')).rows;
  const modulos = (await pool.query('SELECT id, nombre FROM modulos')).rows;
  const acciones = (await pool.query('SELECT id, nombre FROM acciones')).rows;

  const modMap = {};
  modulos.forEach(m => modMap[m.nombre] = m.id);

  const actMap = {};
  acciones.forEach(a => actMap[a.nombre] = a.id);

  for (const r of roles) {
    const roleSpec = SPEC[r.nombre];
    if (!roleSpec) continue;

    console.log('Sembrando permisos para rol:', r.nombre);

    for (const [modName, actNames] of Object.entries(roleSpec)) {
      const modId = modMap[modName];
      if (!modId) {
        console.warn('  Módulo no encontrado:', modName);
        continue;
      }

      for (const actName of actNames) {
        const actId = actMap[actName];
        if (!actId) {
          console.warn('  Acción no encontrada:', actName);
          continue;
        }

        let pRes = await pool.query('SELECT id FROM permisos WHERE modulo_id = $1 AND accion_id = $2', [modId, actId]);
        let permId = pRes.rows[0] ? pRes.rows[0].id : null;

        if (!permId) {
          pRes = await pool.query('INSERT INTO permisos (modulo_id, accion_id) VALUES ($1, $2) RETURNING id', [modId, actId]);
          permId = pRes.rows[0].id;
        }

        await pool.query('INSERT INTO permisos_rol (rol_id, permiso_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [r.id, permId]);
      }
    }
  }

  console.log('✅ Permisos sembrados exitosamente.');
  pool.end();
}

seedDefaultPermissions().catch(e => console.error(e));
