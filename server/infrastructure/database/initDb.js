import { dbQuery } from './db.js';

export async function initDatabase() {
  try {
    // 1. Asegurar extensión pgcrypto o gen_random_uuid si no existe
    await dbQuery(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 2. Crear tabla politicas_asignacion_tickets si no existe
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS public.politicas_asignacion_tickets (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        tipo text NOT NULL UNIQUE,
        nombre text NOT NULL,
        descripcion text,
        roles_ids jsonb DEFAULT '[]'::jsonb,
        usuarios_ids jsonb DEFAULT '[]'::jsonb,
        actualizado_en timestamp with time zone DEFAULT now()
      );
    `);

    // 3. Sembrar las 4 políticas base si la tabla está vacía o faltan registros
    await dbQuery(`
      INSERT INTO public.politicas_asignacion_tickets (tipo, nombre, descripcion, roles_ids, usuarios_ids)
      VALUES
        (
          'autoasignar',
          'Auto-asignación de Tickets',
          'Roles y usuarios con permiso para asignarse tickets a sí mismos (botón ASIGNARME).',
          (SELECT COALESCE(jsonb_agg(id::text), '[]'::jsonb) FROM public.roles WHERE nombre IN ('Soporte Técnico', 'IT', 'Admin', 'SuperAdmin')),
          '[]'::jsonb
        ),
        (
          'asignar_otros',
          'Asignación a Terceros',
          'Roles y usuarios con permiso para asignar o reasignar tickets a otros técnicos (menú ASIG / RE-ASIG).',
          (SELECT COALESCE(jsonb_agg(id::text), '[]'::jsonb) FROM public.roles WHERE nombre IN ('Admin', 'SuperAdmin')),
          '[]'::jsonb
        ),
        (
          'atender_soporte',
          'Atención en Cola de Soporte',
          'Roles y usuarios habilitados para atender y recibir tickets de la cola general de Soporte Técnico.',
          (SELECT COALESCE(jsonb_agg(id::text), '[]'::jsonb) FROM public.roles WHERE nombre IN ('Soporte Técnico', 'Admin', 'SuperAdmin')),
          '[]'::jsonb
        ),
        (
          'atender_it',
          'Atención en Cola IT (Escalados)',
          'Roles y usuarios habilitados para atender y recibir tickets escalados a IT Especializado.',
          (SELECT COALESCE(jsonb_agg(id::text), '[]'::jsonb) FROM public.roles WHERE nombre IN ('IT', 'Admin', 'SuperAdmin')),
          '[]'::jsonb
        )
      ON CONFLICT (tipo) DO NOTHING;
    `);

    console.log('✅ Base de datos inicializada: tabla politicas_asignacion_tickets verificada.');
  } catch (error) {
    console.error('⚠️ Error al inicializar politicas_asignacion_tickets en la base de datos:', error.message);
  }
}
