import dotenv from 'dotenv';
import { createExpressApp } from './server/infrastructure/http/routes/index.js';

dotenv.config();

const PORT = process.env.PORT || 3001;

try {
  const app = createExpressApp();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor SupportConnect corriendo en Arquitectura Limpia en http://localhost:${PORT}`);
  });
} catch (error) {
  console.error('❌ Error al iniciar el servidor SupportConnect:', error.message);
  process.exit(1);
}
