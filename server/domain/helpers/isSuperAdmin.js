const SUPER_ADMIN_ROLES = new Set([
  'administrador supremo',
  'superadmin',
  'superadm',
  'supremo'
]);

/**
 * Determina de forma unificada si un nombre o identificador de rol corresponde a SuperAdmin.
 * @param {string} [roleName]
 * @returns {boolean}
 */
export function isSuperAdminRole(roleName) {
  if (!roleName || typeof roleName !== 'string') return false;
  return SUPER_ADMIN_ROLES.has(roleName.toLowerCase().trim());
}
