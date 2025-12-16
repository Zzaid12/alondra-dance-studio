// @ts-nocheck
// Edge Function para resetear contraseña de un usuario (solo admin)
// USO: Solo para emergencias. Después implementa recuperación de contraseña en la web.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  console.log("=== ADMIN RESET PASSWORD ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Usar service role para tener permisos de admin
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { user_email, new_password } = body;

    if (!user_email || !new_password) {
      return new Response(
        JSON.stringify({ error: "Se requiere user_email y new_password" }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Validar que la contraseña tenga al menos 6 caracteres (mínimo de Supabase)
    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    console.log(`🔐 Intentando resetear contraseña para: ${user_email}`);

    // Buscar el usuario por email
    const { data: users, error: searchError } = await adminClient.auth.admin.listUsers();
    
    if (searchError) {
      throw searchError;
    }

    const user = users.users.find((u: any) => u.email === user_email);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Usuario no encontrado" }),
        { 
          status: 404, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    console.log(`✓ Usuario encontrado: ${user.id}`);

    // Actualizar la contraseña del usuario
    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    );

    if (updateError) {
      console.error("❌ Error actualizando contraseña:", updateError);
      throw updateError;
    }

    console.log("✓ Contraseña actualizada exitosamente");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Contraseña actualizada exitosamente",
        user_email: updatedUser.user.email
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("❌ Error general:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error al resetear contraseña" }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});


