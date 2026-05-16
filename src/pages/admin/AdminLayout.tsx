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
    Globe,
} from "lucide-react";

const navItems = [
    { to: "/admin", label: "Reservas", icon: LayoutDashboard, end: true },
    { to: "/admin/usuarios", label: "Usuarios", icon: Users },
    { to: "/admin/gestion", label: "Gestión", icon: Settings },
    { to: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3 },
    { to: "/admin/cupones", label: "Cupones", icon: Tag },
    { to: "/", label: "Volver a la Web", icon: Globe },
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
      ${mobile ? "fixed inset-0 z-[100] flex" : "hidden lg:flex lg:flex-col lg:w-64 lg:min-h-screen"}
    `}>
            {/* Overlay on mobile */}
            {mobile && (
                <div
                    className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className={`
        relative flex flex-col h-full bg-[#0d0d15] border-r border-white/10
        ${mobile ? "w-[280px] max-w-[85vw] animate-in slide-in-from-left duration-300 shadow-2xl" : "w-64"}
      `}>
                {/* Logo Section */}
                <div className="flex items-center justify-between px-6 py-7 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#c084fc]/10 border border-[#c084fc]/20 flex items-center justify-center shadow-[0_0_15px_rgba(192,132,252,0.1)]">
                            <Shield className="w-4 h-4 text-[#c084fc]" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white tracking-tight leading-none">Admin Panel</p>
                            <p className="text-[10px] text-white/30 mt-1 uppercase tracking-wider font-medium">Alondra Studio</p>
                        </div>
                    </div>
                    {mobile && (
                        <button 
                            onClick={() => setSidebarOpen(false)} 
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Nav Section with scrolling */}
                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
                    <div className="px-3 mb-4">
                        <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.2em]">Menú Principal</p>
                    </div>
                    {navItems.map(({ to, label, icon: Icon, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            onClick={() => mobile && setSidebarOpen(false)}
                            className={({ isActive }) => `
                flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm transition-all duration-200
                ${isActive
                                    ? "bg-[#c084fc]/15 text-[#c084fc] font-semibold shadow-[inset_0_0_20px_rgba(192,132,252,0.05)]"
                                    : "text-white/50 hover:text-white hover:bg-white/[0.03]"
                                }
              `}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`
                                        p-1.5 rounded-lg transition-colors
                                        ${isActive ? "text-[#c084fc]" : "text-white/30"}
                                    `}>
                                        <Icon className="w-4 h-4 shrink-0" />
                                    </div>
                                    <span className="flex-1">{label}</span>
                                    {isActive && (
                                        <div className="w-1 h-4 rounded-full bg-[#c084fc] shadow-[0_0_8px_rgba(192,132,252,0.5)]" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer Section */}
                <div className="px-4 py-6 border-t border-white/5 bg-white/[0.01]">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3.5 w-full px-4 py-3 rounded-2xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
                    >
                        <div className="p-1.5 rounded-lg text-white/20 group-hover:text-red-400/50 transition-colors">
                            <LogOut className="w-4 h-4" />
                        </div>
                        <span className="font-medium">Finalizar sesión</span>
                    </button>
                    
                    {/* User Info Placeholder */}
                    <div className="mt-4 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#c084fc] to-[#a855f7] flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">Administrador</p>
                            <p className="text-[10px] text-white/30 truncate">Gestión de studio</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-[#07070d] text-white">
            {/* Desktop sidebar */}
            <Sidebar />

            {/* Mobile sidebar */}
            {sidebarOpen && <Sidebar mobile />}

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0 h-full">
                {/* Topbar (mobile) */}
                <header className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#0d0d15]/80 backdrop-blur-xl sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-sm"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[#c084fc]/10 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-[#c084fc]" />
                            </div>
                            <span className="text-sm font-bold text-white tracking-tight">Admin</span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 custom-scrollbar relative">
                    {/* Background glow effect */}
                    <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-[#c084fc]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
                    
                    <div className="max-w-7xl mx-auto w-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 999px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
                
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-in-from-left { from { transform: translateX(-100%); } to { transform: translateX(0); } }
                
                .animate-in {
                    animation-duration: 300ms;
                    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                    animation-fill-mode: forwards;
                }
                .fade-in { animation-name: fade-in; }
                .slide-in-from-left { animation-name: slide-in-from-left; }
            `}</style>
        </div>
    );
};

export default AdminLayout;
