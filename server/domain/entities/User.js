export class User {
  constructor({
    id,
    nombre_completo,
    email,
    telefono,
    url_avatar,
    esta_activo = true,
    debe_cambiar_password = false,
    is_super_admin = false,
    roles = [],
    permissions = {},
  }) {
    this.id = id;
    this.nombre_completo = nombre_completo;
    this.email = email;
    this.telefono = telefono || null;
    this.url_avatar = url_avatar || null;
    this.esta_activo = Boolean(esta_activo);
    this.debe_cambiar_password = Boolean(debe_cambiar_password);
    this.is_super_admin = Boolean(is_super_admin);
    this.roles = roles;
    this.permissions = permissions;
  }

  hasPermission(module, action) {
    if (this.is_super_admin) return true;
    return Boolean(this.permissions?.[module]?.includes(action));
  }
}
