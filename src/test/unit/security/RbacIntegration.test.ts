import { describe, it, expect, beforeEach } from 'vitest';
import { TokenService } from '../../../../server/infrastructure/security/TokenService.js';
import { isSuperAdminRole } from '../../../../server/domain/helpers/isSuperAdmin.js';

describe('RBAC & Security Policies (Unit / Integration Tests)', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    process.env.JWT_SECRET = 'support_connect_test_secret_key_2026_at_least_32_chars!';
    tokenService = new TokenService();
  });

  describe('TokenService Security', () => {
    it('debe firmar tokens con claims estándar válidos', () => {
      const payload = { sub: 'usr-456', email: 'tech@tecorp.bo' };
      const token = tokenService.sign(payload);
      expect(typeof token).toBe('string');

      const verified = tokenService.verify(token);
      expect(verified).toBeTruthy();
      expect(verified?.sub).toBe('usr-456');
      expect(verified?.iss).toBe('support-connect-api');
      expect(verified?.aud).toBe('support-connect-web');
    });

    it('debe rechazar tokens con firmas manipuladas', () => {
      const payload = { sub: 'usr-attacker', email: 'hacker@test.bo' };
      const validToken = tokenService.sign(payload);
      const tamperedToken = validToken.substring(0, validToken.length - 5) + 'XXXXX';

      const result = tokenService.verify(tamperedToken);
      expect(result).toBeNull();
    });
  });

  describe('isSuperAdminRole Centralized Helper', () => {
    it('debe identificar todas las variantes válidas de Administrador Supremo', () => {
      expect(isSuperAdminRole('administrador supremo')).toBe(true);
      expect(isSuperAdminRole('Administrador Supremo ')).toBe(true);
      expect(isSuperAdminRole('superadmin')).toBe(true);
      expect(isSuperAdminRole('SUPERADM')).toBe(true);
      expect(isSuperAdminRole('supremo')).toBe(true);
    });

    it('debe denegar roles regulares como no-SuperAdmin', () => {
      expect(isSuperAdminRole('soporte')).toBe(false);
      expect(isSuperAdminRole('tecnico')).toBe(false);
      expect(isSuperAdminRole('it especializado')).toBe(false);
      expect(isSuperAdminRole('bi')).toBe(false);
      expect(isSuperAdminRole('administrador')).toBe(false);
      expect(isSuperAdminRole(undefined)).toBe(false);
    });
  });
});
