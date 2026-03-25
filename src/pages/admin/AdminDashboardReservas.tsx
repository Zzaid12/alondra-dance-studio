import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const AdminDashboardReservas = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState("");

    const { data: reservas = [], isLoading } = useQuery({
        queryKey: ["admin-reservas"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("admin_reservas_view" as any)
                .select("*")
                .order("fecha_creacion", { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    const filteredReservas = reservas.filter((r) => {
        const matchName = r.usuario_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.usuario_email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchDate = dateFilter ? r.fecha === dateFilter : true;
        return matchName && matchDate;
    });

    const totalReservas = reservas.length;
    const confirmadas = reservas.filter(r => r.estado === 'confirmada' || r.estado === 'completada').length;
    const canceladas = reservas.filter(r => r.estado === 'cancelada').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-white">Últimas Reservas</h1>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="admin-card rounded-2xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-white/50 mb-1">Total Histórico</p>
                        <p className="text-3xl font-bold text-white">{totalReservas}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                        <Filter className="w-6 h-6 text-white/40" />
                    </div>
                </div>
                <div className="admin-card rounded-2xl p-5 flex items-center justify-between border-b-2 sm:border-b-0 sm:border-l-2 border-[#10b981]/50">
                    <div>
                        <p className="text-sm text-white/50 mb-1">Confirmadas/Completadas</p>
                        <p className="text-3xl font-bold text-white">{confirmadas}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#10b981]/10 flex items-center justify-center">
                        <span className="w-3 h-3 rounded-full bg-[#10b981]" />
                    </div>
                </div>
                <div className="admin-card rounded-2xl p-5 flex items-center justify-between border-b-2 sm:border-b-0 sm:border-l-2 border-[#ef4444]/50">
                    <div>
                        <p className="text-sm text-white/50 mb-1">Canceladas</p>
                        <p className="text-3xl font-bold text-white">{canceladas}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#ef4444]/10 flex items-center justify-center">
                        <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="relative sm:w-[200px]">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="pl-9 bg-white/5 border-white/10 text-white [color-scheme:dark]"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="admin-card rounded-2xl overflow-hidden border border-white/10">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-white/5 hover:bg-white/5">
                            <TableRow className="border-white/10">
                                <TableHead className="text-white/60 font-medium">Usuario</TableHead>
                                <TableHead className="text-white/60 font-medium">Clase Reservada</TableHead>
                                <TableHead className="text-white/60 font-medium">Realizada el</TableHead>
                                <TableHead className="text-white/60 font-medium">Pago</TableHead>
                                <TableHead className="text-white/60 font-medium">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow className="border-white/10">
                                    <TableCell colSpan={5} className="text-center py-8 text-white/50">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-[#c084fc] border-t-transparent rounded-full animate-spin" />
                                            Cargando reservas...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredReservas.length === 0 ? (
                                <TableRow className="border-white/10">
                                    <TableCell colSpan={5} className="text-center py-8 text-white/50">
                                        No se encontraron reservas
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredReservas.map((r) => (
                                    <TableRow key={r.id} className="border-white/5 hover:bg-white/[0.02]">
                                        <TableCell>
                                            <div className="font-medium text-white">{r.usuario_nombre || 'Sin nombre'}</div>
                                            <div className="text-xs text-white/40">{r.usuario_email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-white">
                                                {r.fecha ? format(new Date(r.fecha), "dd MMM yyyy", { locale: es }) : 'N/A'}
                                            </div>
                                            <div className="text-xs text-white/50">
                                                {r.hora_inicio?.slice(0, 5)} - {r.hora_fin?.slice(0, 5)}
                                                <span className="mx-1">•</span>
                                                {r.tipo_reserva_nombre || `${r.numero_barras} barra(s)`}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-white/70">
                                            {format(new Date(r.fecha_creacion), "dd/MM/yy HH:mm", { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            {r.metodo_pago === 'bono' ? (
                                                <Badge variant="outline" className="bg-[#c084fc]/10 text-[#c084fc] border-[#c084fc]/20">
                                                    Bono
                                                </Badge>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <Badge variant="outline" className="bg-white/5 text-white/70 border-white/10 w-fit">
                                                        Entrada ({r.precio_pagado}€)
                                                    </Badge>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={`
                          ${r.estado === 'confirmada' || r.estado === 'completada' ? 'bg-[#10b981]/10 text-[#10b981]' : ''}
                          ${r.estado === 'cancelada' ? 'bg-[#ef4444]/10 text-[#ef4444]' : ''}
                          font-normal
                        `}
                                            >
                                                {r.estado.charAt(0).toUpperCase() + r.estado.slice(1)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardReservas;
