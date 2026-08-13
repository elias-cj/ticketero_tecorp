import { describe, it, expect, beforeEach } from 'vitest';
import { TokenService } from '../../../../server/infrastructure/security/TokenService.js';

describe('TokenService (JWT Unit Tests)', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    process.env.JWT_SECRET = 'super-secret-key-at-least-32-chars-long!';
    tokenService = new TokenService();
  });

  it('debe firmar y verificar un token JWT correctamente', () => {
    const payload = { sub: 'user-uuid-123', email: 'admin@tecorp.bo' };
    const token = tokenService.sign(payload);

    expect(typeof token).toBe('string');
    expect((token as string).length).toBeGreaterThan(20);

    const verified = tokenService.verify(token) as Record<string, any> | null;
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe('user-uuid-123');
    expect(verified?.email).toBe('admin@tecorp.bo');
  });

  it('debe retornar null para un token inválido o alterado', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidSignature';
    const result = tokenService.verify(invalidToken);
    expect(result).toBeNull();
  });
});
