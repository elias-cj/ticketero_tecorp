import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import React from 'react';

// Mock supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const TestComponent = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? "Logged In" : "Logged Out"}</div>
      <div data-testid="user-name">{user?.name || "No User"}</div>
      <div data-testid="permissions">{JSON.stringify(user?.permissions || {})}</div>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should initialize with no user if localStorage is empty", async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(getByTestId("auth-status").textContent).toBe("Logged Out"));
  });

  it("should fetch permissions correctly on login via RPC", async () => {
    const mockUser = { id: "user-123", name: "Test User", email: "test@example.com" };
    const mockPermissionsMap = {
      Tickets: ["VER", "CREAR"],
    };

    // Mock roles_usuario lookup
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "roles_usuario") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ rol_id: "role-1" }], error: null })
        };
      }
      if (table === "usuarios") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { esta_activo: true }, error: null })
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    // Mock RPC call
    (supabase.rpc as any).mockImplementation((fn: string) => {
      if (fn === "obtener_permisos_usuario") {
        return Promise.resolve({ data: mockPermissionsMap, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const LoginTrigger = () => {
      const { login } = useAuth();
      return <button onClick={() => login(mockUser as any)}>Login</button>;
    };

    const { getByText, getByTestId } = render(
      <AuthProvider>
        <LoginTrigger />
        <TestComponent />
      </AuthProvider>
    );

    getByText("Login").click();

    await waitFor(() => {
      expect(getByTestId("auth-status").textContent).toBe("Logged In");
      const perms = JSON.parse(getByTestId("permissions").textContent || "{}");
      expect(perms.Tickets).toContain("VER");
      expect(perms.Tickets).toContain("CREAR");
    });
  });

  it("should handle error in permission fetching gracefully", async () => {
    const mockUser = { id: "user-123", name: "Test User" };

    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ rol_id: "role-1" }] })
    }));

    (supabase.rpc as any).mockImplementation(() => {
      return Promise.resolve({ data: null, error: new Error("DB RPC Error") });
    });

    const LoginTrigger = () => {
      const { login } = useAuth();
      return <button onClick={() => login(mockUser as any)}>Login</button>;
    };

    const { getByText, getByTestId } = render(
      <AuthProvider>
        <LoginTrigger />
        <TestComponent />
      </AuthProvider>
    );

    getByText("Login").click();

    await waitFor(() => {
      expect(getByTestId("auth-status").textContent).toBe("Logged In");
      const perms = JSON.parse(getByTestId("permissions").textContent || "{}");
      expect(Object.keys(perms).length).toBe(0);
    });
  });
});
