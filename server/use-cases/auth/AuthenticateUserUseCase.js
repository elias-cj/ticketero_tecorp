import bcrypt from 'bcryptjs';
import { UnauthorizedError, ValidationError } from '../../domain/errors/DomainError.js';

export class AuthenticateUserUseCase {
  constructor({ userRepository, tokenService }) {
    this.userRepository = userRepository;
    this.tokenService = tokenService;
  }

  async execute({ email, password }) {
    if (!email || !password) {
      throw new ValidationError('Email y contraseña son requeridos.');
    }

    const userRow = await this.userRepository.findByEmail(email);
    if (!userRow || !userRow.esta_activo) {
      throw new UnauthorizedError('Credenciales inválidas o usuario inactivo.');
    }

    const isMatch = await bcrypt.compare(password, userRow.password);
    if (!isMatch) {
      throw new UnauthorizedError('Credenciales inválidas o usuario inactivo.');
    }

    const { roles, permissions } = await this.userRepository.getUserRolesAndPermissions(userRow.id);

    const token = this.tokenService.sign({
      sub: userRow.id,
      email: userRow.email,
    });

    const { password: _, ...userWithoutPassword } = userRow;

    return {
      user: {
        ...userWithoutPassword,
        roles,
        permissions,
      },
      token,
    };
  }
}
