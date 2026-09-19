# =============================================================================
# Etapa 1: Compilación del Frontend (React + Vite)
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias con caché limpia
RUN npm ci

# Copiar el código fuente del proyecto
COPY . .

# Argumentos opcionales de compilación (si se omite, se usa la URL de origen dinámica)
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY="production-client-key"

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Compilar la aplicación React para producción
RUN npm run build

# =============================================================================
# Etapa 2: Servidor Web Nginx ultraligero
# =============================================================================
FROM nginx:alpine

# Copiar el build compilado del frontend
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración optimizada de Nginx con Reverse Proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
