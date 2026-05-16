import { useState } from "react";
import { Button } from "./button";
import { Menu, X, User, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  if (location.pathname.startsWith("/admin")) return null;

  const navItems = [
    { href: "/#pricing", label: "Ver Precios" },
    ...(user ? [
      { href: "/reservar", label: "Reservar" },
    ] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleHashLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const hashMatch = href.match(/#(.+)$/);
    if (hashMatch) {
      const hash = hashMatch[1];
      const targetId = hash;

      if (location.pathname === "/") {
        // Ya estamos en la página principal, hacer scroll directamente
        e.preventDefault();
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          // Actualizar la URL con el hash sin recargar
          window.history.pushState(null, "", `/#${targetId}`);
        }
      } else {
        // Estamos en otra página, navegar primero y luego hacer scroll
        e.preventDefault();
        navigate("/", { state: { scrollTo: targetId } });
        // Pequeño delay para asegurar que el componente se monte antes de hacer scroll
        setTimeout(() => {
          const element = document.getElementById(targetId);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
            window.history.pushState(null, "", `/#${targetId}`);
          }
        }, 300);
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-background border border-white/20">
              <img src="/logo.png" alt="Alondra Pole Space" className="h-full w-full object-cover scale-[1.20]" />
            </div>
            <span className="text-xl font-bold text-primary">Alondra Pole Space</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={(e) => handleHashLink(e, item.href)}
                className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === item.href ? "text-primary" : "text-muted-foreground"
                  }`}
              >
                {item.label}
              </Link>
            ))}

            {user ? (
              <Button variant="ghost" asChild className="flex items-center space-x-2">
                <Link to="/perfil">
                  <User className="w-4 h-4" />
                  <span className="hidden lg:inline">Mi Cuenta</span>
                </Link>
              </Button>
            ) : (
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  asChild
                  className="text-foreground hover:text-primary"
                >
                  <Link to="/auth">Iniciar Sesión</Link>
                </Button>
                <Button
                  variant="default"
                  asChild
                  className="bg-primary hover:bg-primary/90 text-white px-6"
                >
                  <Link to="/auth">Reservar Clase</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={(e) => {
                    handleHashLink(e, item.href);
                    setIsOpen(false);
                  }}
                  className={`text-sm font-medium transition-colors hover:text-primary px-2 py-1 rounded ${location.pathname === item.href ? "text-primary bg-primary/10" : "text-muted-foreground"
                    }`}
                >
                  {item.label}
                </Link>
              ))}

              {user ? (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    asChild
                    className="w-full justify-start"
                  >
                    <Link to="/perfil" onClick={() => setIsOpen(false)}>
                      <User className="w-4 h-4 mr-2" />
                      Mi Perfil
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    asChild
                    className="w-full justify-start"
                  >
                    <Link to="/auth" onClick={() => setIsOpen(false)}>
                      Iniciar Sesión
                    </Link>
                  </Button>
                  <Button
                    variant="default"
                    asChild
                    className="bg-primary hover:bg-primary/90 text-white w-full"
                  >
                    <Link to="/auth" onClick={() => setIsOpen(false)}>
                      Registrarse
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};