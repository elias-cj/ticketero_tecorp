import { ValidationError } from '../errors/DomainError.js';

export class Ticket {
  constructor({
    id,
    numero_ticket,
    titulo,
    descripcion,
    estado_id,
    tipo_problema_id,
    solucion_id,
    centro_contacto_id,
    solicitante_id,
    tecnico_asignado_id,
    extension,
    puesto_trabajo,
    modalidad_trabajo,
    ip_vpn,
    nombre_solicitante,
    cantidad_afectados,
    descripcion_solucion,
    creado_en,
    actualizado_en,
    fecha_asignacion,
    fecha_cierre,
    escalados = false,
  }) {
    this.id = id;
    this.numero_ticket = numero_ticket;
    this.titulo = this.validateTitulo(titulo);
    this.descripcion = descripcion || null;
    this.estado_id = estado_id;
    this.tipo_problema_id = tipo_problema_id;
    this.solucion_id = solucion_id || null;
    this.centro_contacto_id = centro_contacto_id;
    this.solicitante_id = solicitante_id || null;
    this.tecnico_asignado_id = tecnico_asignado_id || null;
    this.extension = extension || null;
    this.puesto_trabajo = puesto_trabajo || null;
    this.modalidad_trabajo = modalidad_trabajo || null;
    this.ip_vpn = ip_vpn || null;
    this.nombre_solicitante = nombre_solicitante || 'Anónimo';
    this.cantidad_afectados = this.normalizeCantidadAfectados(cantidad_afectados);
    this.descripcion_solucion = descripcion_solucion || null;
    this.creado_en = creado_en || new Date();
    this.actualizado_en = actualizado_en || new Date();
    this.fecha_asignacion = fecha_asignacion || null;
    this.fecha_cierre = fecha_cierre || null;
    this.escalados = Boolean(escalados);
  }

  validateTitulo(titulo) {
    if (!titulo || typeof titulo !== 'string' || titulo.trim().length < 3) {
      throw new ValidationError('El título del ticket debe tener al menos 3 caracteres.');
    }
    return titulo.trim();
  }

  normalizeCantidadAfectados(val) {
    if (val === null || val === undefined || val === '') return null;
    const parsed = Number.parseInt(val, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  isClosed() {
    return Boolean(this.fecha_cierre);
  }
}
