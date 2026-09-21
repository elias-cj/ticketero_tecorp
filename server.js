import dotenv from 'dotenv';
import { createExpressApp } from './server/infrastructure/http/routes/index.js';
import { pool } from './server/infrastructure/database/db.js';
import { initDatabase } from './server/infrastructure/database/initDb.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

try {
  await initDatabase();
  const app = createExpressApp();
  const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor SupportConnect corriendo en Arquitectura Limpia en http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n⏳ Recibida señal ${signal}. Cerrando servidor SupportConnect limpiamente...`);
    server.close(async () => {
      console.log('✅ Servidor HTTP cerrado.');
      try {
        await pool.end();
        console.log('✅ Conexiones a base de datos cerradas.');
      } catch (err) {
        console.error('Error al cerrar el pool de base de datos:', err.message);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
} catch (error) {
  console.error('❌ Error al iniciar el servidor SupportConnect:', error.message);
  process.exit(1);
}
