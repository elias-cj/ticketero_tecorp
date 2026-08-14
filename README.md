# 🎧 TECORP SupportConnect — Centro de Monitoreo y Gestión de Tickets Multi-Site

**SupportConnect** es una plataforma enterprise de gestión centralizada de incidencias, soporte técnico y monitoreo operativo en tiempo real para centros de contacto (call centers) multinacionales.

---

## 🚀 Características Principales

- **📊 Terminal de Monitoreo & Tickets**: Gestión multinivel de tickets por estado, prioridad, call center y técnico asignado con actualización continua.
- **🖥️ Cola IT Especializada**: Separación fluida entre tickets de soporte general e incidencias escaladas de infraestructura y redes mediante transacciones atómicas PostgreSQL.
- **🔐 Control de Acceso Basado en Roles (RBAC 3FN)**: Matriz de permisos 100% dinámica validada en el backend contra PostgreSQL (Módulos y Acciones configurables).
- **📦 Inventario de Equipos**: Trazabilidad y control de laptops, desktops, servidores y accesorios por ubicación y asignación.
- **🔑 Gestión de Licencias de Software**: Control de claves de producto, proveedores, cantidades usadas y alertas de vencimiento.
- **📅 Horarios y Turnos**: Planificación de turnos de soporte técnico por especialista.
- **📚 Base de Conocimiento y Soluciones**: Catálogo de soluciones frecuentes e incidencias resueltas para acelerar el SLA de atención.
- **📜 Auditoría Operativa**: Historial con registro de fecha, hora y usuario para cada modificación de datos en el sistema.

---

## 🛠️ Stack Tecnológico

### **Frontend**
- **Framework**: React 18 + TypeScript + Vite (con code-splitting modular)
- **Estilos**: TailwindCSS + Radix UI + Lucide Icons + Framer Motion
- **Gestión de Estado**: TanStack React Query + React Router v6

### **Backend & API (Clean Architecture)**
- **Servidor**: Node.js + Express.js en Arquitectura Limpia
- **Seguridad**: Autenticación JWT (`HS256`) + Bcryptjs + Validaciones Zod + Middleware RBAC estricto
- **Persistencia**: PostgreSQL 18 nativo mediante pool de conexiones parametrizado (`pg`)
- **Resiliencia**: Graceful Shutdown para drenado ordenado de conexiones ante `SIGTERM`/`SIGINT`

---

## 📂 Estructura del Proyecto

```text
support-connect/
├── server/                    # Backend en Arquitectura Limpia
│   ├── domain/                # Entidades puras, errores de dominio y contratos (Ports)
│   ├── use-cases/             # Casos de uso de negocio (Tickets, Auth, Permisos)
│   ├── adapters/              # Controllers HTTP y Repositorios PostgreSQL (pg)
│   └── infrastructure/        # Express app, Database Pool, Middlewares de Seguridad
├── src/                       # Frontend (React 18 + TypeScript)
│   ├── components/            # Componentes UI reutilizables
│   ├── contexts/              # AuthContext y SystemContext
│   ├── features/              # Módulos de la aplicación (Tickets, Hooks)
│   ├── hooks/                 # Hooks de permisos y analítica
│   ├── pages/                 # Vistas principales del sistema
│   └── types/                 # Definiciones de tipos TypeScript
├── database_backup_prod/      # Esquemas DDL, triggers e índices PostgreSQL
├── server.js                  # Punto de entrada del servidor Node.js
├── nginx.conf                 # Configuración de Nginx para producción
├── vite.config.ts             # Configuración de Vite y empaquetado Rollup
└── package.json               # Dependencias y scripts de construcción
```

---

## 💻 Configuración para Desarrollo Local

### **Requisitos Previos**
- **Node.js**: `v18.x` o superior
- **PostgreSQL**: `v14.x` / `v16.x` / `v18.x`
- Gestor de paquetes `npm`

### **1. Clonar e Instalar Dependencias**
```bash
git clone <URL_DEL_REPOSITORIO>
cd support-connect
npm install
```

### **2. Configurar Variables de Entorno (`.env`)**
Crea un archivo `.env` en la raíz del proyecto:

```env
# Puerto del servidor backend Express
PORT=3001

# Conexión a la base de datos PostgreSQL 18
DATABASE_URL=postgresql://postgres:password_local@127.0.0.1:5432/ticketero_tecorp

# Clave secreta JWT (mínimo 32 caracteres)
JWT_SECRET=tu_clave_secreta_jwt_de_al_menos_32_caracteres_super_segura

# Orígenes CORS permitidos (separados por coma)
CLIENT_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173

# Conexión del cliente Frontend a la API
VITE_SUPABASE_URL=http://127.0.0.1:3001
VITE_SUPABASE_ANON_KEY=public-client-key
```

### **3. Iniciar en Modo Desarrollo**
```bash
# Terminal 1: Servidor API Backend
npm run api 

# Alternativa a npm run api :
node server.js

# Terminal 2: Servidor Frontend Vite
npm run dev
```

---

## 🚀 Guía Detallada de Despliegue en Producción

El despliegue en producción recomendado utiliza **Ubuntu Server / Debian** con **PostgreSQL 18**, **Node.js (PM2)** y **Nginx** como Reverse Proxy con SSL/TLS (HTTPS).

```
  Internet (HTTPS:443)
          │
          ▼
    ┌───────────┐
    │   Nginx   │─── Serve /dist ────► Assets Estáticos Frontend (SPA)
    └─────┬─────┘
          │ (Reverse Proxy :3001)
          ▼
    ┌───────────┐
    │  Node.js  │ (server.js administrado por PM2)
    │  Express  │
    └─────┬─────┘
          │ (Pool TCP :5432)
          ▼
    ┌───────────┐
    │PostgreSQL │ (PostgreSQL 18 Database)
    │    18     │
    └───────────┘
```

---

### **Paso 1: Preparación del Servidor y Base de Datos**

1. **Actualizar paquetes del sistema:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl git build-essential nginx certbot python3-certbot-nginx
   ```

2. **Instalar Node.js 20 LTS:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo npm install -g pm2
   ```

3. **Instalar y Configurar PostgreSQL 18:**
   ```bash
   sudo apt install -y postgresql postgresql-contrib
   sudo systemctl enable postgresql
   sudo systemctl start postgresql
   ```

4. **Crear base de datos y usuario:**
   ```bash
   sudo -u postgres psql
   ```
   ```sql
   CREATE DATABASE ticketero_tecorp;
   CREATE USER tecorp_user WITH ENCRYPTED PASSWORD 'PASSWORD_ROBUSTO_DE_PRODUCCION';
   GRANT ALL PRIVILEGES ON DATABASE ticketero_tecorp TO tecorp_user;
   \c ticketero_tecorp
   GRANT ALL ON SCHEMA public TO tecorp_user;
   \q
   ```

5. **Restaurar esquema inicial y funciones:**
   ```bash
   psql -U tecorp_user -d ticketero_tecorp -h 127.0.0.1 -f database_backup_prod/01_estructura_tablas.sql
   psql -U tecorp_user -d ticketero_tecorp -h 127.0.0.1 -f database_backup_prod/03_triggers_y_funciones.sql
   psql -U tecorp_user -d ticketero_tecorp -h 127.0.0.1 -f database_backup_prod/04_indices_y_rpc.sql
   ```

---

### **Paso 2: Clonar y Compilar la Aplicación**

1. **Ubicar el proyecto en `/var/www/`:**
   ```bash
   cd /var/www
   sudo git clone <URL_DEL_REPOSITORIO> support-connect
   sudo chown -R $USER:$USER /var/www/support-connect
   cd support-connect
   ```

2. **Instalar dependencias:**
   ```bash
   npm install --production=false
   ```

3. **Configurar el archivo `.env` de producción:**
   ```bash
   nano .env
   ```
   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=postgresql://tecorp_user:PASSWORD_ROBUSTO_DE_PRODUCCION@127.0.0.1:5432/ticketero_tecorp
   JWT_SECRET=generar_clave_criptografica_de_al_menos_64_caracteres_aleatorios
   CLIENT_ORIGINS=https://soporte.tuempresa.com

   VITE_SUPABASE_URL=https://soporte.tuempresa.com
   VITE_SUPABASE_ANON_KEY=production-client-key
   ```

4. **Compilar el Frontend para Producción:**
   ```bash
   npm run build
   ```
   *(Los archivos optimizados y fragmentados se generarán en `/var/www/support-connect/dist`).*

---

### **Paso 3: Iniciar y Monitorear el Backend con PM2**

1. **Iniciar el servidor Express con reinicio automático:**
   ```bash
   pm2 start server.js --name "supportconnect-api" -i max
   ```

2. **Guardar la lista de procesos y configurar inicio con el sistema:**
   ```bash
   pm2 save
   pm2 startup
   ```
   *(Ejecuta el comando `sudo env PATH=...` que PM2 te indique en pantalla).*

3. **Comprobar estado del servicio:**
   ```bash
   pm2 status
   pm2 logs supportconnect-api
   ```

---

### **Paso 4: Configurar Nginx como Reverse Proxy y Servidor Web**

1. **Crear la configuración del sitio en Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/support-connect
   ```

2. **Pegar la siguiente configuración optimizada:**
   ```nginx
   server {
       listen 80;
       server_name soporte.tuempresa.com;
       server_tokens off;

       # Cabeceras de Seguridad HTTP
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-Frame-Options "DENY" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Referrer-Policy "strict-origin-when-cross-origin" always;
       add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

       # Frontend: Servir archivos estáticos compilados
       location / {
           root /var/www/support-connect/dist;
           index index.html index.htm;
           try_files $uri $uri/ /index.html;
       }

       # Cache inmutable para assets versionados por Vite
       location /assets/ {
           root /var/www/support-connect/dist;
           expires 1y;
           add_header Cache-Control "public, no-transform, immutable";
       }

       # Backend API: Reverse Proxy hacia Node.js Express (:3001)
       location ~ ^/(auth|api|rest|rpc|health) {
           proxy_pass http://127.0.0.1:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           proxy_read_timeout 60s;
           proxy_connect_timeout 60s;
       }

       # Página de error
       error_page 500 502 503 504 /50x.html;
       location = /50x.html {
           root /usr/share/nginx/html;
       }
   }
   ```

3. **Habilitar el sitio y verificar sintaxis:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/support-connect /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

### **Paso 5: Instalar Certificado SSL/TLS con Let's Encrypt (HTTPS Obligatorio)**

1. **Obtener certificado SSL gratuito:**
   ```bash
   sudo certbot --nginx -d soporte.tuempresa.com
   ```
   *(Selecciona la opción de redirigir todo el tráfico HTTP a HTTPS automáticamente).*

2. **Verificar renovación automática del certificado:**
   ```bash
   sudo certbot renew --dry-run
   ```

---

### **Paso 6: Script de Actualización Continua (`deploy.sh`)**

Para aplicar futuras actualizaciones en producción sin tiempo de inactividad, crea un script `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Iniciando actualización de SupportConnect..."

cd /var/www/support-connect

echo "📥 Descargando cambios de Git..."
git pull origin main

echo "📦 Instalando dependencias..."
npm install

echo "🔨 Compilando frontend..."
npm run build

echo "🔄 Recargando backend en PM2 con zero-downtime..."
pm2 reload supportconnect-api

echo "✅ ¡Despliegue completado exitosamente!"
```

Dale permisos de ejecución:
```bash
chmod +x deploy.sh
```

---

## 🔒 Buenas Prácticas de Seguridad y Mantenimiento

1. **Rotación de Claves**: Renovar periódicamente el `JWT_SECRET` utilizando strings aleatorios de alta entropía (`openssl rand -base64 48`).
2. **Backups Automáticos de Base de Datos**:
   Configurar un cron job diario con `pg_dump`:
   ```bash
   crontab -e
   # Backup diario a las 02:00 AM
   0 2 * * * pg_dump -U tecorp_user -h 127.0.0.1 ticketero_tecorp | gzip > /var/backups/tecorp_$(date +\%F).sql.gz
   ```
3. **Healthcheck Endpoint**:
   Verificar el estado del sistema en cualquier momento accediendo a `https://soporte.tuempresa.com/health`.

---

## 📄 Licencia

Desarrollado para **TECORP S.A.** — Todos los derechos reservados.
