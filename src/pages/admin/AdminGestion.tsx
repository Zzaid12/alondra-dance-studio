import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, X, Check, Edit2, Plus, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

// --- Tab: Reservas ---
const ReservasTab = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");

    const { data: reservas = [], isLoading } = useQuery({
        queryKey: ["admin-gestion-reservas"],
        queryFn: async () => {
            // Solo reservas futuras o de hoy que estén confirmadas
            const today = new Date().toISOString().split("T")[0];
            const { data, error } = await supabase
                .from("admin_reservas_view" as any)
                .select("*")
                .gte("fecha", today)
                .eq("estado", "confirmada")
                .order("fecha", { ascending: true })
                .order("hora_inicio", { ascending: true });

            if (error) throw error;
            return data;
        },
    });

    const cancelReserva = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase
                .from("reservas")
                .update({ estado: "cancelada", fecha_cancelacion: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-gestion-reservas"] });
            queryClient.invalidateQueries({ queryKey: ["admin-reservas"] });
            toast({ title: "Reserva cancelada" });
        },
    });

    const filtered = reservas.filter((r: any) =>
        r.usuario_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.usuario_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                <div>
                    <h3 className="text-white font-medium">Próximas Reservas</h3>
                    <p className="text-sm text-white/50">Cancela reservas activas. (No procesa reembolsos de Stripe automáticamente).</p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                        placeholder="Buscar usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-black/20 border-white/10 text-white"
                    />
                </div>
            </div>

            <div className="admin-card rounded-xl overflow-hidden border border-white/10">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10">
                            <TableHead className="text-white/60">Usuario</TableHead>
                            <TableHead className="text-white/60">Fecha y Hora</TableHead>
                            <TableHead className="text-white/60">Tipo</TableHead>
                            <TableHead className="text-white/60 text-right">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#c084fc]" /></TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-white/50">No hay reservas próximas</TableCell></TableRow>
                        ) : (
                            filtered.map((r: any) => (
                                <TableRow key={r.id} className="border-white/5">
                                    <TableCell>
                                        <div className="text-white text-sm">{r.usuario_nombre || 'Sin nombre'}</div>
                                        <div className="text-white/40 text-xs">{r.usuario_email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-white text-sm">{format(new Date(r.fecha), "dd MMM yyyy", { locale: es })}</div>
                                        <div className="text-white/50 text-xs">{r.hora_inicio?.slice(0, 5)} - {r.hora_fin?.slice(0, 5)}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-white/10 text-white/70">
                                            {r.tipo_reserva_nombre || `${r.numero_barras} barras`}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <button
                                            onClick={() => {
                                                if (confirm(`¿Seguro que quieres cancelar la reserva de ${r.usuario_nombre}?`)) {
                                                    cancelReserva.mutate(r.id);
                                                }
                                            }}
                                            disabled={cancelReserva.isPending}
                                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

// --- Tab: Bonos ---
const BonosTab = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editVal, setEditVal] = useState("");

    const { data: bonos = [], isLoading } = useQuery({
        queryKey: ["admin-gestion-bonos"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("admin_bonos_view" as any)
                .select("*")
                .in("estado", ["activo", "agotado"])
                .order("fecha_compra", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const updateBono = useMutation({
        mutationFn: async ({ id, restantes }: { id: number, restantes: number }) => {
            const { error } = await supabase
                .from("bonos_usuario")
                .update({ clases_restantes: restantes, estado: restantes > 0 ? 'activo' : 'agotado' })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-gestion-bonos"] });
            setEditingId(null);
            toast({ title: "Bono actualizado" });
        },
    });

    const filtered = bonos.filter((b: any) =>
        b.usuario_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.usuario_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                <div>
                    <h3 className="text-white font-medium">Bonos de Usuarios</h3>
                    <p className="text-sm text-white/50">Ajusta manualmente el número de clases restantes de un bono.</p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                        placeholder="Buscar usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-black/20 border-white/10 text-white"
                    />
                </div>
            </div>

            <div className="admin-card rounded-xl overflow-hidden border border-white/10">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10">
                            <TableHead className="text-white/60">Usuario</TableHead>
                            <TableHead className="text-white/60">Tipo Bono</TableHead>
                            <TableHead className="text-white/60">Caducidad</TableHead>
                            <TableHead className="text-white/60 text-center">Clases Restantes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#c084fc]" /></TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-white/50">No hay bonos activos</TableCell></TableRow>
                        ) : (
                            filtered.map((b: any) => (
                                <TableRow key={b.id} className="border-white/5">
                                    <TableCell>
                                        <div className="text-white text-sm">{b.usuario_nombre || 'Sin nombre'}</div>
                                        <div className="text-white/40 text-xs">{b.usuario_email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-white text-sm">{b.tipo_bono_nombre}</div>
                                        <Badge variant="outline" className={`mt-1 text-[10px] ${b.estado === 'activo' ? 'text-green-400 border-green-400/20' : 'text-red-400 border-red-400/20'}`}>
                                            {b.estado.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-white/60 text-sm">
                                        {b.fecha_caducidad ? format(new Date(b.fecha_caducidad), "dd/MM/yyyy") : 'Sin caducidad'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-2">
                                            {editingId === b.id ? (
                                                <>
                                                    <Input
                                                        type="number"
                                                        value={editVal}
                                                        onChange={(e) => setEditVal(e.target.value)}
                                                        className="w-16 h-8 text-center bg-black/20 border-white/20 text-white"
                                                    />
                                                    <button onClick={() => setEditingId(null)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                                                    <button
                                                        onClick={() => updateBono.mutate({ id: b.id, restantes: parseInt(editVal, 10) })}
                                                        className="text-green-400 hover:text-green-300"
                                                    >
                                                        {updateBono.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className={`text-lg font-bold ${b.clases_restantes === 0 ? 'text-red-400' : 'text-white'}`}>
                                                        {b.clases_restantes} <span className="text-xs text-white/40 font-normal">/ {b.clases_totales}</span>
                                                    </span>
                                                    <button
                                                        onClick={() => { setEditingId(b.id); setEditVal(b.clases_restantes.toString()); }}
                                                        className="text-white/30 hover:text-[#c084fc] p-1"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

// --- Tab: Bloqueos ---
const BloqueosTab = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [selectedFranja, setSelectedFranja] = useState<string>("");
    const [barras, setBarras] = useState<string>("1");

    // Fetch franjas (to select from)
    const { data: franjas = [] } = useQuery({
        queryKey: ["admin-gestion-franjas-lista"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("franjas_horarias")
                .select("id, hora_inicio, hora_fin, dia_semana")
                .eq("activo", true)
                .order("hora_inicio");
            if (error) throw error;
            return data;
        }
    });

    // Fetch active reservations/blocks to show
    const { data: bloqueos = [], isLoading } = useQuery({
        queryKey: ["admin-gestion-bloqueos"],
        queryFn: async () => {
            const today = new Date().toISOString().split("T")[0];
            const { data, error } = await supabase
                .from("reservas")
                .select(`
                    id,
                    fecha,
                    numero_barras,
                    franjas_horarias ( hora_inicio, hora_fin )
                `)
                .eq("estado", "confirmada")
                .eq("metodo_pago", "admin_manual")
                .gte("fecha", today)
                .order("fecha", { ascending: true });

            if (error) throw error;
            return data;
        }
    });

    const createBloqueo = useMutation({
        mutationFn: async () => {
            if (!date || !selectedFranja) throw new Error("Faltan datos");

            // Get a special internal user ID for admin blocks (or fallback to current admin)
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData.user?.id;

            // Encontrar el tipo ID de la franja (opcional pero requerido por schema)
            const franjaObj = franjas.find(f => f.id.toString() === selectedFranja);

            const { error } = await supabase
                .from("reservas")
                .insert({
                    usuario_id: userId,
                    fecha: format(date, "yyyy-MM-dd"),
                    franja_horaria_id: parseInt(selectedFranja),
                    tipo_reserva_id: 1, // Fallback safe
                    numero_barras: parseInt(barras),
                    metodo_pago: "admin_manual",
                    estado: "confirmada",
                    precio_pagado: 0
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-gestion-bloqueos"] });
            queryClient.invalidateQueries({ queryKey: ["admin-gestion-reservas"] });
            toast({ title: "Reserva manual creada" });
            setSelectedFranja("");
            setBarras("1");
        },
        onError: (e: any) => {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    });

    const deleteBloqueo = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from("reservas").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-gestion-bloqueos"] });
            toast({ title: "Reserva manual eliminada" });
        }
    });

    // Filter franjas to only show the ones matching the selected date's day of week
    const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaSeleccionado = date ? diasSemana[date.getDay()] : '';
    const franjasDelDia = franjas.filter(f => f.dia_semana === diaSeleccionado);

    return (
        <div className="space-y-6">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
                <h3 className="text-white font-medium">Crear Reserva Manual</h3>
                <p className="text-sm text-white/50">Bloquea barras para un día y hora específicos. Ideal para reservas privadas o mantenimiento.</p>
            </div>

            <div className="admin-card rounded-xl border border-white/10 p-6 flex flex-col md:flex-row gap-6 items-end">
                <div className="grid gap-2 flex-1 w-full">
                    <label className="text-sm text-white/70">Fecha</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal bg-black/20 border-white/10 text-white hover:bg-white/5 hover:text-white",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-[#0f0f13] border-white/10 text-white">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="grid gap-2 flex-1 w-full">
                    <label className="text-sm text-white/70">Franja Horaria ({franjasDelDia.length} disponibles)</label>
                    <Select value={selectedFranja} onValueChange={setSelectedFranja} disabled={!date || franjasDelDia.length === 0}>
                        <SelectTrigger className="bg-black/20 border-white/10 text-white">
                            <SelectValue placeholder="Selecciona hora" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a24] border-white/10 text-white">
                            {franjasDelDia.map((f: any) => (
                                <SelectItem key={f.id} value={f.id.toString()}>
                                    {f.hora_inicio.slice(0, 5)} - {f.hora_fin.slice(0, 5)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2 w-full md:w-32">
                    <label className="text-sm text-white/70">Nº Barras</label>
                    <Select value={barras} onValueChange={setBarras}>
                        <SelectTrigger className="bg-black/20 border-white/10 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a24] border-white/10 text-white">
                            <SelectItem value="1">1 barra</SelectItem>
                            <SelectItem value="2">2 barras</SelectItem>
                            <SelectItem value="3">3 barras (Clase full)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <button
                    onClick={() => createBloqueo.mutate()}
                    disabled={createBloqueo.isPending || !date || !selectedFranja}
                    className="flex items-center gap-2 bg-[#c084fc] hover:bg-[#a855f7] text-white px-6 py-2 h-10 rounded-xl text-sm justify-center transition-colors disabled:opacity-50 w-full md:w-auto"
                >
                    {createBloqueo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Bloquear
                </button>
            </div>

            <div className="pt-4">
                <h4 className="text-white font-medium mb-4">Bloqueos Manuales Activos</h4>
                <div className="admin-card rounded-xl overflow-hidden border border-white/10">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/10">
                                <TableHead className="text-white/60">Fecha</TableHead>
                                <TableHead className="text-white/60">Horario</TableHead>
                                <TableHead className="text-white/60">Barras Bloqueadas</TableHead>
                                <TableHead className="text-white/60 text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-[#c084fc]" /></TableCell></TableRow>
                            ) : bloqueos.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-white/50">No hay bloqueos activos</TableCell></TableRow>
                            ) : (
                                bloqueos.map((b: any) => (
                                    <TableRow key={b.id} className="border-white/5">
                                        <TableCell className="text-white">
                                            {format(new Date(b.fecha), "dd MMM yyyy", { locale: es })}
                                        </TableCell>
                                        <TableCell className="text-white">
                                            {b.franjas_horarias?.hora_inicio?.slice(0, 5)} - {b.franjas_horarias?.hora_fin?.slice(0, 5)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="border-white/10 text-white/70">
                                                {b.numero_barras} {b.numero_barras === 1 ? 'barra' : 'barras'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <button
                                                onClick={() => deleteBloqueo.mutate(b.id)}
                                                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-lg transition-colors inline-block"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
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

// --- Main Component ---
const AdminGestion = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Gestión de Plataforma</h1>
            </div>

            <Tabs defaultValue="reservas" className="w-full">
                <TabsList className="bg-white/5 border border-white/10 p-1 w-full sm:w-auto grid grid-cols-3 mb-6">
                    <TabsTrigger value="reservas" className="data-[state=active]:bg-[#c084fc]/20 data-[state=active]:text-[#c084fc] text-white/60">Reservas</TabsTrigger>
                    <TabsTrigger value="bonos" className="data-[state=active]:bg-[#c084fc]/20 data-[state=active]:text-[#c084fc] text-white/60">Bonos</TabsTrigger>
                    <TabsTrigger value="franjas" className="data-[state=active]:bg-[#c084fc]/20 data-[state=active]:text-[#c084fc] text-white/60">Bloqueos</TabsTrigger>
                </TabsList>
                <TabsContent value="reservas"><ReservasTab /></TabsContent>
                <TabsContent value="bonos"><BonosTab /></TabsContent>
                <TabsContent value="franjas"><BloqueosTab /></TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminGestion;
