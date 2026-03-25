import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, Plus, Ticket, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";

const AdminCupones = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newCupon, setNewCupon] = useState({
        codigo: "",
        tipo_descuento: "porcentaje", // "porcentaje" or "fijo"
        descuento: 10,
        usos: 100,
        fecha_fin: "",
    });

    const { data: cupones = [], isLoading } = useQuery({
        queryKey: ["admin-cupones"],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("cupones")
                .select(`
                    *,
                    cupones_redenciones (count)
                `)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const createCupon = useMutation({
        mutationFn: async () => {
            const data: any = {
                codigo: newCupon.codigo.toUpperCase(),
                max_redenciones: newCupon.usos,
                activo: true
            };

            if (newCupon.tipo_descuento === "porcentaje") {
                data.percent_off = newCupon.descuento;
            } else {
                data.amount_off = newCupon.descuento;
            }

            if (newCupon.fecha_fin) {
                // Ensure the date is sent in ISO format
                data.valido_hasta = new Date(newCupon.fecha_fin).toISOString();
            }

            const { error } = await (supabase as any)
                .from("cupones")
                .insert(data);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-cupones"] });
            setIsDialogOpen(false);
            setNewCupon({ codigo: "", tipo_descuento: "porcentaje", descuento: 10, usos: 100, fecha_fin: "" });
            toast({ title: "Cupón creado correctamente" });
        },
        onError: (e: any) => {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    });

    const toggleCupon = useMutation({
        mutationFn: async ({ id, activo }: { id: number, activo: boolean }) => {
            const { error } = await (supabase as any).from("cupones").update({ activo }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-cupones"] });
        },
    });

    const deleteCupon = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await (supabase as any).from("cupones").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-cupones"] });
            toast({ title: "Cupón eliminado" });
        },
    });

    return (
        <div className="space-y-6">
            <div className="sticky top-[80px] z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#07070d] pb-4 pt-4 -mt-2">
                <h1 className="text-2xl font-bold text-white">Gestión de Cupones</h1>

                <button
                    onClick={() => setIsDialogOpen(true)}
                    className="inline-flex items-center gap-2 bg-[#c084fc] hover:bg-[#a855f7] text-white px-4 py-2 rounded-xl text-sm justify-center transition-colors ml-auto shadow-lg"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Cupón
                </button>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-[425px] bg-[#0f0f13] border-white/10 text-white">
                        <DialogHeader>
                            <DialogTitle>Crear Cupón de Descuento</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label className="text-sm text-white/70">Código (ej. VERANO24)</label>
                                <Input
                                    value={newCupon.codigo}
                                    onChange={(e) => setNewCupon({ ...newCupon, codigo: e.target.value.toUpperCase() })}
                                    className="bg-black/20 border-white/10 text-white uppercase placeholder:normal-case"
                                    placeholder="Escribe el código..."
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm text-white/70">Tipo de Descuento</label>
                                <Select
                                    value={newCupon.tipo_descuento}
                                    onValueChange={(val) => setNewCupon({ ...newCupon, tipo_descuento: val })}
                                >
                                    <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                        <SelectValue placeholder="Selecciona el tipo" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a1a24] border-white/10 text-white">
                                        <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                                        <SelectItem value="fijo">Cantidad Fija (€)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm text-white/70">
                                    Descuento {newCupon.tipo_descuento === "porcentaje" ? "(%)" : "(€)"}
                                </label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={newCupon.descuento}
                                        onChange={(e) => setNewCupon({ ...newCupon, descuento: parseInt(e.target.value) || 0 })}
                                        className="bg-black/20 border-white/10 text-white pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                                        {newCupon.tipo_descuento === "porcentaje" ? "%" : "€"}
                                    </span>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm text-white/70">Fecha de Caducidad (Opcional)</label>
                                <Input
                                    type="datetime-local"
                                    value={newCupon.fecha_fin}
                                    onChange={(e) => setNewCupon({ ...newCupon, fecha_fin: e.target.value })}
                                    className="bg-black/20 border-white/10 text-white css-color-scheme-dark"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm text-white/70">Límite de usos</label>
                                <Input
                                    type="number"
                                    value={newCupon.usos}
                                    onChange={(e) => setNewCupon({ ...newCupon, usos: parseInt(e.target.value) || 0 })}
                                    className="bg-black/20 border-white/10 text-white"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <button
                                onClick={() => createCupon.mutate()}
                                disabled={!newCupon.codigo || createCupon.isPending}
                                className="w-full bg-[#c084fc] hover:bg-[#a855f7] text-white font-semibold py-2 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {createCupon.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                                Generar Cupón
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="admin-card rounded-2xl overflow-hidden border border-white/10">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/10">
                                <TableHead className="text-white/60">Código</TableHead>
                                <TableHead className="text-white/60">Descuento</TableHead>
                                <TableHead className="text-white/60">Caducidad</TableHead>
                                <TableHead className="text-white/60 text-center">Usos</TableHead>
                                <TableHead className="text-white/60">Estado</TableHead>
                                <TableHead className="text-white/60 text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#c084fc]" />
                                    </TableCell>
                                </TableRow>
                            ) : cupones.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-white/50">
                                        No hay cupones creados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                cupones.map((c: any) => {
                                    const usosUsados = c.cupones_redenciones?.[0]?.count || 0;
                                    const maxUsos = c.max_redenciones || 0;
                                    const usosDisponibles = Math.max(0, maxUsos - usosUsados);

                                    return (
                                        <TableRow key={c.id} className="border-white/5 hover:bg-white/[0.02]">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-lg font-bold text-[#c084fc]">{c.codigo}</span>
                                                    <span className="text-xs text-white/40">
                                                        Creado: {format(new Date(c.created_at), "dd/MM/yy")}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="border-[#10b981]/30 text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 text-sm">
                                                    {c.percent_off ? `-${c.percent_off}%` : `-${c.amount_off}€`}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs text-white/70">
                                                    {c.valido_hasta ? format(new Date(c.valido_hasta), "dd/MM/yy HH:mm") : "Sin límite"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-white font-medium">{usosUsados} <span className="text-white/40 text-xs font-normal">usados</span></span>
                                                    <div className="w-full max-w-[100px] h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-[#c084fc]"
                                                            style={{ width: maxUsos > 0 ? `${Math.min(100, (usosUsados / maxUsos) * 100)}%` : '0%' }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-white/30 mt-0.5">{usosDisponibles} disponibles</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={c.activo}
                                                        onCheckedChange={(val) => toggleCupon.mutate({ id: c.id, activo: val })}
                                                        className={`data-[state=checked]:bg-[#10b981] ${!c.activo ? 'opacity-50' : ''}`}
                                                    />
                                                    <span className="text-xs text-white/60 w-12">{c.activo ? 'Activo' : 'Inactivo'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`¿Eliminar cupón ${c.codigo} permanentemente?`)) {
                                                            deleteCupon.mutate(c.id);
                                                        }
                                                    }}
                                                    disabled={deleteCupon.isPending}
                                                    className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export default AdminCupones;
