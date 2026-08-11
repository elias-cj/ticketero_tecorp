import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const ChangePassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem('pending_password_change_email');
    const pendingId = sessionStorage.getItem('pending_password_change_id');
    // Requiere TANTO el email como el userId — si falta cualquiera, regresa al login
    if (!pendingEmail || !pendingId) {
      navigate("/login");
    } else {
      setEmail(pendingEmail);
      setUserId(pendingId);
    }
  }, [navigate]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 12) {
      toast.error("La contraseña debe tener al menos 12 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (!userId) {
      toast.error("Sesión inválida. Por favor inicia sesión de nuevo.");
      navigate("/login");
      return;
    }

    setIsLoading(true);

    try {
      // Usar el RPC seguro: la contraseña se hashea con pgcrypto en el servidor
      const { data: result, error } = await supabase
        .rpc('cambiar_password_seguro', {
          p_user_id: userId,
          p_new_password: password
        });

      if (error || !result?.success) {
        throw new Error(result?.message || error?.message || "Error desconocido");
      }

      toast.success("Contraseña actualizada con éxito. Inicia sesión con tu nueva clave.");
      sessionStorage.removeItem('pending_password_change_email');
      sessionStorage.removeItem('pending_password_change_id');
      sessionStorage.removeItem('pending_password_change_token');

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err: any) {
      console.error(err);
      toast.error("Error al actualizar la contraseña: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-border/50 bg-primary/5 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Actualización Requerida</h2>
          <p className="text-muted-foreground text-sm mt-2">
            Por política de seguridad, debes cambiar tu contraseña para continuar.
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="p-8 space-y-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nueva Contraseña</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-12 bg-background"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Confirmar Contraseña</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="h-12 bg-background"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2"
              disabled={isLoading}
            >
              {isLoading ? "Actualizando..." : "Actualizar Contraseña"}
              {!isLoading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            <span>Tu contraseña será encriptada antes de ser almacenada.</span>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ChangePassword;
