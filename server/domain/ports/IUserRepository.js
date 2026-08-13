/**
 * @interface IUserRepository
 * Definición del contrato de persistencia para Usuarios y Sesiones.
 */
export class IUserRepository {
  async findByEmail(email) {
    throw new Error('Método no implementado');
  }

  async findById(id) {
    throw new Error('Método no implementado');
  }

  async getUserRolesAndPermissions(userId) {
    throw new Error('Método no implementado');
  }
}
