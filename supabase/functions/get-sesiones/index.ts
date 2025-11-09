import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verificar que el usuario esté autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Usar service role para obtener todas las reservas
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Obtener todas las reservas con información de tipo de reserva y franja horaria
    const { data: reservas, error: reservasError } = await adminClient
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

    if (reservasError) {
      console.error("Error obteniendo reservas:", reservasError);
      return new Response(
        JSON.stringify({ error: "Error al obtener reservas" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Obtener información de usuarios desde profiles y auth
    const userIds = [...new Set((reservas || []).map((r: any) => r.usuario_id))];
    const usuariosMap = new Map<string, { nombre: string; email: string }>();

    // Obtener perfiles
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("first_name, last_name, email, user_id")
      .in("user_id", userIds);

    (profiles || []).forEach((profile: any) => {
      const nombre = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Sin nombre";
      usuariosMap.set(profile.user_id, {
        nombre,
        email: profile.email || "",
      });
    });

    // Obtener emails desde auth.users para usuarios sin email en profile
    for (const userId of userIds) {
      if (!usuariosMap.has(userId) || !usuariosMap.get(userId)?.email) {
        try {
          const { data: userData } = await adminClient.auth.admin.getUserById(userId);
          if (userData?.user?.email) {
            const existing = usuariosMap.get(userId);
            usuariosMap.set(userId, {
              nombre: existing?.nombre || userData.user.email.split("@")[0] || "Usuario",
              email: userData.user.email,
            });
          }
        } catch (e) {
          // Si no se puede obtener, usar valores por defecto
          if (!usuariosMap.has(userId)) {
            usuariosMap.set(userId, {
              nombre: `Usuario ${userId.slice(0, 8)}`,
              email: "",
            });
          }
        }
      }
    }

    // Procesar reservas
    const sesiones = (reservas || []).map((r: any) => {
      const usuario = usuariosMap.get(r.usuario_id) || { nombre: "Usuario", email: "" };
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

    return new Response(
      JSON.stringify({ activas, canceladas }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error en get-sesiones:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

