# 🎧 TECORP SupportConnect — Centro de Monitoreo y Gestión de Tickets Multi-Site

**SupportConnect** es una plataforma enterprise de gestión centralizada de incidencias, soporte técnico y monitoreo operativo en tiempo real para centros de contacto (call centers) multinacionales.

---

## 🚀 Características Principales

- **📊 Terminal de Monitoreo & Tickets**: Gestión multinivel de tickets por estado, prioridad, call center y técnico asignado con actualización en tiempo real.
- **🖥️ Cola IT Especializada**: Separación fluida entre tickets de soporte general e incidencias escaladas de infraestructura y redes.
- **🔐 Control de Acceso Basado en Roles (RBAC 3FN)**: Matriz de permisos 100% dinámica gestionada desde PostgreSQL (14 Módulos y 23 Acciones configurables sin hardcodeo).
- **📦 Inventario de Equipos**: Trazabilidad y control de laptops, desktops, servidores y accesorios por ubicación y asignación.
- **🔑 Gestión de Licencias de Software**: Control de claves de producto, proveedores, cantidades usadas y alertas de vencimiento.
- **📅 Horarios y Turnos**: Planificación de turnos de soporte técnico por especialista.
- **📚 Base de Conocimiento y Soluciones**: Catálogo de soluciones frecuentes e incidencias resueltas para acelerar el SLA de atención.
- **📜 Auditoría Operativa**: Historial inmutable con registro de fecha, hora y usuario para cada modificación de datos en el sistema.

---

## 🛠️ Tecnología y Arquitectura

### **Frontend**
- **Framework**: React 18 + TypeScript + Vite
- **Estilos**: Vanilla CSS + TailwindCSS + Radix UI + Lucide Icons
- **Animaciones**: Framer Motion
- **Gestión de Estado y Data**: TanStack React Query + React Router v6

### **Backend & API (Clean Architecture)**
- **Servidor**: Node.js + Express.js en Arquitectura Limpia (Dominio, Casos de Uso, Adaptadores e Infraestructura)
- **Seguridad**: Autenticación JWT (`jsonwebtoken`) + Bcryptjs + Validaciones Zod + Middleware RBAC dinámico con caché en memoria
- **Persistencia**: PostgreSQL nativo (Driver `pg` parametrizado con Repositorios desacoplados)
- **Sincronización Reactiva**: Sincronización continua de datos vía TanStack React Query (HTTP Auto-Refetching)

### **Base de Datos (PostgreSQL)**
- **Esquema Normalizado 3FN**: `usuarios`, `roles`, `roles_usuario`, `modulos`, `acciones`, `permisos`, `permisos_rol`.
- **Procedimientos Almacenados**: Triggers para foliado automático de tickets (`generar_numero_ticket_auto`), funciones RPC de métricas y sembrado automático de RBAC.

---

## 📂 Estructura del Backend (Clean Architecture)

```
server/
├── domain/            # Core: Entidades puras (Ticket, User), Errores y Puertos (ITicketRepository)
├── use-cases/         # Aplicación: Casos de uso (CreateTicket, AuthenticateUser, GetTicketsPaging)
├── adapters/          # Adaptadores: Controllers (HTTP), Repositorios (PgTicketRepository), DTOs (Zod)
└── infrastructure/    # Infraestructura: Express App, Database Pool, Middlewares (JWT, RateLimiter)
```

```text
support-connect/
├── public/                 # Recursos estáticos (Logos, imágenes)
├── src/                    # Código fuente del cliente (React + TS)
│   ├── components/         # Componentes UI (Sidebar, Headers, Layouts)
│   ├── contexts/           # AuthContext y SystemContext
│   ├── features/           # Módulos principales (Tickets, Vistas, Hooks)
│   ├── hooks/              # Custom hooks (Permissions, Queries)
│   ├── pages/              # Vistas (Dashboard, Configuration, Inventory, etc.)
│   ├── types/              # Definiciones de interfaces TypeScript
│   └── lib/                # Configuración de clientes (Supabase, API)
├── supabase/               # Migraciones de base de datos SQL
├── server.js               # API Backend Express con proxy seguro a PostgreSQL
├── seed_roles.js           # Script de sembrado inicial de permisos RBAC
└── README.md               # Documentación del proyecto
```

---

## 💻 Instalación y Configuración Local

### **Requisitos Previos**
- Node.js `v18.x` o superior
- PostgreSQL `v14.x` o superior (o entorno Laragon / Docker)

### **1. Clonar el repositorio e instalar dependencias**
```bash
git clone <URL_DEL_REPOSITORIO>
cd support-connect
npm install
```

### **2. Configurar Variables de Entorno (`.env`)**
Crea un archivo `.env` en la raíz del proyecto basándote en el siguiente esquema:

```env
PORT=54321
DATABASE_URL=postgresql://usuario:password@localhost:5432/bd_ticketero
JWT_SECRET=tu_clave_secreta_jwt_de_al_menos_32_caracteres
CLIENT_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### **3. Inicializar la Base de Datos**
Ejecuta el servidor por primera vez para crear tablas, índices y funciones almacenadas:

```bash
node server.js
```

Para sembrar la matriz oficial de permisos por defecto en los 7 roles:
```bash
node seed_roles.js
```

### **4. Iniciar Entorno de Desarrollo**
En dos terminales separadas:

```bash
# Terminal 1: API Backend
node server.js

# Terminal 2: Frontend (Vite Dev Server)
npm run dev
```

Accede a la aplicación en `http://localhost:5173`.

---

## 👥 Matriz de Roles Predeterminados

| Rol | Descripción | Módulos Permitidos |
| :--- | :--- | :--- |
| **Administrador Supremo** | Control Total Root | Todos los 14 Módulos (Acceso Total Bypass) |
| **semiadm** | Admin Secundario | Call Centers, Dashboard, Exportación, Soluciones, Tickets, Tipos de Problema |
| **it** | Infraestructura y Redes | Call Centers, Dashboard, Exportación, Soluciones, Tickets, Tipos de Problema |
| **Técnico de Soporte** | Operatividad de Tickets | Call Centers, Cola IT, Dashboard, Horarios, Inventario, Soluciones, Tareas, Tickets |
| **Usuario Autorizado** | Perfil de Consulta | Dashboard, Exportación, Soluciones, Tickets, Tipos de Problema |
| **BI** | Business Intelligence | Exportación |

---

## 🐳 Despliegue con Docker (Opcional)

El proyecto incluye soporte para contenedores con Docker y Docker Compose:

```bash
# Construir y levantar servicios
docker-compose up -d --build
```

---

## 📄 Licencia

Desarrollado para **TECORP S.A.** — Todos los derechos reservados.
