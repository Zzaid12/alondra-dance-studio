import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Loader2, Edit2, Check, X, Phone, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type AdminUser = {
    user_id: string;
    email: string | null;
    nombre: string | null;
    telefono: string | null;
    created_at: string;
    last_reserva: string | null;
};

const AdminDashboardUsuarios = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ nombre: "", telefono: "" });
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: usuarios = [], isLoading } = useQuery({
        queryKey: ["admin-usuarios"],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("get_admin_users");
            if (error) throw error;
            return data as AdminUser[];
        },
    });

    const updatePerfil = useMutation({
        mutationFn: async ({ id, nombre, telefono }: { id: string; nombre: string; telefono: string }) => {
            const { error } = await supabase
                .from("perfiles")
                .update({ nombre, telefono })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
            setEditingId(null);
            toast({ title: "Usuario actualizado", description: "Los datos se han guardado correctamente" });
        },
        onError: () => {
            toast({ title: "Error", description: "No se pudo actualizar el usuario", variant: "destructive" });
        }
    });

    const startEditing = (u: AdminUser) => {
        setEditingId(u.user_id);
        setEditForm({ nombre: u.nombre || "", telefono: u.telefono || "" });
    };

    const handleSave = (id: string) => {
        updatePerfil.mutate({ id, nombre: editForm.nombre, telefono: editForm.telefono });
    };

    const filteredUsuarios = usuarios.filter((u) => {
        const term = searchTerm.toLowerCase();
        return (
            u.nombre?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term) ||
            u.telefono?.includes(term)
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-white">Usuarios ({usuarios.length})</h1>
            </div>

            {/* Filtro */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                        placeholder="Buscar por nombre, email o teléfono..."
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
            </div>

            {/* Tabla */}
            <div className="admin-card rounded-2xl overflow-hidden border border-white/10">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-white/5 hover:bg-white/5">
                            <TableRow className="border-white/10">
                                <TableHead className="text-white/60 font-medium w-[30%]">Nombre</TableHead>
                                <TableHead className="text-white/60 font-medium">Contacto</TableHead>
                                <TableHead className="text-white/60 font-medium">Registro</TableHead>
                                <TableHead className="text-white/60 font-medium">Última Reserva</TableHead>
                                <TableHead className="text-white/60 font-medium text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow className="border-white/10">
                                    <TableCell colSpan={5} className="text-center py-8 text-white/50">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-[#c084fc] border-t-transparent rounded-full animate-spin" />
                                            Cargando usuarios...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsuarios.length === 0 ? (
                                <TableRow className="border-white/10">
                                    <TableCell colSpan={5} className="text-center py-8 text-white/50">
                                        No se encontraron usuarios
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsuarios.map((u) => {
                                    const isEditing = editingId === u.user_id;

                                    return (
                                        <TableRow key={u.user_id} className="border-white/5 hover:bg-white/[0.02]">
                                            {/* Nombre */}
                                            <TableCell>
                                                {isEditing ? (
                                                    <Input
                                                        value={editForm.nombre}
                                                        onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                                                        className="bg-black/20 border-white/20 text-white h-8"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div className="font-medium text-white">{u.nombre || <span className="text-white/30 italic">Sin nombre</span>}</div>
                                                )}
                                            </TableCell>

                                            {/* Contacto */}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-xs text-white/60">
                                                        <Mail className="w-3 h-3" />
                                                        <span>{u.email || '-'}</span>
                                                    </div>
                                                    {isEditing ? (
                                                        <Input
                                                            value={editForm.telefono}
                                                            onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                                                            className="bg-black/20 border-white/20 text-white h-8 text-xs w-32 mt-1"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-xs text-white/50">
                                                            <Phone className="w-3 h-3" />
                                                            <span>{u.telefono || '-'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Registro */}
                                            <TableCell className="text-white/60 text-sm">
                                                {u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy") : '-'}
                                            </TableCell>

                                            {/* Última Reserva */}
                                            <TableCell className="text-white/60 text-sm">
                                                {u.last_reserva
                                                    ? format(new Date(u.last_reserva), "dd MMM yy", { locale: es })
                                                    : <span className="text-white/30 italic">Nunca</span>
                                                }
                                            </TableCell>

                                            {/* Acciones */}
                                            <TableCell className="text-right">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                                                            disabled={updatePerfil.isPending}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleSave(u.user_id)}
                                                            className="p-1.5 rounded-lg text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                                            disabled={updatePerfil.isPending}
                                                        >
                                                            {updatePerfil.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => startEditing(u)}
                                                        className="p-1.5 rounded-lg text-white/30 hover:text-[#c084fc] hover:bg-[#c084fc]/10 transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                )}
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

export default AdminDashboardUsuarios;
