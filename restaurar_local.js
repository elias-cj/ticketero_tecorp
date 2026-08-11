import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parsear .env
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const url = process.env.VITE_SUPABASE_URL || env['VITE_SUPABASE_URL'];
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceRoleKey) {
  console.error("❌ Falta SUPABASE_SERVICE_KEY o VITE_SUPABASE_URL local.");
  process.exit(1);
}

console.log(`📡 Conectándose a Supabase URL: ${url}`);

// Crear cliente con service_role key para tener bypass de RLS
const supabase = createClient(url, serviceRoleKey);
const BACKUP_DIR = path.join(process.cwd(), 'database_backup_prod');

// Tablas ordenadas estrictamente por dependencias (llaves foráneas) para evitar colisiones
const tables = [
  // 1. Catálogos independientes y usuarios base
  'call_centers',
  'roles',
  'modulos',
  'acciones',
  'estados_ticket',
  'prioridades_ticket',
  'categorias_problema',
  'soluciones',
  'turnos',
  'usuarios',
  
  // 2. Tablas secundarias con dependencias de nivel 1
  'permisos',
  'tipos_problema',
  'detalles_tecnico',
  'roles_usuario',
  'horarios',
  
  // 3. Tablas con dependencias compuestas
  'permisos_rol',
  'tareas',
  'asignados_tarea',
  
  // 4. Tabla principal (tickets)
  'tickets'
];

async function run() {
  console.log("🚀 Iniciando restauración de datos en base de datos Local...");
  
  for (const table of tables) {
    const filePath = path.join(BACKUP_DIR, `${table}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Archivo no encontrado para ${table}, saltando.`);
      continue;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!data || data.length === 0) {
      console.log(`ℹ️ La tabla ${table} está vacía, saltando.`);
      continue;
    }
    
    console.log(`Sembrando tabla ${table}: insertando ${data.length} registros...`);
    
    // Insertamos los datos en lotes de 100 registros para evitar sobrecargas
    const BATCH_SIZE = 100;
    let insertados = 0;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from(table).upsert(batch);
      if (error) {
        console.error(`  ❌ Error insertando lote en ${table}:`, error.message);
      } else {
        insertados += batch.length;
      }
    }
    console.log(`  ✅ ${table}: ${insertados}/${data.length} registros restaurados.`);
  }
  
  console.log("\n🎉 ¡Sembrado de datos locales finalizado con éxito!");
}

run();
