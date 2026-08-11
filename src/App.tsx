import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CreateTicket from "./pages/CreateTicket";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { TicketListView as TicketList } from "./features/tickets/views/TicketListView";
import ChangePassword from "./pages/ChangePassword";
import InternalLayout from "./components/InternalLayout";

import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./contexts/AuthContext";
import { SystemProvider } from "./contexts/SystemContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy-loaded views for code splitting and fast initial bundle load
const Tasks = lazy(() => import("./pages/Tasks"));
const Schedules = lazy(() => import("./pages/Schedules"));
const Solutions = lazy(() => import("./pages/Solutions"));
const Wiki = lazy(() => import("./pages/Wiki"));
const Configuration = lazy(() => import("./pages/Configuration"));
const ProblemTypes = lazy(() => import("./pages/ProblemTypes"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Licenses = lazy(() => import("./pages/Licenses"));
const CallCenters = lazy(() => import("./pages/CallCenters"));
const SoporteTecnico = lazy(() => import("./pages/SoporteTecnico"));
const ITEspecializado = lazy(() => import("./pages/ITEspecializado"));
const Export = lazy(() => import("./pages/Export"));

const PageLoader = () => (
  <div className="min-h-[400px] flex items-center justify-center">
    <Loader2 className="h-8 w-8 text-primary animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SystemProvider>
          <AuthProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/crear-ticket" element={<CreateTicket />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/cambiar-password" element={<ChangePassword />} />

                  {/* Internal routes (All Protected) */}
                  <Route element={<ProtectedRoute><InternalLayout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={
                      <ProtectedRoute requiredPermission={{ module: "Dashboard", action: "VER" }}>
                        <Dashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/tickets" element={
                      <ProtectedRoute requiredPermission={{ module: "Tickets", action: "VER" }}>
                        <TicketList />
                      </ProtectedRoute>
                    } />
                    <Route path="/tareas" element={
                      <ProtectedRoute requiredPermission={{ module: "Tareas", action: "VER" }}>
                        <Tasks />
                      </ProtectedRoute>
                    } />
                    <Route path="/horarios" element={
                      <ProtectedRoute requiredPermission={{ module: "Horarios", action: "VER" }}>
                        <Schedules />
                      </ProtectedRoute>
                    } />
                    <Route path="/soluciones" element={
                      <ProtectedRoute requiredPermission={{ module: "Soluciones", action: "VER" }}>
                        <Solutions />
                      </ProtectedRoute>
                    } />
                    <Route path="/tipos-problema" element={
                      <ProtectedRoute requiredPermission={{ module: "Tipos de Problema", action: "VER" }}>
                        <ProblemTypes />
                      </ProtectedRoute>
                    } />

                    <Route path="/wiki" element={<Wiki />} />
                    
                    {/* Admin-only routes */}
                    <Route path="/configuracion" element={
                      <ProtectedRoute requiredPermission={{ module: "Configuración", action: "VER" }}>
                        <Configuration />
                      </ProtectedRoute>
                    } />
                    <Route path="/inventario" element={
                      <ProtectedRoute requiredPermission={{ module: "Inventario", action: "VER" }}>
                        <Inventory />
                      </ProtectedRoute>
                    } />
                    <Route path="/licencias" element={
                      <ProtectedRoute requiredPermission={{ module: "Licencias", action: "VER" }}>
                        <Licenses />
                      </ProtectedRoute>
                    } />
                    <Route path="/call-centers" element={
                      <ProtectedRoute requiredPermission={{ module: "Call Centers", action: "VER" }}>
                        <CallCenters />
                      </ProtectedRoute>
                    } />
                    <Route path="/soporte-tecnico" element={
                      <ProtectedRoute requiredPermission={{ module: "Usuarios", action: "VER" }}>
                        <SoporteTecnico />
                      </ProtectedRoute>
                    } />
                    <Route path="/it-especializado" element={
                      <ProtectedRoute requiredPermission={{ module: "Usuarios", action: "VER" }}>
                        <ITEspecializado />
                      </ProtectedRoute>
                    } />
                    <Route path="/exportar" element={
                      <ProtectedRoute requiredPermission={{ module: "Exportación", action: "VER" }}>
                        <Export />
                      </ProtectedRoute>
                    } />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </SystemProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
