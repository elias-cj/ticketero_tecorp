import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yoytifmpgmajjjdkxjsm.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveXRpZm1wZ21hampqZGt4anNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDU4NjcsImV4cCI6MjA5MDQyMTg2N30.5jlC7Jd5nKK70jEREyOLiMOP26knnUyEaJtoY03PRa4'
);

async function seedRoles() {
  console.log('--- Instalando Roles base y Empresa ---');
  
  // 1. Empresa Dummy
  await supabase.from('company_info').insert({
    name: 'Tecorp',
    legal_name: 'Tecorp S.A. de C.V.',
    tax_id: 'NIT-987654321',
    address: 'Av. Las Américas 12-32, Zona 13, Guatemala',
    phone: '+502 2222-3333',
    contact_email: 'contacto@tecorp.com'
  });
  console.log('Empresa base creada.');

  // 2. Roles
  const rolesToInsert = [
    { name: 'superadm', description: 'Acceso total y configuración del sistema' },
    { name: 'admin', description: 'Gestión operativa, reportes y configuración de usuarios' },
    { name: 'soporte', description: 'Técnico de soporte resolutor' },
    { name: 'it', description: 'Técnico de infraestructura y redes' },
    { name: 'agente', description: 'Agente telefónico escalador' }
  ];

  const { data: insertedRoles, error: rolesError } = await supabase.from('roles').insert(rolesToInsert).select();
  if (rolesError) {
    console.error('Error insertando roles:', rolesError);
    return;
  }
  
  const roleMap = new Map();
  insertedRoles.forEach(r => roleMap.set(r.name, r.id));
  console.log('Catálogo de Roles creado.');

  // 3. Migrar profiles actuales a user_roles
  const { data: profiles } = await supabase.from('profiles').select('id, role');
  if (profiles) {
    const userRolesPayload = [];
    for (const p of profiles) {
      if (p.role && roleMap.has(p.role)) {
        userRolesPayload.push({
          user_id: p.id,
          role_id: roleMap.get(p.role)
        });
      }
    }
    
    if(userRolesPayload.length > 0) {
      const { error: urError } = await supabase.from('user_roles').insert(userRolesPayload);
      if (urError) {
        console.error('Error insertando user_roles:', urError);
      } else {
        console.log(`Migrados ${userRolesPayload.length} usuarios existentes al modelo Multi-Rol.`);
      }
    }
  }

  console.log('--- Proceso finalizado ---');
}

seedRoles();
