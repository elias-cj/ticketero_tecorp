const SUPER_ADMIN_ROLES = new Set([
  'administrador supremo',
  'superadmin',
  'superadm',
  'supremo'
]);

/**
 * Determina de forma unificada si un rol corresponde al Administrador Supremo.
 */
export function isSuperAdmin(role?: string, roleName?: string): boolean {
  const r = (role || '').toLowerCase().trim();
  const rn = (roleName || '').toLowerCase().trim();
  return SUPER_ADMIN_ROLES.has(r) || SUPER_ADMIN_ROLES.has(rn);
}
