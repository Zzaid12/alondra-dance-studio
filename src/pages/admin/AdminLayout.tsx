import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
    LayoutDashboard,
    Users,
    Settings,
    BarChart3,
    Tag,
    LogOut,
    Menu,
    X,
    Shield,
    ChevronRight,
} from "lucide-react";

const navItems = [
    { to: "/admin", label: "Reservas", icon: LayoutDashboard, end: true },
    { to: "/admin/usuarios", label: "Usuarios", icon: Users },
    { to: "/admin/gestion", label: "Gestión", icon: Settings },
    { to: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3 },
    { to: "/admin/cupones", label: "Cupones", icon: Tag },
];

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/admin/login");
    };

    const Sidebar = ({ mobile = false }) => (
        <aside className={`
      ${mobile ? "fixed inset-0 z-50 flex" : "hidden lg:flex lg:flex-col lg:w-60 lg:min-h-screen"}
    `}>
            {/* Overlay on mobile */}
            {mobile && (
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className={`
        relative flex flex-col h-full bg-[#09090f] border-r border-white/8
        ${mobile ? "w-64 ml-0" : "w-60"}
      `}>
                {/* Logo */}
                <div className="flex items-center justify-between px-5 py-5 border-b border-white/6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#c084fc]/15 border border-[#c084fc]/25 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-[#c084fc]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white leading-none">Admin</p>
                            <p className="text-[10px] text-white/30 mt-0.5">Alondra Pole Space</p>
                        </div>
                    </div>
                    {mobile && (
                        <button onClick={() => setSidebarOpen(false)} className="text-white/40 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-0.5">
                    {navItems.map(({ to, label, icon: Icon, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            onClick={() => mobile && setSidebarOpen(false)}
                            className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150
                ${isActive
                                    ? "bg-[#c084fc]/12 text-[#c084fc] font-medium"
                                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                                }
              `}
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#c084fc]" : ""}`} />
                                    <span className="flex-1">{label}</span>
                                    {isActive && <ChevronRight className="w-3 h-3 text-[#c084fc]/60" />}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div className="px-3 pb-4 border-t border-white/6 pt-3">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/8 transition-all duration-150"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </div>
        </aside>
    );

    return (
        <div className="flex min-h-screen bg-[#07070d] text-white">
            {/* Desktop sidebar */}
            <Sidebar />

            {/* Mobile sidebar */}
            {sidebarOpen && <Sidebar mobile />}

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar (mobile) */}
                <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-[#09090f]">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-white/50 hover:text-white"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#c084fc]" />
                        <span className="text-sm font-medium text-white">Admin Panel</span>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>

            <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 999px; }
      `}</style>
        </div>
    );
};

export default AdminLayout;
