# PROPUESTA COMERCIAL Y COTIZACIÓN FORMAL DE PROYECTO
## "ENTREGA DE SOFTWARE, BASE DE DATOS HISTÓRICA (5 MESES), NUEVAS FUNCIONALIDADES Y TRANSFERENCIA TÉCNICA (SUPPORTCONNECT)"

**Nº de Documento:** COT-2026-TECORP-001-V3  
**Fecha de Emisión:** 10 de Agosto de 2026  
**Cliente:** TECORP S.A.  
**Contacto Principal:** Dirección de Tecnología / Operaciones  
**Proveedor del Servicio:** Equipo de Desarrollo & Consultoría de Software  
**Modalidad de Entrega:** Código Fuente + Base de Datos Histórica + Módulo de Nuevos Requerimientos + Transferencia Técnica  
**Validez de la Oferta:** 15 días calendario  

---

## 1. RESUMEN EJECUTIVO Y CONTEXTO DEL PROYECTO

La presente propuesta comercial detalla la oferta final para la venta, transferencia tecnológica y provisión del paquete de software **SupportConnect** para la empresa **TECORP S.A.**

### Contexto Operativo y Valor Estratégico:
1. **Continuidad Operativa:** SupportConnect ha estado operando exitosamente durante **5 meses continuos en entorno real de producción**, procesando el flujo operativo de tickets tanto de los equipos internos de TECORP como de la empresa cliente (áreas de NOC y BI para reportería ejecutiva e indicadores clave).
2. **Superación Tecnológica:** El sistema reemplazó la gestión informal por grupos de WhatsApp y un sistema previo obsoleto que colapsaba a los 8,000 registros y carecía de tiempo real y redirecciones directas.
3. **Respaldo Histórico de Datos:** La propuesta incluye la entrega e integración del **respaldo completo de los 5 meses de datos históricos acumulados**, garantizando que TECORP mantenga la continuidad de sus métricas de negocio y el servicio contratado por su empresa cliente.
4. **Nuevos Requerimientos Solicitados:** A solicitud de TECORP, la presente cotización contempla la inclusión y desarrollo de los **4 nuevos requerimientos específicos** solicitados recientemente para la optimización de la atención y control operativo.

---

## 2. ENTREGABLES DEL PROYECTO (LO QUE RECIBE TECORP)

El proyecto comprende la entrega formal de los siguientes componentes técnicos:

### 2.1. Código Fuente Completo del Sistema
* **Frontend:** Código fuente completo en React 18, TypeScript, Vite, Tailwind CSS y componentes Shadcn UI/Radix UI.
* **Backend:** Código fuente del servidor REST API en Node.js / Express.js con soporte en tiempo real (WebSockets/Polling), autenticación JWT y encriptación Bcrypt.
* **Branding Corporativo:** Personalización e integración visual del logotipo, favicon y paleta de colores corporativos de **TECORP**.

### 2.2. Base de Datos PostgreSQL + Respaldo Histórico de 5 Meses
* **Scripts SQL de Estructura (DDL):** Creación automatizada de tablas, relaciones, índices, vistas y funciones almacenadas.
* **Dump / Backup de Datos Históricos (DML):** Copia íntegra de la base de datos con los **5 meses de historial de producción cargados** (usuarios, roles, configuraciones, sedes, catálogo de problemas/soluciones y la totalidad de los tickets generados por las áreas de NOC, BI y usuarios finales).

### 2.3. Módulo de Nuevas Funcionalidades Solicitadas (Incluido en Opción Recomendada)
Desarrollo e integración en el código fuente de las siguientes características requeridas por la empresa:
1. **Campo "Cantidad de Personas/Usuarios Afectados":** Integración en el formulario de creación de tickets para registrar el impacto cuantitativo del incidente.
2. **Banner / Imagen Informativa de Transición:** Implementación de aviso gráfico destacado indicando que a partir de la fecha seleccionada la atención se realizará únicamente a través de la plataforma de tickets.
3. **Panel de Gestión de Estado (Activar/Desactivar):** Módulo administrativo para habilitar o inhabilitar:
   * Usuarios de Call Center.
   * Catálogo de Soluciones.
   * Catálogo de Tipos de Problemas.
4. **Módulo de Cierre de Ticket con Descripción Obligatoria:** Modal/formulario al cerrar un ticket que exige al técnico ingresar una descripción detallada o nota de resolución.

### 2.4. Paquete de Contenerización y Despliegue
* Archivo `Dockerfile` optimizado para producción.
* Archivo `docker-compose.yml` preconfigurado para orquestar la aplicación Node.js, PostgreSQL y Nginx.
* Plantillas de configuración para **Nginx** (Reverse Proxy) y variables de entorno (`.env.example`).

### 2.5. Manuales de Instalación y Documentación Técnica
* **Guía de Despliegue e Instalación Paso a Paso:** Documentación detallada para que el equipo de TI de TECORP realice el despliegue en sus servidores.
* **Manual de Mantenimiento de Base de Datos:** Instrucciones para ejecución de respaldos (backups SQL) y restauración.

### 2.6. Asistencia y Transferencia Técnica Remota
* **Sesión Remota de Acompañamiento a TI (hasta 3 Horas):** Asistencia técnica por videollamada para orientar al equipo de TI de TECORP en su primer despliegue en sus servidores.

---

## 3. MATRIZ DE RESPONSABILIDADES Y ALCANCE

| Concepto | Proveedor (Nosotros) | Cliente (Equipo de TI de Tecorp) |
| :--- | :---: | :---: |
| **Desarrollo del Sistema y Código Fuente Completo** | **INCLUIDO** | No aplica |
| **Migración / Dump de 5 Meses de Datos Históricos** | **INCLUIDO** | No aplica |
| **Desarrollo de los 4 Nuevos Requerimientos Solicitados** | **INCLUIDO (Opción 2 y 3)** | No aplica |
| **Personalización Gráfica con Logo/Colores Tecorp** | **INCLUIDO** | No aplica |
| **Manual de Instalación y Paquete Docker** | **INCLUIDO** | No aplica |
| **Sesión de Asistencia Remota para Despliegue** | **INCLUIDO** | No aplica |
| **Provisión de Servidor / VPS / Hosting / Cloud** | No aplica | **RESPONSABILIDAD DE TECORP** |
| **Configuración de IP, Dominio y Certificados SSL** | No aplica | **RESPONSABILIDAD DE TECORP** |
| **Administración Operativa Diaria en sus Servidores** | No aplica | **RESPONSABILIDAD DE TECORP** |

---

## 4. DESGLOSE FUNCIONAL DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SUPPORTCONNECT                                        │
├──────────────────────────┬──────────────────────────┬───────────────────────────────────┤
│  1. HELPDESK & TICKETS   │  2. NUEVOS REQUERIMIENTOS│  3. INVENTARIO IT (ITAM)          │
│  - Redirección WhatsApp  - Cantidad de Afectados    - Equipos, Laps, Servidores         │
│  - Actualización 100% RT - Banner Canal Único       - Seriales y Asignaciones           │
│  - Tiempos & SLA         - Desc. Obligatoria Cierre - Historial de Mantenimientos        │
├──────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│  4. CONTROL LICENCIAS    │  5. CONTROL DE ACCESOS   │  6. SEDES & CALL CENTERS          │
│  - Keys, Contratos, Expir- Activar/Desactivar CC    - Filtro Geográfico por Sede        │
│  - Control Cupos & Costos- Activar/Desact Soluc/Prob- Gestión Call Centers Soluciones    │
├──────────────────────────┴──────────────────────────┴───────────────────────────────────┤
│  7. DASHBOARD EXECUTIVE BI | 8. HISTORIAL DE 5 MESES | 9. EXPORTACIÓN & SEGURIDAD RBAC   │
│  - Métricas NOC y BI       | - Base Datos Producción | - Export a Excel / CSV           │
│  - Gráficos por Sede/Técn  | - Continuidad Operativa | - Matriz de Roles & Permisos     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. PROPUESTA ECONÓMICA Y OPCIONES DE ADQUISICIÓN

Se presentan tres opciones de inversión estructuradas según el alcance funcional requerido por TECORP:

### Opción 1: Paquete Base (Sistema Actual + Base de Datos 5 Meses)
* **Inversión:** **$3,800.00 USD**
* **Incluye:**
  * Código fuente completo del sistema tal como opera actualmente.
  * Dump de base de datos con los **5 meses de historial cargados**.
  * Branding con logo y colores de TECORP.
  * Paquete Docker (`docker-compose`) y Manual técnico de instalación.
  * *(No incluye los 4 nuevos requerimientos ni sesión síncrona de acompañamiento).*

### Opción 2: Paquete Recomendado (Sistema Completo + 5 Meses Datos + 4 Nuevos Requerimientos + Asistencia TI)
* **Inversión:** **$5,500.00 USD** *(Opción Estratégica Recomendada)*
* **Incluye:**
  * **Todo el código fuente** del sistema **SupportConnect**.
  * **Respaldo completo de la Base de Datos con los 5 meses de producción** (NOC/BI).
  * **Desarrollo e Integración de los 4 Nuevos Requerimientos Solicitados:**
    1. Registro de *Cantidad de Usuarios Afectados* en la creación del ticket.
    2. *Banner/Imagen informativa* de canal exclusivo de tickets.
    3. Módulo administrativo para *Activar/Desactivar Call Center, Soluciones y Problemas*.
    4. Formulario/modal de *Descripción obligatoria al cerrar ticket*.
  * Branding gráfico corporativo completo (Logo, Favicon, Colores).
  * Paquete Docker y configuraciones Nginx con SSL.
  * Manual de Instalación y Despliegue + Manual de Usuario.
  * **Sesión Remota de Acompañamiento (hasta 3 horas)** para asistir al equipo de TI en su despliegue.
  * **30 Días de Garantía sobre el Código Fuente** para correcciones de software.

### Opción 3: Paquete Enterprise (Todo lo Incluido + Bolsa de Horas de Soporte / Desarrollos Futuros)
* **Inversión:** **$6,800.00 USD**
* **Incluye:**
  * Todo el alcance de la **Opción 2 (Recomendada)**.
  * **Bolsa Prepago de 20 Horas** para futuros requerimientos, ajustes, reportes adicionales o soporte directo a TI (Válida por 6 meses).
  * **60 Días de Garantía extendida**.

---

## 6. TARIFAS POR HORA TRABAJADA Y SERVICIOS ADICIONALES

Para requerimientos adicionales, mantenimientos futuros o soporte fuera del alcance inicial:

| Concepto de Servicio | Tarifa / Precio por Hora | Descripción |
| :--- | :--- | :--- |
| **Soporte / Asistencia Técnica Operativa** | **$35.00 USD / hora** | Asistencia remota para apoyo al equipo de TI en sus servidores o base de datos. |
| **Desarrollo y Programación Adicional** | **$45.00 USD / hora** | Programación de nuevas funcionalidades, módulos o integraciones a la medida. |
| **Bolsa de Horas Prepago (10 Horas)** | **$380.00 USD** *(Ahorro $70 USD)* | Paquete prepagado de 10 horas de servicio utilizables en soporte o desarrollo. |

---

## 7. ESTRUCTURA Y HITOS DE PAGO (OPCIÓN RECOMENDADA - $5,500 USD)

* **50% ($2,750.00 USD):** A la firma de la propuesta e inicio del desarrollo/integración de los 4 nuevos requerimientos solicitados y empaquetado de código.
* **30% ($1,650.00 USD):** A la entrega del código fuente final, scripts SQL y dump de la base de datos con los 5 meses de datos históricos.
* **20% ($1,100.00 USD):** Al finalizar la sesión de asistencia remota de despliegue con el equipo de TI de TECORP y firma del acta de conformidad.

---

## 8. TÉRMINOS, LICENCIAMIENTO Y CONFIDENCIALIDAD

1. **Licencia de Uso:** TECORP adquiere una licencia perpetua e ilimitada de uso del código fuente para su operación interna y atención de sus clientes, sin pago de anualidades ni restricciones de usuarios.
2. **Propiedad Intelectual y Garantía:** El proveedor garantiza que el software y la estructura de datos son de su autoría y propiedad, eximiendo a TECORP de cualquier reclamo de terceros.
3. **Confidencialidad (NDA):** Toda la información de la base de datos histórica procesada durante los 5 meses se maneja bajo estricta confidencialidad.

---

## 9. ACTA DE ACEPTACIÓN Y FIRMAS DE CONFORMIDAD

```
_______________________________________          _______________________________________
      POR CLIENTE: TECORP S.A.                        POR PROVEEDOR DE SOFTWARE
Nombre: _______________________________          Nombre: _______________________________
Cargo:  _______________________________          Cargo:  Consultor Principal de Software
Fecha:  _____ / _____ / 2026                     Fecha:  _____ / _____ / 2026
```

---
*Documento formal emitido para TECORP S.A.*
