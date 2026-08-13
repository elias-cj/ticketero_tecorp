import { DomainError } from '../../domain/errors/DomainError.js';

export function errorHandlerMiddleware(err, req, res, _next) {
  console.error(`[Error ${req.method} ${req.url}]:`, err.message || err);

  if (err instanceof DomainError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Errores de sintaxis o JSON malformado en body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ code: 'BAD_REQUEST', message: 'Cuerpo de solicitud JSON malformado.' });
  }

  // Error genérico
  return res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Ha ocurrido un error inesperado en el servidor.',
  });
}
