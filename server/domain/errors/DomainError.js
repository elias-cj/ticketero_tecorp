export class DomainError extends Error {
  constructor(message, statusCode = 400, code = 'DOMAIN_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Recurso no encontrado.') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Autenticación o permisos insuficientes.') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'Datos de entrada no válidos.', details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}
