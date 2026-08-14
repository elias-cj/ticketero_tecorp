import "@testing-library/jest-dom";

// Variables de entorno globales para suites de pruebas
process.env.JWT_SECRET = 'support_connect_test_secret_key_2026_at_least_32_chars!';
process.env.DATABASE_URL = 'postgresql://postgres:test@127.0.0.1:5432/ticketero_test';

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
