import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, isAfter, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from "recharts";
import { Loader2, TrendingUp, CreditCard, Ticket } from "lucide-react";

const AdminEstadisticas = () => {
    const { data: bonos = [], isLoading: isLoadingBonos } = useQuery({
        queryKey: ["admin-stats-bonos"],
        queryFn: async () => {
            const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
            const { data, error } = await supabase
                .from("admin_bonos_view" as any)
                .select("*")
                .gte("fecha_compra", sixMonthsAgo);
            if (error) throw error;
            return data;
        },
    });

    const { data: pagos = [], isLoading: isLoadingPagos } = useQuery({
        queryKey: ["admin-stats-pagos"],
        queryFn: async () => {
            const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
            const { data, error } = await supabase
                .from("pagos")
                .select("*")
                .eq("estado", "completado")
                .gte("fecha_pago", sixMonthsAgo);
            if (error) throw error;
            return data;
        },
    });

    // Procesar datos para gráficos
    const { ingresosPorMes, bonosPorMes, rankingBonos, kpis } = useMemo(() => {
        const ingresosMap = new Map<string, number>();
        let totalIngresos = 0;

        pagos.forEach(p => {
            const date = new Date(p.fecha_pago);
            const monthStr = format(startOfMonth(date), 'MMM yy', { locale: es });
            ingresosMap.set(monthStr, (ingresosMap.get(monthStr) || 0) + Number(p.cantidad));
            totalIngresos += Number(p.cantidad);
        });

        const bonosMap = new Map<string, number>();
        const rankingMap = new Map<string, { nombre: string; cantidad: number; ingresos: number }>();
        let bonosActivos = 0;

        bonos.forEach((b: any) => {
            const date = new Date(b.fecha_compra);
            const monthStr = format(startOfMonth(date), 'MMM yy', { locale: es });
            bonosMap.set(monthStr, (bonosMap.get(monthStr) || 0) + 1);

            if (b.estado === 'activo') bonosActivos++;

            const tipo = b.tipo_bono_nombre || 'Desconocido';
            const actual = rankingMap.get(tipo) || { nombre: tipo, cantidad: 0, ingresos: 0 };
            rankingMap.set(tipo, {
                nombre: tipo,
                cantidad: actual.cantidad + 1,
                // (No tenemos el precio exacto del bono en la vista, asumimos 0 para demo o lo sacamos de pagos)
                ingresos: actual.ingresos
            });
        });

        // Formatear arrays para recharts
        const chartIngresos = Array.from(ingresosMap.entries())
            .map(([mes, total]) => ({ mes, total }))
            .reverse(); // Simplified: should ideally sort by date, but since we query last 6 months grouping by month, Map keeps insertion order. Actually we should generate the last 6 months keys to ensure order.

        // Better sort
        const monthsKeys = Array.from({ length: 6 }, (_, i) => format(startOfMonth(subMonths(new Date(), 5 - i)), 'MMM yy', { locale: es }));

        const finalIngresos = monthsKeys.map(mes => ({
            mes,
            total: ingresosMap.get(mes) || 0
        }));

        const finalBonos = monthsKeys.map(mes => ({
            mes,
            cantidad: bonosMap.get(mes) || 0
        }));

        const sortedRanking = Array.from(rankingMap.values()).sort((a, b) => b.cantidad - a.cantidad);

        // Unique users in 6 months
        const uniqueUsers = new Set(pagos.map(p => p.usuario_id)).size;
        const mediaPorUsuario = uniqueUsers > 0 ? (totalIngresos / uniqueUsers) : 0;

        return {
            ingresosPorMes: finalIngresos,
            bonosPorMes: finalBonos,
            rankingBonos: sortedRanking,
            kpis: {
                totalIngresos,
                bonosActivos,
                mediaPorUsuario
            }
        };
    }, [bonos, pagos]);

    const isLoading = isLoadingBonos || isLoadingPagos;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#c084fc]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Estadísticas (Últimos 6 meses)</h1>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="admin-card rounded-2xl p-6 flex flex-col justify-between border-t-2 border-[#10b981]">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-white/60">Ingresos Totales</p>
                        <div className="w-8 h-8 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-[#10b981]" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{kpis.totalIngresos.toFixed(2)}€</p>
                </div>

                <div className="admin-card rounded-2xl p-6 flex flex-col justify-between border-t-2 border-[#c084fc]">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-white/60">Bonos Activos Hoy</p>
                        <div className="w-8 h-8 rounded-lg bg-[#c084fc]/20 flex items-center justify-center">
                            <Ticket className="w-4 h-4 text-[#c084fc]" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{kpis.bonosActivos}</p>
                </div>

                <div className="admin-card rounded-2xl p-6 flex flex-col justify-between border-t-2 border-[#60a5fa]">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-white/60">Gasto Medio p/Usuario</p>
                        <div className="w-8 h-8 rounded-lg bg-[#60a5fa]/20 flex items-center justify-center">
                            <CreditCard className="w-4 h-4 text-[#60a5fa]" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{kpis.mediaPorUsuario.toFixed(2)}€</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ingresos Chart */}
                <div className="admin-card rounded-2xl p-6 border border-white/10">
                    <h3 className="text-white font-medium mb-6">Evolución de Ingresos</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={ingresosPorMes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="mes" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f0f13', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    itemStyle={{ color: '#10b981' }}
                                    formatter={(value: number) => [`${value.toFixed(2)}€`, 'Ingresos']}
                                />
                                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bonos Chart */}
                <div className="admin-card rounded-2xl p-6 border border-white/10">
                    <h3 className="text-white font-medium mb-6">Bonos Vendidos</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bonosPorMes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="mes" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#0f0f13', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    itemStyle={{ color: '#c084fc' }}
                                    formatter={(value: number) => [value, 'Bonos']}
                                />
                                <Bar dataKey="cantidad" fill="#c084fc" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Ranking Bonos */}
            <div className="admin-card rounded-2xl p-6 border border-white/10">
                <h3 className="text-white font-medium mb-4">Tipos de bono más vendidos</h3>
                <div className="space-y-3">
                    {rankingBonos.map((rb, idx) => (
                        <div key={rb.nombre} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white/50">
                                    #{idx + 1}
                                </div>
                                <span className="text-white">{rb.nombre}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-white">{rb.cantidad}</span>
                                <span className="text-xs text-white/40 ml-1">vendidos</span>
                            </div>
                        </div>
                    ))}
                    {rankingBonos.length === 0 && (
                        <div className="text-center py-4 text-white/40">No hay ventas registradas en los últimos 6 meses.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminEstadisticas;
