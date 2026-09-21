// =============================================================================
// TIPOS TYPESCRIPT — bd_ticketero_N (Estructura en Español)
// =============================================================================

// ── Catálogos ──────────────────────────────────────────────────────────────────

export interface EstadoTicket {
  id: string;
  nombre: string;
}

export interface PrioridadTicket {
  id: string;
  nombre: string;
  nivel: number;
}

export interface CategoriaProblema {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface TipoProblema {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria_id?: string;
  esta_activo: boolean;
}

export interface Solucion {
  id: string;
  titulo: string;
  descripcion?: string;
  esta_activo: boolean;
  creado_en: string;
}

export interface CallCenter {
  id: string;
  codigo: string;
  nombre: string;
  pais: string;
  nivel_servicio?: string;
  esta_activo: boolean;
}

export interface Turno {
  id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string;
  esta_activo: boolean;
}

export interface Modulo {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface Accion {
  id: string;
  nombre: string;
}

// ── Usuarios ──────────────────────────────────────────────────────────────────

export interface Usuario {
  id: string;
  nombre_completo: string;
  email?: string;
  telefono?: string;
  url_avatar?: string;
  esta_activo: boolean;
  creado_en: string;
  actualizado_en: string;
  // Relaciones opcionales
  roles_usuario?: RolUsuario[];
}

export interface DetallEmpleado {
  usuario_id: string;
  departamento?: string;
  cargo?: string;
  centro_contacto_id?: string;
}

export interface RolUsuario {
  usuario_id: string;
  rol_id: string;
  asignado_en: string;
  roles?: Rol;
}

// ── Tickets ───────────────────────────────────────────────────────────────────

export interface Ticket {
  id: string;
  numero_ticket: string;
  titulo: string;
  descripcion?: string;
  estado_id: string;
  prioridad_id?: string;
  tipo_problema_id?: string;
  solucion_id?: string;
  centro_contacto_id?: string;
  solicitante_id?: string | null;
  tecnico_asignado_id?: string | null;
  creado_en: string;
  actualizado_en: string;
  // Nuevos campos de normalización
  extension?: string;
  puesto_trabajo?: string;
  modalidad_trabajo?: string;
  ip_vpn?: string;
  nombre_solicitante?: string;
  registro_estado: string;
  // Relaciones (joins)
  estados_ticket?: EstadoTicket;
  prioridades_ticket?: PrioridadTicket;
  tipos_problema?: TipoProblema;
  soluciones?: Solucion;
  call_centers?: CallCenter;
  solicitante?: Usuario;
  tecnico_asignado?: Usuario;
}

// Alias de compatibilidad para código legado
export type TicketStatus = "Abierto" | "En Proceso" | "Escalado" | "Resuelto" | "Cerrado";

// ── Tareas ─────────────────────────────────────────────────────────────────────

export interface Tarea {
  id: string;
  titulo: string;
  descripcion?: string;
  estado_id?: string;
  prioridad_id?: string;
  creado_en: string;
  actualizado_en: string;
  // Relaciones
  estados_ticket?: EstadoTicket;
  prioridades_ticket?: PrioridadTicket;
  asignados_tarea?: AsignadoTarea[];
}

export interface AsignadoTarea {
  tarea_id: string;
  tecnico_id: string;
  asignado_en: string;
  usuarios?: Usuario;
}

// ── Inventario y Licencias ────────────────────────────────────────────────────

export interface ItemInventario {
  id: string;
  nombre: string;
  tipo: string;
  numero_serie?: string;
  codigo_nasa?: string;
  modelo?: string;
  estado: string;
  asignado_a?: string;
  ubicacion?: string;
  fecha_compra?: string;
  creado_en: string;
}

export interface Licencia {
  id: string;
  nombre: string;
  clave?: string;
  fecha_expiracion?: string | null;
  asignado_a?: string;
  estado: string;
  notas?: string;
  creado_en: string;
}

// ── Horarios ──────────────────────────────────────────────────────────────────

export interface Horario {
  id: string;
  tecnico_id: string;
  turno_id: string;
  fecha_horario: string;
  usuarios?: Usuario;
  turnos?: Turno;
}

// ── Seguridad y Permisos ──────────────────────────────────────────────────────

export interface Permiso {
  id: string;
  modulo_id: string;
  accion_id: string;
  modulos?: Modulo;
  acciones?: Accion;
}

export interface PermisoRol {
  rol_id: string;
  permiso_id: string;
  asignado_en: string;
}

export interface RegistroAuditoria {
  id: string;
  usuario_id: string;
  accion: string;
  tabla_afectada?: string;
  registro_id?: string;
  datos_anteriores?: Record<string, unknown>;
  datos_nuevos?: Record<string, unknown>;
  creado_en: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  roleName?: string;
  userId?: string;
  activeRoleId?: string;
  roles?: any[];
  token?: string;
  permissions?: Record<string, string[]>;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ── Técnico (alias de compatibilidad) ─────────────────────────────────────────

export interface Technician {
  id: string;
  full_name: string;           // mapea a nombre_completo
  phone?: string;              // mapea a telefono
  status: "activo" | "inactivo";
  created_at?: string;
}

// ── Misceláneos ───────────────────────────────────────────────────────────────

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

// Alias de compatibilidad: Task (importado en Tasks.tsx)
export interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  assignee_id?: string;
  assignee_ids?: string[];
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  assigned_at?: string | null;
  asignados_detalle?: any[];
  usuarios?: { nombre_completo: string };
  profiles?: { full_name: string }; // Alias de compatibilidad para evitar errores TS
}

export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  nasa_code?: string;
  serial_number?: string;
  features?: string;
  status: string;
  call_center_id?: string;
  call_centers?: { id: string; nombre: string; nombre_corto?: string; pais?: string };
  assigned_to?: string;
  delivery_date?: string;
  return_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryHistoryItem {
  id: string;
  inventario_id: string;
  responsable: string;
  centro_contacto_id?: string;
  call_centers?: { id: string; nombre: string; nombre_corto?: string; pais?: string };
  fecha_entrega: string;
  fecha_devolucion?: string | null;
  motivo?: string;
  creado_en: string;
}

export interface License {
  id: string;
  name: string;
  key: string;
  expiration_date?: string;
  assigned_to?: string;
  status: string;
  notes?: string;
  created_at?: string;
}
