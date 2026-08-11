import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parsear .env
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }
});

const url = env['VITE_SUPABASE_URL'];
const key = env['VITE_SUPABASE_ANON_KEY'];

if (!url || !key) {
  console.error("Missing supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

const tables = [
  'usuarios',
  'call_centers',
  'roles',
  'modulos',
  'acciones',
  'permisos',
  'permisos_rol',
  'estados_ticket',
  'categorias_problema',
  'tipos_problema',
  'soluciones',
  'roles_usuario',
  'turnos',
  'horarios',
  'tareas',
  'asignados_tarea',
  'tickets'
];

const dir = path.join(process.cwd(), 'database_backup_prod');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

async function run() {
  console.log("🚀 Iniciando extracción de datos de Producción en español...");
  for (const table of tables) {
    console.log(`Descargando tabla: ${table}...`);
    let allData = [];
    let from = 0;
    let step = 1000;
    while (true) {
        const { data, error } = await supabase.from(table).select('*').range(from, from + step - 1);
        if (error) {
            console.error(`❌ Error al descargar ${table}:`, error.message);
            break;
        }
        if (data && data.length > 0) {
            allData.push(...data);
            if (data.length < step) break;
            from += step;
        } else {
            break;
        }
    }
    fs.writeFileSync(path.join(dir, `${table}.json`), JSON.stringify(allData));
    console.log(`💾 Guardados ${allData.length} registros para ${table}.json`);
  }
  console.log("🎉 Respaldo completo finalizado de forma segura.");
}

run();
