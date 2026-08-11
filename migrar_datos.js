// =============================================================================
// SCRIPT DE MIGRACIÓN: BD Antigua → bd_ticketero_N
// Ejecutar con: node migrar_datos.js
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuración de la NUEVA base de datos ──────────────────────────────────
const SUPABASE_URL = 'https://htiacdhulfftyuooxwzg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Requiere service_role key

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Falta SUPABASE_SERVICE_KEY. Ejecútalo con:');
  console.error('   SUPABASE_SERVICE_KEY=tu_key node migrar_datos.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const BACKUP_DIR = join(__dirname, 'database_backup', '2026-04-20');

// ── Utilidades ────────────────────────────────────────────────────────────────
const readJSON = (filename) => {
  try {
    const data = JSON.parse(readFileSync(join(BACKUP_DIR, filename), 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch { return []; }
};

const upsert = async (table, data, onConflict = 'id') => {
  if (!data || data.length === 0) { console.log(`  ⚠️  Sin datos para ${table}`); return; }
  const { error } = await supabase.from(table).upsert(data, { onConflict });
  if (error) console.error(`  ❌ Error en ${table}:`, error.message);
  else console.log(`  ✅ ${table}: ${data.length} registros insertados`);
};

// Normaliza un texto de estado al formato español
const normalizarEstado = (s) => {
  const map = {
    'abierto': 'Abierto', 'open': 'Abierto',
    'en-proceso': 'En Proceso', 'in_progress': 'En Proceso', 'in-progress': 'En Proceso',
    'resuelto': 'Resuelto', 'resolved': 'Resuelto',
    'cerrado': 'Cerrado', 'closed': 'Cerrado',
    'escalado': 'Escalado', 'escalated': 'Escalado',
  };
  return map[(s || '').toLowerCase()] || 'Abierto';
};

const normalizarPrioridad = (p) => {
  const map = {
    'baja': 'Baja', 'low': 'Baja',
    'media': 'Media', 'medium': 'Media', 'normal': 'Media',
    'alta': 'Alta', 'high': 'Alta',
    'critica': 'Crítica', 'crítica': 'Crítica', 'critical': 'Crítica',
  };
  return map[(p || '').toLowerCase()] || 'Media';
};

// =============================================================================
// PASO 1: call_centers
// =============================================================================
async function migrarCallCenters() {
  console.log('\n📍 PASO 1: Migrando call_centers...');
  const data = readJSON('call_centers.json');
  const mapped = data.map(cc => ({
    id: cc.id,
    codigo: cc.code || cc.codigo,
    nombre: cc.name || cc.nombre,
    pais: cc.country || cc.pais || 'N/A',
    nivel_servicio: cc.service_level || cc.nivel_servicio || 'Estándar',
    esta_activo: cc.is_active ?? cc.esta_activo ?? true,
    creado_en: cc.created_at || cc.creado_en || new Date().toISOString(),
  }));
  await upsert('call_centers', mapped);
}

// =============================================================================
// PASO 2: roles
// =============================================================================
async function migrarRoles() {
  console.log('\n📍 PASO 2: Migrando roles...');
  const data = readJSON('roles.json');
  const mapped = data.map(r => ({
    id: r.id,
    nombre: r.name || r.nombre,
    descripcion: r.description || r.descripcion,
    esta_activo: r.is_active ?? r.esta_activo ?? true,
  }));
  await upsert('roles', mapped);
}

// =============================================================================
// PASO 3: modulos y acciones
// =============================================================================
async function migrarModulosYAcciones() {
  console.log('\n📍 PASO 3: Migrando módulos y acciones...');

  const modulos = readJSON('modules.json');
  const mappedModulos = modulos.map(m => ({
    id: m.id,
    nombre: m.name || m.nombre,
    descripcion: m.description || m.descripcion,
    creado_en: m.created_at || m.creado_en || new Date().toISOString(),
  }));
  await upsert('modulos', mappedModulos);

  const acciones = readJSON('actions.json');
  const mappedAcciones = acciones.map(a => ({
    id: a.id,
    nombre: a.name || a.nombre,
  }));
  await upsert('acciones', mappedAcciones);
}

// =============================================================================
// PASO 4: permisos y permisos_rol
// =============================================================================
async function migrarPermisos() {
  console.log('\n📍 PASO 4: Migrando permisos...');

  const perms = readJSON('permissions.json');
  const mappedPerms = perms.map(p => ({
    id: p.id,
    modulo_id: p.module_id || p.modulo_id,
    accion_id: p.action_id || p.accion_id,
  }));
  await upsert('permisos', mappedPerms);

  const rolePerms = readJSON('role_permissions.json');
  const mappedRolePerms = rolePerms.map(rp => ({
    rol_id: rp.role_id || rp.rol_id,
    permiso_id: rp.permission_id || rp.permiso_id,
    asignado_en: rp.assigned_at || rp.asignado_en || new Date().toISOString(),
  }));
  await upsert('permisos_rol', mappedRolePerms, 'rol_id,permiso_id');
}

// =============================================================================
// PASO 5: Catálogos dinámicos extraídos de tickets
// =============================================================================
async function migrarCatalogosDesdeTickets() {
  console.log('\n📍 PASO 5: Extrayendo catálogos únicos de tickets...');
  const tickets = readJSON('tickets.json');

  // Estados
  const estadosUnicos = [...new Set(tickets.map(t => normalizarEstado(t.status)))];
  const estadosPriority = ['Abierto', 'En Proceso', 'Escalado', 'Resuelto', 'Cerrado'];
  const todosEstados = [...new Set([...estadosPriority, ...estadosUnicos])];
  const mappedEstados = todosEstados.map(nombre => ({ nombre }));
  await upsert('estados_ticket', mappedEstados, 'nombre');

  // Prioridades con nivel
  const priorityLevels = {
    'Baja': 1, 'Media': 2, 'Alta': 3, 'Crítica': 4,
  };
  const prioridadesUnicas = [...new Set(tickets.map(t => normalizarPrioridad(t.priority)))];
  const todasPrioridades = [...new Set(['Baja', 'Media', 'Alta', 'Crítica', ...prioridadesUnicas])];
  const mappedPrioridades = todasPrioridades.map(nombre => ({
    nombre,
    nivel: priorityLevels[nombre] || 2,
  }));
  await upsert('prioridades_ticket', mappedPrioridades, 'nombre');

  // Categorías de problema (una sola categoría "General" para agrupar todos los tipos)
  const catGeneralData = [{ nombre: 'General' }, { nombre: 'Redes' }, { nombre: 'Hardware' }, { nombre: 'Software' }, { nombre: 'Accesos' }];
  await upsert('categorias_problema', catGeneralData, 'nombre');

  // Obtener el ID de la categoría General
  const { data: cats } = await supabase.from('categorias_problema').select('id, nombre').eq('nombre', 'General');
  const catGeneralId = cats?.[0]?.id;

  // Tipos de problema únicos desde tickets históricos
  const tiposUnicos = [...new Set(tickets.map(t => t.problem_type).filter(Boolean))];
  const mappedTipos = tiposUnicos.map(nombre => ({
    nombre,
    categoria_id: catGeneralId,
    esta_activo: true,
  }));
  if (mappedTipos.length > 0) {
    await upsert('tipos_problema', mappedTipos, 'nombre');
  }

  console.log(`  ✅ ${todosEstados.length} estados, ${todasPrioridades.length} prioridades, ${tiposUnicos.length} tipos de problema`);
}

// =============================================================================
// PASO 6: soluciones
// =============================================================================
async function migrarSoluciones() {
  console.log('\n📍 PASO 6: Migrando soluciones...');
  const data = readJSON('solutions.json');
  const mapped = data.map(s => ({
    id: s.id,
    titulo: s.name || s.titulo || s.title,
    descripcion: s.description || s.descripcion,
    creado_en: s.created_at || s.creado_en || new Date().toISOString(),
    esta_activo: s.is_active ?? s.esta_activo ?? true,
  }));
  await upsert('soluciones', mapped);
}

// =============================================================================
// PASO 7: usuarios (unificando profiles + soporte_tecnico + it_especializado)
// =============================================================================
async function migrarUsuarios() {
  console.log('\n📍 PASO 7: Migrando usuarios...');
  const profiles = readJSON('profiles.json');
  const soporte = readJSON('soporte_tecnico.json');
  const it = readJSON('it_especializado.json');

  // Mapa de todos los usuarios base desde profiles
  const usuariosMap = new Map();
  profiles.forEach(p => {
    usuariosMap.set(p.id, {
      id: p.id,
      nombre_completo: p.full_name || p.nombre_completo || 'Sin Nombre',
      email: p.email,
      telefono: p.phone || p.telefono,
      url_avatar: p.avatar_url || p.url_avatar,
      esta_activo: true,
      creado_en: p.created_at || p.creado_en || new Date().toISOString(),
      actualizado_en: p.updated_at || p.actualizado_en || new Date().toISOString(),
    });
  });

  // Agregar técnicos de soporte que no estén en profiles
  soporte.forEach(s => {
    if (!usuariosMap.has(s.id)) {
      usuariosMap.set(s.id, {
        id: s.id,
        nombre_completo: s.full_name || s.nombre_completo || 'Técnico',
        email: s.email,
        telefono: s.phone || s.telefono,
        url_avatar: s.avatar_url || s.url_avatar,
        esta_activo: (s.status || s.estado) === 'activo',
        creado_en: s.created_at || new Date().toISOString(),
        actualizado_en: s.updated_at || new Date().toISOString(),
      });
    }
  });

  // Agregar técnicos de IT que no estén
  it.forEach(i => {
    if (!usuariosMap.has(i.id)) {
      usuariosMap.set(i.id, {
        id: i.id,
        nombre_completo: i.full_name || i.nombre_completo || 'Técnico IT',
        email: i.email,
        telefono: i.phone || i.telefono,
        url_avatar: i.avatar_url || i.url_avatar,
        esta_activo: (i.status || i.estado) === 'activo',
        creado_en: i.created_at || new Date().toISOString(),
        actualizado_en: i.updated_at || new Date().toISOString(),
      });
    }
  });

  await upsert('usuarios', [...usuariosMap.values()]);

  // Detalles de técnicos de soporte
  const detSoporte = soporte.map(s => ({
    usuario_id: s.id,
    especialidad_id: null,
    centro_contacto_id: s.call_center_id || s.centro_contacto_id || null,
  }));
  if (detSoporte.length > 0) await upsert('detalles_tecnico', detSoporte, 'usuario_id');

  // Detalles de técnicos de IT
  const detIT = it.filter(i => !soporte.find(s => s.id === i.id)).map(i => ({
    usuario_id: i.id,
    especialidad_id: null,
    centro_contacto_id: i.call_center_id || i.centro_contacto_id || null,
  }));
  if (detIT.length > 0) await upsert('detalles_tecnico', detIT, 'usuario_id');

  // Roles de usuario
  const userRoles = readJSON('user_roles.json');
  const mappedUserRoles = userRoles.map(ur => ({
    usuario_id: ur.user_id || ur.usuario_id,
    rol_id: ur.role_id || ur.rol_id,
    asignado_en: ur.assigned_at || ur.asignado_en || new Date().toISOString(),
  }));
  if (mappedUserRoles.length > 0) await upsert('roles_usuario', mappedUserRoles, 'usuario_id,rol_id');
}

// =============================================================================
// PASO 8: horarios
// =============================================================================
async function migrarHorarios() {
  console.log('\n📍 PASO 8: Migrando horarios...');

  // Crear turnos estándar primero
  const turnosEstandar = [
    { nombre: 'Matutino', hora_inicio: '06:00', hora_fin: '14:00' },
    { nombre: 'Vespertino', hora_inicio: '14:00', hora_fin: '22:00' },
    { nombre: 'Nocturno', hora_inicio: '22:00', hora_fin: '06:00' },
    { nombre: 'Completo', hora_inicio: '08:00', hora_fin: '17:00' },
  ];
  await upsert('turnos', turnosEstandar, 'nombre');

  // Obtener los IDs de turnos
  const { data: turnos } = await supabase.from('turnos').select('id, nombre');
  const turnoMap = new Map(turnos?.map(t => [t.nombre.toLowerCase(), t.id]) || []);

  const schedules = readJSON('schedules.json');
  const mapped = schedules.map(s => {
    const shiftName = (s.shift || s.turno || 'Completo').toLowerCase();
    const turnoId = turnoMap.get(shiftName)
      || turnoMap.get('completo')
      || turnos?.[0]?.id;

    return {
      id: s.id,
      tecnico_id: s.technician_id || s.tecnico_id,
      turno_id: turnoId,
      fecha_horario: s.date || s.fecha_horario || s.schedule_date,
    };
  }).filter(s => s.tecnico_id && s.turno_id && s.fecha_horario);

  await upsert('horarios', mapped);
}

// =============================================================================
// PASO 9: tareas y asignados_tarea
// =============================================================================
async function migrarTareas() {
  console.log('\n📍 PASO 9: Migrando tareas...');
  const tasks = readJSON('tasks.json');

  // Obtener IDs de estados y prioridades
  const { data: estados } = await supabase.from('estados_ticket').select('id, nombre');
  const { data: prioridades } = await supabase.from('prioridades_ticket').select('id, nombre');
  const estadoMap = new Map(estados?.map(e => [e.nombre.toLowerCase(), e.id]) || []);
  const prioridadMap = new Map(prioridades?.map(p => [p.nombre.toLowerCase(), p.id]) || []);

  const mapped = tasks.map(t => ({
    id: t.id,
    titulo: t.title || t.titulo,
    descripcion: t.description || t.descripcion,
    estado_id: estadoMap.get(normalizarEstado(t.status).toLowerCase()) || null,
    prioridad_id: prioridadMap.get(normalizarPrioridad(t.priority).toLowerCase()) || null,
    creado_en: t.created_at || t.creado_en || new Date().toISOString(),
    actualizado_en: t.updated_at || t.actualizado_en || new Date().toISOString(),
  }));
  await upsert('tareas', mapped);

  const assignees = readJSON('task_assignees.json');
  const mappedAssignees = assignees.map(a => ({
    tarea_id: a.task_id || a.tarea_id,
    tecnico_id: a.technician_id || a.tecnico_id || a.user_id,
    asignado_en: a.assigned_at || a.asignado_en || new Date().toISOString(),
  })).filter(a => a.tarea_id && a.tecnico_id);
  if (mappedAssignees.length > 0) await upsert('asignados_tarea', mappedAssignees, 'tarea_id,tecnico_id');
}

// =============================================================================
// PASO 10: tickets (la migración más compleja)
// =============================================================================
async function migrarTickets() {
  console.log('\n📍 PASO 10: Migrando tickets históricos...');
  const tickets = readJSON('tickets.json');

  // Cargar todos los mapas de IDs
  const { data: estados } = await supabase.from('estados_ticket').select('id, nombre');
  const { data: prioridades } = await supabase.from('prioridades_ticket').select('id, nombre');
  const { data: tiposProblema } = await supabase.from('tipos_problema').select('id, nombre');
  const { data: soluciones } = await supabase.from('soluciones').select('id, titulo');
  const { data: callCenters } = await supabase.from('call_centers').select('id');
  const { data: tecnicos } = await supabase.from('usuarios').select('id');

  const estadoMap = new Map(estados?.map(e => [e.nombre.toLowerCase(), e.id]) || []);
  const prioridadMap = new Map(prioridades?.map(p => [p.nombre.toLowerCase(), p.id]) || []);
  const tipoMap = new Map(tiposProblema?.map(t => [t.nombre?.toLowerCase(), t.id]) || []);
  const ccIds = new Set(callCenters?.map(c => c.id) || []);
  const tecnicoIds = new Set(tecnicos?.map(t => t.id) || []);

  const defaultEstadoId = estadoMap.get('abierto');
  const defaultPrioridadId = prioridadMap.get('media');
  const defaultTipoId = tiposProblema?.[0]?.id;

  // Crear usuarios solicitantes desde user_name (no existe user_id en el JSON antiguo)
  console.log('  📋 Creando usuarios solicitantes desde user_name...');
  const nombresUnicos = [...new Set(tickets.map(t => (t.user_name || '').trim()).filter(Boolean))];
  const solicitantesMap = new Map();

  const { data: usuariosExistentes } = await supabase.from('usuarios').select('id, nombre_completo');
  usuariosExistentes?.forEach(u => solicitantesMap.set(u.nombre_completo.trim().toLowerCase(), u.id));

  const nuevosUsuarios = [];
  for (const nombre of nombresUnicos) {
    if (!solicitantesMap.has(nombre.toLowerCase())) {
      const nuevoId = crypto.randomUUID();
      nuevosUsuarios.push({ id: nuevoId, nombre_completo: nombre, esta_activo: true });
      solicitantesMap.set(nombre.toLowerCase(), nuevoId);
    }
  }
  if (nuevosUsuarios.length > 0) {
    for (let i = 0; i < nuevosUsuarios.length; i += 100) {
      await supabase.from('usuarios').upsert(nuevosUsuarios.slice(i, i + 100), { onConflict: 'id' });
    }
    console.log(`  ✅ ${nuevosUsuarios.length} nuevos usuarios solicitantes creados`);
  }

  const BATCH_SIZE = 100;
  const mapped = tickets.map(t => {
    const titulo = t.problem_type || t.title || 'Ticket de Soporte';
    const estadoNorm = normalizarEstado(t.status).toLowerCase();
    const prioridadNorm = normalizarPrioridad(t.priority).toLowerCase();
    const tipoNorm = (t.problem_type || '').toLowerCase();
    const nombreSolicitante = (t.user_name || '').trim();
    const solicitanteId = solicitantesMap.get(nombreSolicitante.toLowerCase());
    if (!solicitanteId) return null;
    const tecnicoId = t.assignee_id && tecnicoIds.has(t.assignee_id) ? t.assignee_id : null;
    return {
      id: t.id,
      numero_ticket: t.ticket_number || `T-${t.id?.slice(0, 8)}`,
      titulo,
      descripcion: t.description,
      estado_id: estadoMap.get(estadoNorm) || defaultEstadoId,
      prioridad_id: prioridadMap.get(prioridadNorm) || defaultPrioridadId,
      tipo_problema_id: tipoMap.get(tipoNorm) || defaultTipoId,
      solucion_id: t.solution_id && soluciones?.find(s => s.id === t.solution_id) ? t.solution_id : null,
      centro_contacto_id: (t.call_center_id && ccIds.has(t.call_center_id)) ? t.call_center_id : null,
      solicitante_id: solicitanteId,
      tecnico_asignado_id: tecnicoId,
      creado_en: t.created_at || new Date().toISOString(),
      actualizado_en: t.updated_at || new Date().toISOString(),
    };
  }).filter(Boolean);

  // Insertar en lotes de 100
  let insertados = 0;
  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch = mapped.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('tickets').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`  ❌ Error en lote ${i}-${i + BATCH_SIZE}:`, error.message);
    } else {
      insertados += batch.length;
      process.stdout.write(`\r  ✅ Tickets insertados: ${insertados}/${mapped.length}`);
    }
  }
  console.log();
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log('🚀 Iniciando migración de datos a bd_ticketero_N...');
  console.log('='.repeat(60));

  try {
    await migrarCallCenters();
    await migrarRoles();
    await migrarModulosYAcciones();
    await migrarPermisos();
    await migrarCatalogosDesdeTickets();
    await migrarSoluciones();
    await migrarUsuarios();
    await migrarHorarios();
    await migrarTareas();
    await migrarTickets();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ¡Migración completada exitosamente!');
  } catch (err) {
    console.error('\n💥 Error fatal durante la migración:', err);
    process.exit(1);
  }
}

main();
