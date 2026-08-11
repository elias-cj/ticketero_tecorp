import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse .env
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
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
  'profiles', 'call_centers', 'tickets', 'tasks', 'schedules',
  'company_info', 'roles', 'user_roles', 'audit_logs', 'inventory',
  'licenses', 'soporte_tecnico', 'it_especializado', 'solutions',
  'modules', 'actions', 'permissions', 'role_permissions', 'task_assignees'
];

const dir = path.join(process.cwd(), 'database_backup', '2026-04-20');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

async function run() {
  for (const table of tables) {
    console.log(`Backing up ${table}...`);
    let allData = [];
    let from = 0;
    let step = 1000;
    while (true) {
        const { data, error } = await supabase.from(table).select('*').range(from, from + step - 1);
        if (error) {
            console.error(`Error fetching ${table}:`, error);
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
    console.log(`Saved ${allData.length} records to ${table}.json`);
  }
  console.log("Backup complete.");
}

run();
