import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'support-connect-api';
const JWT_AUDIENCE = 'support-connect-web';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET es obligatorio y debe tener al menos 32 caracteres.');
}

export class TokenService {
  /**
   * @param {object} payload
   * @param {string | number} [expiresIn='8h']
   * @returns {string}
   */
  sign(payload, expiresIn = '8h') {
    return jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn,
    });
  }

  /**
   * @param {string} token
   * @returns {any}
   */
  verify(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
      return typeof decoded === 'object' && decoded !== null ? decoded : null;
    } catch {
      return null;
    }
  }
}
