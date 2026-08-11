import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const url = 'http://localhost:54321';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const BACKUP_DIR = path.join(process.cwd(), 'database_backup_prod');

const supabase = createClient(url, serviceRoleKey);

async function run() {
  console.log('🔧 Reparando tablas: permisos y permisos_rol...\n');

  // --- 1. Permisos (deduplicar por modulo_id + accion_id) ---
  const permisosRaw = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'permisos.json'), 'utf-8'));
  const seen = new Set();
  const permisos = permisosRaw.filter(r => {
    const key = `${r.modulo_id}-${r.accion_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`permisos: ${permisosRaw.length} originales → ${permisos.length} únicos`);

  // Truncar y reinsertar limpio
  const { error: truncErr } = await supabase.rpc('truncate_table', { table_name: 'permisos' }).maybeSingle();
  
  // Usando SQL directo vía rpc no está disponible, insertamos con upsert ignorando
  // Primero borramos todo para insertar limpio
  await supabase.from('permisos_rol').delete().neq('rol_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('permisos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('🗑️ Tablas permisos y permisos_rol limpiadas.');

  const BATCH = 100;
  let ok = 0;
  for (let i = 0; i < permisos.length; i += BATCH) {
    const batch = permisos.slice(i, i + BATCH);
    const { error } = await supabase.from('permisos').insert(batch);
    if (error) console.error(`  ❌ Error en permisos lote ${i}:`, error.message);
    else ok += batch.length;
  }
  console.log(`  ✅ permisos: ${ok}/${permisos.length} insertados\n`);

  // --- 2. permisos_rol ---
  const permisosRol = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'permisos_rol.json'), 'utf-8'));

  // Obtener los IDs de permisos que realmente se insertaron
  const { data: permisosInsertados } = await supabase.from('permisos').select('id');
  const permisosIds = new Set(permisosInsertados.map(p => p.id));
  
  // Filtrar solo los permisos_rol cuyos permiso_id existen
  const permisosRolValidos = permisosRol.filter(r => permisosIds.has(r.permiso_id));
  console.log(`permisos_rol: ${permisosRol.length} originales → ${permisosRolValidos.length} con FK válida`);

  let ok2 = 0;
  for (let i = 0; i < permisosRolValidos.length; i += BATCH) {
    const batch = permisosRolValidos.slice(i, i + BATCH);
    const { error } = await supabase.from('permisos_rol').insert(batch);
    if (error) console.error(`  ❌ Error en permisos_rol lote ${i}:`, error.message);
    else ok2 += batch.length;
  }
  console.log(`  ✅ permisos_rol: ${ok2}/${permisosRolValidos.length} insertados\n`);

  console.log('🎉 ¡Reparación completada!');
}

run();
