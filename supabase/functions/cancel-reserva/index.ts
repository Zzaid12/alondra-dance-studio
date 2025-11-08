// @ts-nocheck
// Cancelación de reservas con política 24h, reembolso Stripe (si aplica)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

let stripeClient = null as any;
async function getStripeClient() {
  if (stripeClient) return stripeClient;
  const mod = await import("https://esm.sh/stripe@12.17.0?target=deno");
  const Stripe = mod.default;
  stripeClient = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    httpClient: Stripe.createFetchHttpClient(),
    // Usa una versión estable soportada por Stripe
    apiVersion: "2023-10-16",
  });
  return stripeClient;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    console.log("cancel-reserva: inicio", { method: req.method, url: req.url });
    const { reservaId } = await req.json();
    if (!reservaId) return new Response(JSON.stringify({ error: "error, revisa nuestra politica de cancelacion" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const authHeader = req.headers.get("authorization") || "";
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    let userId: string | null = null;
    try {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (anonKey) {
        const anon = createClient(
          Deno.env.get("SUPABASE_URL")!,
          anonKey,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: authData } = await anon.auth.getUser();
        userId = authData?.user?.id ?? null;
      }
    } catch (e) {
      console.error("anon_auth_error", e);
    }
    if (!userId) {
      // Fallback: decodificar JWT para obtener el 'sub'
      try {
        const token = authHeader.replace(/^Bearer\s+/i, "");
        const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(token.split(".")[1]), c => c.charCodeAt(0))));
        userId = payload?.sub ?? null;
      } catch (e) {
        console.error("jwt_decode_error", e);
      }
    }
    if (!userId) return new Response(JSON.stringify({ error: "error, revisa nuestra politica de cancelacion" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: r, error: er } = await admin
      .from("reservas")
      .select("id, usuario_id, fecha, estado, metodo_pago, bono_usuario_id")
      .eq("id", reservaId)
      .single();
    if (er || !r) return new Response(JSON.stringify({ error: "error, revisa nuestra politica de cancelacion" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    if (r.usuario_id !== userId) return new Response(JSON.stringify({ error: "error, revisa nuestra politica de cancelacion" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    if (r.estado !== "confirmada" && r.estado !== "pendiente") return new Response(JSON.stringify({ error: "error, revisa nuestra politica de cancelacion" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    // Política 24h
    const fechaReserva = new Date(r.fecha);
    const ahora = new Date();
    if (fechaReserva.getTime() - ahora.getTime() < 24 * 60 * 60 * 1000) {
      return new Response(JSON.stringify({ error: "error, revisa nuestra politica de cancelacion" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Reembolso si fue pagada con Stripe
    if ((r.metodo_pago || "").toLowerCase() === "entrada") {
      const { data: pago } = await admin
        .from("pagos")
        .select("transaccion_id")
        .eq("usuario_id", userId)
        .eq("tipo", "entrada")
        .order("fecha_pago", { ascending: false })
        .limit(1)
        .single();
      if (pago?.transaccion_id) {
        try {
          const stripe = await getStripeClient();
          const session = await stripe.checkout.sessions.retrieve(pago.transaccion_id);
          const pi = session.payment_intent;
          if (pi) await stripe.refunds.create({ payment_intent: typeof pi === "string" ? pi : pi.id });
        } catch (e) {
          console.error("refund_error", e);
        }
      }
    }

    // Devolver clase al bono si aplica
    if (r.bono_usuario_id) {
      try {
        // Obtener el estado actual del bono
        const { data: bonoData, error: bonoError } = await admin
          .from("bonos_usuario")
          .select("clases_restantes, estado")
          .eq("id", r.bono_usuario_id)
          .single();
        
        if (!bonoError && bonoData) {
          // Incrementar clases_restantes y reactivar si estaba agotado
          const nuevasClases = (bonoData.clases_restantes || 0) + 1;
          const nuevoEstado = bonoData.estado === 'agotado' ? 'activo' : bonoData.estado;
          
          const { error: updateError } = await admin
            .from("bonos_usuario")
            .update({ 
              clases_restantes: nuevasClases,
              estado: nuevoEstado
            })
            .eq("id", r.bono_usuario_id);
          
          if (updateError) {
            console.error("Error al devolver clase al bono:", updateError);
          } else {
            console.log("Clase devuelta al bono:", r.bono_usuario_id, "Nuevas clases:", nuevasClases);
          }
        }
      } catch (bonoErr) {
        console.error("Error al procesar devolución de bono:", bonoErr);
      }
    }

    await admin.from("reservas").update({ estado: "cancelada" }).eq("id", reservaId);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    console.error("cancel-reserva error:", e);
    return new Response(JSON.stringify({ error: "error, revisa nuestra politica de cancelacion" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
