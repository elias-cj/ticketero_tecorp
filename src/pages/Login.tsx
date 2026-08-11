import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, Shield, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type Step = "credentials" | "role-select";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [step, setStep] = useState<Step>("credentials");
  const [pendingProfile, setPendingProfile] = useState<any>(null);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Ingresa tus credenciales"); return; }
    setIsLoading(true);
    setError("");

    // ── Autenticación segura: validación de contraseña en servidor (sin exponer hash) ──
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('login_seguro', { p_email: email, p_password: password });

    if (rpcError || !rpcResult?.success) {
      setError(rpcResult?.message || "Correo o contraseña incorrectos");
      setIsLoading(false);
      return;
    }

    const profile = { ...rpcResult.user, token: rpcResult.token, roles: rpcResult.roles || rpcResult.user?.roles || [], permissions: rpcResult.permissions || {} };

    // Verificar si la cuenta de usuario está activa
    // Verificar si debe cambiar contraseña (estilo Active Directory)
    if (profile.debe_cambiar_password) {
      setIsLoading(false);
      // Guardar email Y userId en sessionStorage para la pantalla de cambio
      sessionStorage.setItem('pending_password_change_email', email);
      sessionStorage.setItem('pending_password_change_id', profile.id);
      sessionStorage.setItem('pending_password_change_token', profile.token);
      navigate("/cambiar-password");
      return;
    }

    const roles = profile.roles || [];
    setIsLoading(false);

    if (roles.length === 0) {
      const roleKey = mapRoleName("soporte");
      login({
        id: profile.id,
        email: profile.email,
        role: roleKey,
        name: profile.nombre_completo,
        userId: profile.id,
        token: profile.token,
        permissions: profile.permissions
      });
      navigate("/dashboard");
    } else if (roles.length === 1) {
      const roleKey = mapRoleName(roles[0].nombre);
      login({
        id: profile.id,
        email: profile.email,
        role: roleKey,
        name: profile.nombre_completo,
        userId: profile.id,
        roleName: roles[0].nombre,
        activeRoleId: roles[0].id,
        token: profile.token,
        permissions: profile.permissions
      }, roles[0].id);
      navigate(roleKey === "bi" ? "/exportar" : "/dashboard");
    } else {
      // Múltiples roles: mostrar selector
      setPendingProfile(profile);
      setAvailableRoles(roles);
      setStep("role-select");
    }
  };

  const selectRole = (role: any) => {
    const roleKey = mapRoleName(role.nombre);
    login({
      id: pendingProfile.id,
      email: pendingProfile.email,
      role: roleKey,
      name: pendingProfile.nombre_completo,
      userId: pendingProfile.id,
      roleName: role.nombre,
      activeRoleId: role.id,
      token: pendingProfile.token,
      permissions: pendingProfile.permissions
    }, role.id);
    navigate(roleKey === "bi" ? "/exportar" : "/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative items-center justify-center p-12 overflow-hidden">
        <div className="relative z-10 max-w-md">
          <img src="/logo_tecorp.png" alt="TECORP" className="h-10 w-auto mb-4" />
          <p className="text-[10px] text-primary-foreground/60 uppercase tracking-widest mb-8">Tecnología Corporativa</p>
          <h2 className="text-2xl font-bold text-primary-foreground mb-4">Centro de Monitoreo de Soporte</h2>
          <p className="text-primary-foreground/80 mb-8">
            Plataforma de gestión de tickets para call centers multinacionales. Monitoreo en tiempo real.
          </p>
          <div className="space-y-3 text-sm text-primary-foreground/70">
            <p>✓ Gestión multinivel de tickets</p>
            <p>✓ Dashboard y métricas en tiempo real</p>
            <p>✓ Soporte multi-site multinacional</p>
            <p>✓ Integración WhatsApp directa</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>

        <AnimatePresence mode="wait">

          {/* STEP 1: Credenciales */}
          {step === "credentials" && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-sm"
            >
              <div className="lg:hidden mb-8">
                <img src="/logo_tecorp.png" alt="TECORP" className="h-9 w-auto" />
                <p className="text-[9px] mt-1 text-muted-foreground uppercase tracking-widest">Tecnología Corporativa</p>
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-1">Iniciar Sesión</h2>
              <p className="text-muted-foreground mb-8">Acceso al centro de monitoreo</p>

              {error && <div className="bg-destructive/10 text-destructive text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Correo electrónico</Label>
                  <Input type="email" placeholder="tu@ejemplo.com" value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contraseña</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••"
                      value={password} onChange={e => { setPassword(e.target.value); setError(""); }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full gap-2" disabled={isLoading}>
                  <Lock className="h-4 w-4" />
                  {isLoading ? "Verificando..." : "Ingresar"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Volver al inicio</Link>
              </div>

              {/*<div className="mt-8 p-4 bg-muted rounded-lg text-xs text-muted-foreground">
                <p className="font-semibold mb-1">Acceso Demo:</p>
                <p>Usuario: <span className="text-foreground font-medium">juan.perez@tecorp.com</span></p>
                <p>Contraseña: <span className="text-foreground font-medium">cualquier valor</span></p>
              </div>*/}
            </motion.div>
          )}

          {/* STEP 2: Selección de Rol */}
          {step === "role-select" && (
            <motion.div
              key="role-select"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full max-w-sm"
            >
              <div className="text-center mb-8">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Seleccionar Perfil</h2>
                <p className="text-muted-foreground text-sm">
                  Hola <span className="font-bold text-foreground">{pendingProfile?.nombre_completo}</span>, tienes múltiples roles. ¿Con cuál deseas ingresar?
                </p>
              </div>

              <div className="space-y-3">
                {availableRoles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => selectRole(role)}
                    className="w-full text-left p-4 rounded-xl border border-border/60 bg-card hover:border-primary hover:bg-primary/5 transition-all group flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{role.nombre}</p>
                        {role.descripcion && (
                          <p className="text-xs text-muted-foreground">{role.descripcion}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep("credentials")}
                className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ← Cambiar de cuenta
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

// Mapea nombre del rol de BD al código de rol interno
function mapRoleName(name: string): string {
  const n = name.toLowerCase().trim();
  if (n.includes("supremo") || n.includes("super")) return "superadmin";
  if (n.includes("admin")) return "admin";
  if (n.includes("it") || n.includes("especializado")) return "it";
  if (n.includes("bi")) return "bi";
  if (n.includes("autorizado")) return "usuario autorizado";
  if (n.includes("agente")) return "agente";
  return n;
}


export default Login;
