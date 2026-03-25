import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminSetup2FA from "./pages/admin/AdminSetup2FA";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboardReservas from "./pages/admin/AdminDashboardReservas";
import AdminDashboardUsuarios from "./pages/admin/AdminDashboardUsuarios";
import AdminGestion from "./pages/admin/AdminGestion";
import AdminEstadisticas from "./pages/admin/AdminEstadisticas";
import AdminCupones from "./pages/admin/AdminCupones";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Booking from "./pages/Booking";
import Bonos from "./pages/Bonos";
import ReservaConfirmada from "./pages/ReservaConfirmada";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Normas from "./pages/Normas";
import AvisoLegal from "./pages/AvisoLegal";
import Privacidad from "./pages/Privacidad";
import Sesiones from "./pages/Sesiones";
import Gallery from "./pages/Gallery";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Navigation />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/reservar" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
            <Route path="/bonos" element={<ProtectedRoute><Bonos /></ProtectedRoute>} />
            <Route path="/reserva-confirmada" element={<ProtectedRoute><ReservaConfirmada /></ProtectedRoute>} />
            <Route path="/normas" element={<Normas />} />
            <Route path="/aviso-legal" element={<AvisoLegal />} />
            <Route path="/privacidad" element={<Privacidad />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/resetpassword" element={<ResetPassword />} />
            <Route path="/sesiones" element={<ProtectedRoute><Sesiones /></ProtectedRoute>} />
            <Route path="/galeria" element={<Gallery />} />

            {/* Admin — public routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/setup-2fa" element={<AdminSetup2FA />} />

            {/* Admin — protected routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboardReservas />} />
              <Route path="usuarios" element={<AdminDashboardUsuarios />} />
              <Route path="gestion" element={<AdminGestion />} />
              <Route path="estadisticas" element={<AdminEstadisticas />} />
              <Route path="cupones" element={<AdminCupones />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
