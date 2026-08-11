import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'database_backup_prod');
const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));

console.log("=== INSPECCIÓN DE COLUMNAS EN RESPALDO JSON ===");
files.forEach(file => {
  const table = file.replace('.json', '');
  const filePath = path.join(BACKUP_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  if (data && data.length > 0) {
    const keys = Object.keys(data[0]);
    console.log(`Tabla: ${table}`);
    console.log(`  Columnas: ${keys.join(', ')}`);
  } else {
    console.log(`Tabla: ${table} (Vacía)`);
  }
});
