import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

type Sesion = {
  id: number;
  fecha: string;
  estado: string;
  nombre_usuario: string;
  email_usuario: string;
  tipo_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  metodo_pago: string;
};

const Sesiones = () => {
  const [sesionesActivas, setSesionesActivas] = useState<Sesion[]>([]);
  const [sesionesCanceladas, setSesionesCanceladas] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadSesiones = async () => {
      try {
        setLoading(true);
        
        // Llamar a la función edge para obtener sesiones con información completa
        const { data, error } = await supabase.functions.invoke("get-sesiones");

        if (error) {
          console.error("Error cargando sesiones:", error);
          // Fallback: intentar cargar directamente desde el cliente
          await loadSesionesFallback();
          return;
        }

        if (data) {
          setSesionesActivas(data.activas || []);
          setSesionesCanceladas(data.canceladas || []);
        }
      } catch (err) {
        console.error("Error al cargar sesiones:", err);
        // Fallback: intentar cargar directamente desde el cliente
        await loadSesionesFallback();
      } finally {
        setLoading(false);
      }
    };

    const loadSesionesFallback = async () => {
      try {
        // Obtener todas las reservas con información de usuario y tipo de reserva
        const { data: reservas, error } = await (supabase as any)
          .from("reservas")
          .select(`
            id,
            fecha,
            estado,
            metodo_pago,
            usuario_id,
            tipos_reserva(nombre),
            franjas_horarias(hora_inicio, hora_fin)
          `)
          .order("fecha", { ascending: false })
          .order("id", { ascending: false });

        if (error) {
          console.error("Error cargando reservas:", error);
          return;
        }

        // Obtener información de usuarios desde profiles
        const userIds = [...new Set((reservas || []).map((r: any) => r.usuario_id))];
        const usuariosMap = new Map<string, { nombre: string; email: string }>();

        // Obtener todos los perfiles de una vez
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("first_name, last_name, email, user_id")
            .in("user_id", userIds);

          (profiles || []).forEach((profile: any) => {
            const nombre = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Sin nombre";
            usuariosMap.set(profile.user_id, {
              nombre,
              email: profile.email || "Sin email",
            });
          });

          // Para usuarios sin perfil, usar ID como nombre temporal
          userIds.forEach((userId) => {
            if (!usuariosMap.has(userId)) {
              usuariosMap.set(userId, {
                nombre: `Usuario ${userId.slice(0, 8)}`,
                email: "Sin email",
              });
            }
          });
        }

        // Procesar reservas y obtener información de usuarios
        const sesiones: Sesion[] = (reservas || []).map((r: any) => {
          const usuario = usuariosMap.get(r.usuario_id) || { nombre: "Usuario", email: "Sin email" };
          return {
            id: r.id,
            fecha: r.fecha,
            estado: r.estado,
            nombre_usuario: usuario.nombre,
            email_usuario: usuario.email,
            tipo_reserva: r.tipos_reserva?.nombre || "Sin tipo",
            hora_inicio: r.franjas_horarias?.hora_inicio || "",
            hora_fin: r.franjas_horarias?.hora_fin || "",
            metodo_pago: r.metodo_pago || "entrada",
          };
        });

        // Separar por estado
        const activas = sesiones.filter((s) => s.estado === "confirmada" || s.estado === "pendiente");
        const canceladas = sesiones.filter((s) => s.estado === "cancelada");

        setSesionesActivas(activas);
        setSesionesCanceladas(canceladas);
      } catch (err) {
        console.error("Error en fallback:", err);
      }
    };

    loadSesiones();
  }, []);

  const formatearFecha = (fecha: string) => {
    // Parsear fecha sin problemas de zona horaria
    const [year, month, day] = fecha.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatearHora = (hora: string) => {
    if (!hora) return "";
    return hora.slice(0, 5); // Formato HH:MM
  };

  const SesionCard = ({ sesion }: { sesion: Sesion }) => (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{sesion.nombre_usuario}</h3>
              <Badge variant={sesion.estado === "confirmada" ? "default" : "secondary"}>
                {sesion.estado}
              </Badge>
              {sesion.metodo_pago === "bono" && (
                <Badge variant="outline">Bono</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>Email:</strong> {sesion.email_usuario}
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>Fecha:</strong> {formatearFecha(sesion.fecha)}
            </p>
            {sesion.hora_inicio && (
              <p className="text-sm text-muted-foreground mb-1">
                <strong>Horario:</strong> {formatearHora(sesion.hora_inicio)}
                {sesion.hora_fin && ` - ${formatearHora(sesion.hora_fin)}`}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              <strong>Tipo de reserva:</strong> {sesion.tipo_reserva}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen pt-20 pb-8 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Gestión de <span className="hero-text-gradient">Sesiones</span>
            </h1>
            <p className="text-muted-foreground">
              Visualiza todas las sesiones activas y canceladas
            </p>
          </div>

          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Cargando sesiones...</p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="activas" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="activas">
                  Sesiones Activas ({sesionesActivas.length})
                </TabsTrigger>
                <TabsTrigger value="canceladas">
                  Sesiones Canceladas ({sesionesCanceladas.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="activas" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sesiones Activas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sesionesActivas.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No hay sesiones activas
                      </p>
                    ) : (
                      sesionesActivas.map((sesion) => (
                        <SesionCard key={sesion.id} sesion={sesion} />
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="canceladas" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sesiones Canceladas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sesionesCanceladas.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No hay sesiones canceladas
                      </p>
                    ) : (
                      sesionesCanceladas.map((sesion) => (
                        <SesionCard key={sesion.id} sesion={sesion} />
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sesiones;

