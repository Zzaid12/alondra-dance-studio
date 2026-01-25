// @ts-nocheck
// Webhook de Stripe con envío de emails + integración TTLock
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/crypto.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";
const TTLOCK_API_BASE = "https://euapi.ttlock.com";
let stripeClient = null;
async function getStripeClient() {
  if (stripeClient) return stripeClient;
  const mod = await import("https://esm.sh/stripe@12.17.0?target=deno");
  const Stripe = mod.default;
  stripeClient = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: "2023-10-16"
  });
  return stripeClient;
}
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
function assertEnv() {
  const missing = [];
  if (!Deno.env.get("STRIPE_SECRET_KEY")) missing.push("STRIPE_SECRET_KEY");
  if (!Deno.env.get("STRIPE_WEBHOOK_SECRET")) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!Deno.env.get("SUPABASE_URL")) missing.push("SUPABASE_URL");
  if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!Deno.env.get("MAIL_FROM")) missing.push("MAIL_FROM");
  const hasSmtp2go = Deno.env.get("SMTP2GO_API_KEY");
  const hasBrevo = Deno.env.get("BREVO_API_KEY");
  if (!hasSmtp2go && !hasBrevo) {
    missing.push("SMTP2GO_API_KEY o BREVO_API_KEY");
  }
  if (missing.length) {
    console.error(`Faltan variables de entorno: ${missing.join(", ")}`);
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
  }
  console.log("✓ Variables de entorno configuradas");
}
// ========== FUNCIONES TTLOCK ==========
async function getMD5(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  return encodeHex(new Uint8Array(hashBuffer));
}
async function getTTLockAccessToken(clientId, clientSecret, username, password) {
  const date = Date.now();
  const passwordMD5 = await getMD5(password);
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("username", username);
  params.append("password", passwordMD5);
  params.append("grant_type", "password");
  params.append("date", date.toString());
  console.log("🔑 Obteniendo TTLock access token...");
  const response = await fetch(`${TTLOCK_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  const data = await response.json();
  if (data.errcode !== undefined && data.errcode !== 0) {
    console.error("❌ Error TTLock auth:", data);
    throw new Error(`TTLock auth error: ${data.errmsg || data.errcode}`);
  }
  if (!data.access_token) {
    console.error("❌ Error TTLock auth - no access_token:", data);
    throw new Error("TTLock auth error: no access_token received");
  }
  console.log("✅ TTLock access token obtenido");
  return data.access_token;
}
async function createTTLockPasscode(clientId, accessToken, lockId, passcode, startDate, endDate) {
  const date = Date.now();
  const url = new URL(`${TTLOCK_API_BASE}/v3/keyboardPwd/add`);
  url.searchParams.append("clientId", clientId);
  url.searchParams.append("accessToken", accessToken);
  url.searchParams.append("lockId", lockId.toString());
  url.searchParams.append("keyboardPwd", passcode);
  url.searchParams.append("keyboardPwdName", `Reserva-${date}`);
  url.searchParams.append("startDate", startDate.toString());
  url.searchParams.append("endDate", endDate.toString());
  url.searchParams.append("addType", "2");
  url.searchParams.append("date", date.toString());
  console.log("🔐 Creando passcode TTLock...", {
    lockId,
    passcode,
    startDate,
    endDate,
    startDateMadrid: new Date(startDate).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid'
    }),
    endDateMadrid: new Date(endDate).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid'
    })
  });
  const response = await fetch(url.toString(), {
    method: "POST"
  });
  const data = await response.json();
  if (data.errcode !== undefined && data.errcode !== 0) {
    console.error("❌ Error creando passcode:", data);
    throw new Error(`TTLock passcode error: ${data.errmsg || data.errcode}`);
  }
  if (!data.keyboardPwdId) {
    console.error("❌ Error creando passcode - no keyboardPwdId:", data);
    throw new Error("TTLock passcode error: no keyboardPwdId received");
  }
  console.log("✅ Passcode creado:", data.keyboardPwdId);
  return {
    passcodeId: data.keyboardPwdId,
    passcode: passcode
  };
}
// Función corregida para generar código TTLock
async function generarCodigoAccesoReserva(fecha, horaInicio, horaFin, sb, minutosAntes = 15, minutosDespues = 15) {
  const CLIENT_ID = Deno.env.get("TTLOCK_CLIENT_ID");
  const CLIENT_SECRET = Deno.env.get("TTLOCK_CLIENT_SECRET");
  const USERNAME = Deno.env.get("TTLOCK_USERNAME");
  const PASSWORD = Deno.env.get("TTLOCK_PASSWORD");
  const LOCK_ID = Number(Deno.env.get("TTLOCK_LOCK_ID"));
  if (!CLIENT_ID || !CLIENT_SECRET || !USERNAME || !PASSWORD || !LOCK_ID) {
    throw new Error("Faltan credenciales de TTLock");
  }
  console.log('🔧 === GENERANDO CÓDIGO TTLOCK ===');
  console.log('📅 Entrada:', {
    fecha,
    horaInicio,
    horaFin,
    minutosAntes,
    minutosDespues
  });
  // Parsear fecha y horas
  const [year, month, day] = fecha.split("-").map(Number);
  const [horaInicioH, horaInicioM] = horaInicio.split(":").map(Number);
  const [horaFinH, horaFinM] = horaFin.split(":").map(Number);
  // Determinar si estamos en horario de verano (DST)
  // En España: último domingo de marzo a último domingo de octubre
  const esDST = (fechaStr) => {
    const d = new Date(fechaStr + 'T12:00:00Z');
    const year = d.getUTCFullYear();
    // Último domingo de marzo
    const marzo = new Date(Date.UTC(year, 2, 31));
    const ultimoDomingoMarzo = new Date(Date.UTC(year, 2, 31 - ((marzo.getUTCDay() || 7) - 1)));
    ultimoDomingoMarzo.setUTCHours(2, 0, 0, 0); // Cambio a las 2:00 AM UTC
    // Último domingo de octubre  
    const octubre = new Date(Date.UTC(year, 9, 31));
    const ultimoDomingoOctubre = new Date(Date.UTC(year, 9, 31 - ((octubre.getUTCDay() || 7) - 1)));
    ultimoDomingoOctubre.setUTCHours(2, 0, 0, 0); // Cambio a las 2:00 AM UTC
    return d >= ultimoDomingoMarzo && d < ultimoDomingoOctubre;
  };
  const offsetMadrid = esDST(fecha) ? 2 : 1; // +2 en verano, +1 en invierno
  console.log('🌍 Offset Madrid:', offsetMadrid, esDST(fecha) ? '(horario verano)' : '(horario invierno)');
  // Crear timestamps en UTC restando el offset de Madrid
  // Si en Madrid son las 09:00 y estamos en +1, en UTC son las 08:00
  let fechaInicio = Date.UTC(year, month - 1, day, horaInicioH - offsetMadrid, horaInicioM, 0);
  let fechaFin = Date.UTC(year, month - 1, day, horaFinH - offsetMadrid, horaFinM, 0);
  console.log('📅 Fechas UTC base:', {
    inicioUTC: new Date(fechaInicio).toISOString(),
    finUTC: new Date(fechaFin).toISOString(),
    inicioMadrid: new Date(fechaInicio).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid'
    }),
    finMadrid: new Date(fechaFin).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid'
    })
  });
  // Obtener día de la semana para buscar siguiente franja
  const fechaObj = new Date(Date.UTC(year, month - 1, day));
  const diasSemana = [
    'domingo',
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado'
  ];
  const diaSemana = diasSemana[fechaObj.getUTCDay()];
  // Buscar siguiente franja del mismo día (después de la hora de inicio actual)
  const { data: siguienteFranja } = await sb.from('franjas_horarias').select('hora_inicio').eq('dia_semana', diaSemana).gt('hora_inicio', horaInicio).eq('activo', true).order('hora_inicio', {
    ascending: true
  }).limit(1).single();
  console.log('🔍 Siguiente franja encontrada:', siguienteFranja?.hora_inicio || 'Ninguna');
  // Obtener token de TTLock
  const accessToken = await getTTLockAccessToken(CLIENT_ID, CLIENT_SECRET, USERNAME, PASSWORD);
  // Verificar hora de la cerradura (DIAGNÓSTICO IMPORTANTE)
  try {
    const lockTimeUrl = new URL(`${TTLOCK_API_BASE}/v3/lock/queryDate`);
    lockTimeUrl.searchParams.append("clientId", CLIENT_ID);
    lockTimeUrl.searchParams.append("accessToken", accessToken);
    lockTimeUrl.searchParams.append("lockId", LOCK_ID.toString());
    lockTimeUrl.searchParams.append("date", Date.now().toString());
    const lockTimeResp = await fetch(lockTimeUrl.toString());
    const lockTimeData = await lockTimeResp.json();
    if (lockTimeData.date) {
      const diferenciaMin = (Date.now() - lockTimeData.date) / 1000 / 60;
      console.log('🔒 HORA CERRADURA:', {
        timestamp: lockTimeData.date,
        fecha: new Date(lockTimeData.date).toLocaleString('es-ES', {
          timeZone: 'Europe/Madrid'
        }),
        diferenciaMinutos: diferenciaMin.toFixed(2)
      });
      if (Math.abs(diferenciaMin) > 5) {
        console.warn('⚠️⚠️⚠️ LA CERRADURA TIENE DESFASE DE MÁS DE 5 MINUTOS!');
      }
    }
  } catch (err) {
    console.warn('⚠️  No se pudo verificar hora de cerradura:', err.message);
  }
  // Aplicar margen ANTES (en milisegundos)
  fechaInicio = fechaInicio - minutosAntes * 60 * 1000;
  // Aplicar margen DESPUÉS (o ajustar si hay siguiente franja)
  if (siguienteFranja?.hora_inicio) {
    const [sigH, sigM] = siguienteFranja.hora_inicio.split(":").map(Number);
    const fechaSiguiente = Date.UTC(year, month - 1, day, sigH - offsetMadrid, sigM, 0);
    fechaFin = fechaSiguiente - 60000; // Termina 1 min antes
    console.log('⚠️  Ajuste: termina 1 min antes de siguiente franja');
  } else {
    fechaFin = fechaFin + minutosDespues * 60 * 1000;
    console.log('✓ Sin siguiente franja: margen completo');
  }
  console.log('⏰ TIMESTAMPS FINALES:', {
    startDate: fechaInicio,
    endDate: fechaFin,
    startUTC: new Date(fechaInicio).toISOString(),
    endUTC: new Date(fechaFin).toISOString(),
    startMadrid: new Date(fechaInicio).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid'
    }),
    endMadrid: new Date(fechaFin).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid'
    }),
    duracionMin: ((fechaFin - fechaInicio) / 1000 / 60).toFixed(0)
  });
  // Validación
  if (fechaInicio >= fechaFin) {
    throw new Error(`Fechas inválidas: inicio >= fin`);
  }
  // Generar código de 6 dígitos
  const passcode = Math.floor(100000 + Math.random() * 900000).toString();
  // Crear passcode en TTLock (enviar timestamps en milisegundos)
  const resultado = await createTTLockPasscode(CLIENT_ID, accessToken, LOCK_ID, passcode, fechaInicio, fechaFin // Ya es timestamp en milisegundos
  );
  console.log('✅ CÓDIGO CREADO:', resultado.passcode);
  console.log('🔧 === FIN GENERACIÓN ===\n');
  return {
    codigo: resultado.passcode,
    passcodeId: resultado.passcodeId,
    validoDesde: new Date(fechaInicio).toISOString(),
    validoHasta: new Date(fechaFin).toISOString()
  };
}
// ========== FIN FUNCIONES TTLOCK ==========
async function sendEmail(to, subject, html, text) {
  try {
    const fromName = Deno.env.get("MAIL_FROM_NAME") || "Alondra Pole Space";
    const fromEmail = Deno.env.get("MAIL_FROM");
    console.log(`📧 Intentando enviar email:`);
    console.log(`   To: ${to}`);
    console.log(`   From: ${fromName} <${fromEmail}>`);
    console.log(`   Subject: ${subject}`);
    const smtp2goKey = Deno.env.get("SMTP2GO_API_KEY");
    if (smtp2goKey) {
      console.log(`   Servicio: SMTP2GO`);
      const response = await fetch("https://api.smtp2go.com/v3/email/send", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          api_key: smtp2goKey,
          to: [
            to
          ],
          sender: fromEmail,
          subject: subject,
          html_body: html,
          text_body: text || html.replace(/<[^>]*>/g, ''),
          custom_headers: [
            {
              header: "Reply-To",
              value: fromEmail
            }
          ]
        })
      });
      const responseData = await response.json();
      console.log(`   Respuesta SMTP2GO (${response.status}):`, JSON.stringify(responseData));
      if (!response.ok || responseData.data?.error) {
        console.error(`✗ Error SMTP2GO:`, responseData);
        throw new Error(`SMTP2GO error: ${responseData.data?.error || response.status}`);
      }
      console.log(`✓ Email enviado vía SMTP2GO a ${to}`);
      return;
    }
    const brevoKey = Deno.env.get("BREVO_API_KEY");
    if (brevoKey) {
      console.log(`   Servicio: Brevo`);
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": brevoKey,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: fromEmail
          },
          to: [
            {
              email: to
            }
          ],
          subject: subject,
          htmlContent: html,
          textContent: text || html.replace(/<[^>]*>/g, '')
        })
      });
      const responseData = await response.json();
      console.log(`   Respuesta Brevo (${response.status}):`, JSON.stringify(responseData));
      if (!response.ok) {
        console.error(`✗ Error Brevo:`, responseData);
        throw new Error(`Brevo error: ${response.status}`);
      }
      console.log(`✓ Email enviado vía Brevo a ${to} - MessageID: ${responseData.messageId || 'N/A'}`);
      return;
    }
    throw new Error("No hay servicio de email configurado");
  } catch (error) {
    console.error(`✗ Error enviando email a ${to}:`, error);
    console.error(`✗ Stack trace:`, error.stack);
    throw error;
  }
}
Deno.serve(async (req) => {
  console.log("=== WEBHOOK STRIPE RECIBIDO ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    assertEnv();
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      console.log("✗ Missing stripe-signature header");
      return new Response("Missing stripe-signature", {
        status: 400,
        headers: corsHeaders
      });
    }
    const bodyText = await req.text();
    console.log("Body length:", bodyText.length);
    const stripe = await getStripeClient();
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(bodyText, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET"));
      console.log("✓ Event verified successfully:", event.type);
    } catch (err) {
      console.error("✗ Webhook signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, {
        status: 400,
        headers: corsHeaders
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const meta = session.metadata ?? {};
      const usuarioId = session.client_reference_id ?? null;
      console.log('=== Datos del checkout ===');
      console.log('Session ID:', session.id);
      console.log('Metadata:', JSON.stringify(meta, null, 2));
      console.log('Usuario ID:', usuarioId);
      const franjaIdStr = meta.franja_id || "";
      const tipoReservaIdStr = meta.tipo_reserva_id || "";
      console.log('franja_id:', franjaIdStr, 'tipo_reserva_id:', tipoReservaIdStr, 'fecha:', meta.fecha);
      let userEmail = null;
      if (usuarioId) {
        const { data: userData, error: userError } = await sb.auth.admin.getUserById(usuarioId);
        if (userError) {
          console.error('✗ Error obteniendo email del usuario:', userError);
        } else {
          userEmail = userData?.user?.email || null;
          console.log('✓ Email del usuario obtenido de auth:', userEmail);
        }
      }
      if (!userEmail && session.customer_details?.email) {
        userEmail = session.customer_details.email;
        console.log('✓ Email obtenido de Stripe customer_details:', userEmail);
      }
      if (meta.item_type === 'tipo_reserva' && usuarioId && meta.fecha && franjaIdStr && tipoReservaIdStr) {
        try {
          const tipoReservaId = Number(tipoReservaIdStr);
          const franjaHorariaId = Number(franjaIdStr);
          const fecha = String(meta.fecha);
          console.log('→ Creando reserva:', {
            usuarioId,
            fecha,
            fechaOriginal: meta.fecha,
            franjaHorariaId,
            tipoReservaId
          });
          if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            console.error('✗ Formato de fecha inválido:', fecha);
            return new Response(JSON.stringify({
              error: "Formato de fecha inválido",
              fechaRecibida: fecha
            }), {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders
              }
            });
          }
          const { data: tr, error: trError } = await sb.from('tipos_reserva').select('numero_barras, nombre').eq('id', tipoReservaId).single();
          if (trError) {
            console.error('✗ Error obteniendo tipo_reserva:', trError);
            return new Response(JSON.stringify({
              error: "Error obteniendo tipo_reserva",
              details: trError
            }), {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders
              }
            });
          }
          const numeroBarras = tr?.numero_barras ?? 1;
          const nombreTipoReserva = tr?.nombre ?? 'Reserva';
          console.log('✓ numero_barras:', numeroBarras);
          const { data: franja, error: franjaError } = await sb.from('franjas_horarias').select('hora_inicio, hora_fin').eq('id', franjaHorariaId).single();
          const { data: reservaData, error: reservaError } = await sb.from('reservas').insert({
            usuario_id: usuarioId,
            fecha,
            franja_horaria_id: franjaHorariaId,
            tipo_reserva_id: tipoReservaId,
            numero_barras: numeroBarras,
            metodo_pago: 'entrada',
            precio_pagado: Number(session.amount_total ?? 0) / 100,
            estado: 'confirmada'
          }).select();
          if (reservaError) {
            console.error('✗ Error insertando reserva:', reservaError);
            return new Response(JSON.stringify({
              error: "Error insertando reserva",
              details: reservaError
            }), {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders
              }
            });
          } else {
            console.log('✓ Reserva creada exitosamente:', reservaData);

            // LOGICA CUPONES (INICIO)
            if (meta.cupon_id) {
              const cuponId = Number(meta.cupon_id);
              console.log('→ Registrando uso de cupón para reserva:', cuponId);
              const { error: cupomErr } = await sb.from('cupones_redenciones').insert({
                cupon_id: cuponId,
                usuario_id: usuarioId,
                referencia_tipo: 'reserva',
                referencia_id: reservaData[0].id
              });
              if (cupomErr) console.error('✗ Error registrando cupón:', cupomErr);
              else console.log('✓ Cupón registrado correctamente');
            }
            // LOGICA CUPONES (FIN)

            let codigoAcceso = null;
            let validoDesde = null;
            let validoHasta = null;
            console.log('→ Intentando generar código TTLock...');
            console.log('   Variables TTLock:', {
              hasClientId: !!Deno.env.get("TTLOCK_CLIENT_ID"),
              hasClientSecret: !!Deno.env.get("TTLOCK_CLIENT_SECRET"),
              hasUsername: !!Deno.env.get("TTLOCK_USERNAME"),
              hasPassword: !!Deno.env.get("TTLOCK_PASSWORD"),
              hasLockId: !!Deno.env.get("TTLOCK_LOCK_ID")
            });
            try {
              const horaInicio = franja?.hora_inicio || '';
              const horaFin = franja?.hora_fin || '';
              console.log('   Datos de la reserva:', {
                fecha,
                horaInicio,
                horaFin
              });
              if (horaInicio && horaFin) {
                const { data: codigoExistente, error: errorCodigo } = await sb.from('codigos_ttlock_franja').select('codigo, codigo_ttlock_id, fecha_inicio_validez, fecha_fin_validez').eq('fecha', fecha).eq('hora_inicio', horaInicio).eq('hora_fin', horaFin).eq('estado', 'activo').single();
                if (codigoExistente && !errorCodigo) {
                  console.log('✓ Reutilizando código existente:', codigoExistente.codigo);
                  codigoAcceso = codigoExistente.codigo;
                  validoDesde = codigoExistente.fecha_inicio_validez;
                  validoHasta = codigoExistente.fecha_fin_validez;
                } else {
                  console.log('→ Generando nuevo código de acceso TTLock...');
                  try {
                    const resultadoCodigo = await generarCodigoAccesoReserva(fecha, horaInicio, horaFin, sb);
                    codigoAcceso = resultadoCodigo.codigo;
                    validoDesde = resultadoCodigo.validoDesde;
                    validoHasta = resultadoCodigo.validoHasta;
                    console.log('✓ Código generado:', codigoAcceso);
                    const { error: insertError } = await sb.from('codigos_ttlock_franja').insert({
                      fecha: fecha,
                      hora_inicio: horaInicio,
                      hora_fin: horaFin,
                      codigo: codigoAcceso,
                      codigo_ttlock_id: resultadoCodigo.passcodeId,
                      fecha_inicio_validez: validoDesde,
                      fecha_fin_validez: validoHasta,
                      estado: 'activo'
                    });
                    if (insertError) {
                      console.error('✗ Error guardando código:', insertError);
                    } else {
                      console.log('✓ Código guardado en tabla');
                    }
                  } catch (generacionError) {
                    console.error('✗ Error en generarCodigoAccesoReserva:', generacionError);
                    console.error('   Stack completo:', generacionError.stack);
                    // No bloqueamos el proceso, pero registramos el error
                  }
                }
                // Solo actualizar reservas si tenemos un código válido
                if (codigoAcceso) {
                  const codigoTtlockId = codigoExistente?.codigo_ttlock_id || (await sb.from('codigos_ttlock_franja').select('codigo_ttlock_id').eq('codigo', codigoAcceso).eq('estado', 'activo').single()).data?.codigo_ttlock_id;
                  const { data: franjasMismoHorario } = await sb.from('franjas_horarias').select('id').eq('hora_inicio', horaInicio).eq('hora_fin', horaFin).eq('activo', true);
                  if (franjasMismoHorario && franjasMismoHorario.length > 0) {
                    const franjaIds = franjasMismoHorario.map((f) => f.id);
                    const { data: reservasFranja } = await sb.from('reservas').select('id').eq('fecha', fecha).eq('estado', 'confirmada').in('franja_horaria_id', franjaIds);
                    if (reservasFranja && reservasFranja.length > 0) {
                      const reservaIds = reservasFranja.map((r) => r.id);
                      const { error: updateError } = await sb.from('reservas').update({
                        codigo_acceso: codigoAcceso,
                        codigo_acceso_id: codigoTtlockId
                      }).in('id', reservaIds);
                      if (updateError) {
                        console.error('✗ Error actualizando reservas:', updateError);
                      } else {
                        console.log(`✓ Código actualizado en ${reservaIds.length} reserva(s)`);
                      }
                    }
                  }
                }
              } else {
                console.log('⚠ No se puede generar código: faltan horas');
              }
            } catch (ttlockError) {
              console.error('✗ Error en bloque TTLock completo:', ttlockError);
              console.error('   Stack:', ttlockError.stack);
              // No bloqueamos el proceso principal
            }
            console.log('📧 Estado del email:', {
              userEmail,
              hasEmail: !!userEmail
            });
            if (userEmail) {
              console.log('📧 Preparando email de confirmación...');
              const fechaStr = String(meta.fecha);
              const [year, month, day] = fechaStr.split('-').map(Number);
              const fechaDate = new Date(year, month - 1, day);
              const fechaFormateada = fechaDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              const horaInicio = franja?.hora_inicio || '';
              const horaFin = franja?.hora_fin || '';
              const horario = horaInicio && horaFin ? `de ${horaInicio} a ${horaFin}` : '';
              const codigoHTML = codigoAcceso ? `
                <div class="info-box" style="background-color: #FFFCF2; border-left: 4px solid #752A29;">
                  <h2 style="margin-top: 0; color: #752A29;">🔑 Código de acceso</h2>
                  <p style="font-size: 32px; font-weight: bold; text-align: center; color: #752A29; letter-spacing: 4px; margin: 20px 0;">
                    ${codigoAcceso}
                  </p>
                  <p style="font-size: 12px; color: #333;">
                    
                  </p>
                  <p style="font-size: 12px; color: #333;">
                    Introduce este código en el teclado de la puerta para acceder al local.
                  </p>
                </div>
              ` : '';
              const subject = "Reserva confirmada - Alondra Pole Space";
              const html = `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body {
                      font-family: 'Helvetica Neue', Arial, sans-serif;
                      background-color: #FFFCF2;
                      color: #000000;
                      margin: 0;
                      padding: 0;
                      line-height: 1.7;
                    }
                    .container {
                      max-width: 600px;
                      margin: 40px auto;
                      background-color: #E8E8E6;
                      border-radius: 12px;
                      overflow: hidden;
                      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                      background-color: #752A29;
                      color: #FFFCF2;
                      text-align: center;
                      padding: 40px 20px;
                    }
                    .header h1 {
                      font-size: 26px;
                      letter-spacing: 0.5px;
                      margin: 0;
                      font-weight: 600;
                    }
                    .content {
                      padding: 40px 30px;
                      background-color: #FFFCF2;
                    }
                    .content p {
                      margin-bottom: 18px;
                      font-size: 15px;
                    }
                    .info-box {
                      background-color: #E8E8E6;
                      padding: 20px 25px;
                      border-left: 4px solid #752A29;
                      border-radius: 6px;
                      margin: 25px 0;
                    }
                    .info-box h2 {
                      margin-top: 0;
                      color: #752A29;
                      font-size: 18px;
                      font-weight: 600;
                      margin-bottom: 12px;
                    }
                    .info-box p {
                      margin: 6px 0;
                      font-size: 14px;
                    }
                    strong {
                      color: #752A29;
                    }
                    .footer {
                      background-color: #E8E8E6;
                      text-align: center;
                      padding: 20px;
                      font-size: 13px;
                      color: #333;
                      border-top: 1px solid #d8d8d8;
                    }
                    a {
                      color: #752A29;
                      text-decoration: none;
                      font-weight: 600;
                    }
                    a:hover {
                      text-decoration: underline;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>Reserva Confirmada</h1>
                    </div>
                    <div class="content">
                      <p>Hola,</p>
                      <p>Tu reserva en <strong>Alondra Pole Space</strong> ha sido confirmada con éxito.</p>
                      
                      <div class="info-box">
                        <h2>Detalles de tu reserva</h2>
                        <p><strong>Fecha:</strong> ${fechaFormateada}</p>
                        <p><strong>Horario:</strong> ${horario}</p>
                        <p><strong>Tipo:</strong> ${nombreTipoReserva}</p>
                        <p><strong>Precio:</strong> ${(Number(session.amount_total ?? 0) / 100).toFixed(2)}€</p>
                      </div>
                      
                      
      <div class="info-box" style="background-color: #FFFCF2;">
        <h2>🔑 Código del cajetín de la llave</h2>
        <p style="font-size: 32px; font-weight: bold; text-align: center; color: #752A29; letter-spacing: 4px; margin: 20px 0;">
          1408
        </p>
                      
                      <p>Puedes consultar todos los detalles de tu reserva en tu perfil de usuario.</p>
                      <p>Gracias por confiar en nosotros.</p>
                    </div>
                    <div class="footer">
                      <p><strong>Alondra Pole Space</strong></p>
                      <p>Si tienes alguna pregunta, escríbenos a <a href="mailto:alondrapolespace@gmail.com">alondrapolespace@gmail.com</a></p>
                    
                </body>
                </html>
              `;
              const codigoTexto = codigoAcceso ? `\n\n🔑 CÓDIGO DE ACCESO: ${codigoAcceso}\n\n\nIntroduce este código en el teclado de la puerta.\n` : '';
              const text = `¡Reserva confirmada!\n\nFecha: ${fechaFormateada}\nHorario: ${horario}\nTipo: ${nombreTipoReserva}\nPrecio: ${(Number(session.amount_total ?? 0) / 100).toFixed(2)}€${codigoTexto}\n\nPuedes consultar tu reserva en tu perfil.\n¡Te esperamos!`;
              try {
                await sendEmail(userEmail, subject, html, text);
                console.log('✓ Email de confirmación enviado exitosamente');

                // Enviar copia a alondrapolespace@gmail.com
                await sendEmail(
                  "alondrapolespace@gmail.com",
                  `Nueva Reserva - ${userEmail}`,
                  html,
                  text
                );
                console.log('✓ Copia de email enviada a alondrapolespace@gmail.com');
              } catch (emailErr) {
                console.error('✗ Error al enviar email de confirmación:', emailErr);
              }
            }
          }
        } catch (e) {
          console.error('✗ Error creando reserva confirmada:', e);
          return new Response(JSON.stringify({
            error: "Error creando reserva",
            details: e.message
          }), {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        }
      } else {
        console.log('⚠ No se cumple condición para crear reserva:', {
          item_type: meta.item_type,
          usuarioId: !!usuarioId,
          fecha: meta.fecha,
          franjaId: franjaIdStr,
          tipoReservaId: tipoReservaIdStr
        });
      }
      const cantidadPagada = Number(session.amount_total ?? 0) / 100;
      console.log('→ Registrando pago...');
      const { error: payErr } = await sb.from("pagos").insert({
        usuario_id: usuarioId,
        tipo: meta.item_type === 'tipo_bono' ? 'bono' : 'entrada',
        referencia_id: Number(meta.item_id ?? 0),
        metodo_pago: 'stripe',
        cantidad: cantidadPagada,
        estado: 'completado',
        transaccion_id: session.id
      });
      if (payErr) {
        console.error('✗ Error insertando pago:', payErr);
      } else {
        console.log('✓ Pago registrado exitosamente');
      }
      if (meta.item_type === 'tipo_bono' && usuarioId && meta.item_id) {
        try {
          console.log('→ Creando bono de usuario...');
          const tipoBonoId = Number(meta.item_id);
          const { data: tb, error: eTb } = await sb.from('tipos_bono').select('numero_clases, duracion_dias, nombre').eq('id', tipoBonoId).single();
          if (eTb) throw eTb;
          if (!tb) throw new Error('tipo_bono no encontrado');

          // MODIFICADO: Añadido .select()
          const { data: bonoData, error: bonoErr } = await sb.from('bonos_usuario').insert({
            usuario_id: usuarioId,
            tipo_bono_id: tipoBonoId,
            fecha_caducidad: null,
            fecha_activacion: null,
            clases_restantes: Number(tb.numero_clases),
            clases_totales: Number(tb.numero_clases),
            estado: 'activo'
          }).select();

          if (bonoErr) {
            console.error('✗ Error creando bono_usuario:', bonoErr);
          } else {
            console.log('✓ Bono de usuario creado');

            // LOGICA CUPONES (INICIO)
            if (meta.cupon_id) {
              const cuponId = Number(meta.cupon_id);
              const nuevoBonoId = bonoData?.[0]?.id;
              if (nuevoBonoId) {
                console.log('→ Registrando uso de cupón para bono:', cuponId);
                const { error: cupomErr } = await sb.from('cupones_redenciones').insert({
                  cupon_id: cuponId,
                  usuario_id: usuarioId,
                  referencia_tipo: 'bono',
                  referencia_id: nuevoBonoId
                });
                if (cupomErr) console.error('✗ Error registrando cupón:', cupomErr);
                else console.log('✓ Cupón registrado correctamente');
              }
            }
            // LOGICA CUPONES (FIN)

            if (userEmail) {
              const subject = 'Bono adquirido - Alondra Pole Space';
              const html = `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body {
                      font-family: 'Helvetica Neue', Arial, sans-serif;
                      background-color: #FFFCF2;
                      color: #000000;
                      margin: 0;
                      padding: 0;
                      line-height: 1.7;
                    }
                    .container {
                      max-width: 600px;
                      margin: 40px auto;
                      background-color: #E8E8E6;
                      border-radius: 12px;
                      overflow: hidden;
                      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                      background-color: #752A29;
                      color: #FFFCF2;
                      text-align: center;
                      padding: 40px 20px;
                    }
                    .header h1 {
                      font-size: 26px;
                      letter-spacing: 0.5px;
                      margin: 0;
                      font-weight: 600;
                    }
                    .content {
                      padding: 40px 30px;
                      background-color: #FFFCF2;
                    }
                    .content p {
                      margin-bottom: 18px;
                      font-size: 15px;
                    }
                    .info-box {
                      background-color: #E8E8E6;
                      padding: 20px 25px;
                      border-left: 4px solid #752A29;
                      border-radius: 6px;
                      margin: 25px 0;
                    }
                    .info-box h2 {
                      margin-top: 0;
                      color: #752A29;
                      font-size: 18px;
                      font-weight: 600;
                      margin-bottom: 12px;
                    }
                    .info-box p {
                      margin: 6px 0;
                      font-size: 14px;
                    }
                    strong {
                      color: #752A29;
                    }
                    .footer {
                      background-color: #E8E8E6;
                      text-align: center;
                      padding: 20px;
                      font-size: 13px;
                      color: #333;
                      border-top: 1px solid #d8d8d8;
                    }
                    a {
                      color: #752A29;
                      text-decoration: none;
                      font-weight: 600;
                    }
                    a:hover {
                      text-decoration: underline;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>Bono Adquirido</h1>
                    </div>
                    <div class="content">
                      <p>Hola,</p>
                      <p>Has adquirido el bono <strong>${tb.nombre}</strong> en Alondra Pole Space.</p>
                      
                      <div class="info-box">
                        <h2>Detalles del bono</h2>
                        <p><strong>Bono:</strong> ${tb.nombre}</p>
                        <p><strong>Clases incluidas:</strong> ${tb.numero_clases}</p>
                        <p><strong>Caducidad:</strong> comienza en el primer uso (duración: ${tb.duracion_dias} días)</p>
                        <p><strong>Precio:</strong> ${cantidadPagada.toFixed(2)}€</p>
                      </div>
                      
                      <p>Puedes usar tu bono para reservar clases en cualquier momento. Consulta tus bonos activos en tu perfil de usuario.</p>
                      <p>Gracias por confiar en nosotros.</p>
                    </div>
                    <div class="footer">
                      <p><strong>Alondra Pole Space</strong></p>
                      <p>Si tienes alguna pregunta, escríbenos a <a href="mailto:alondrapolespace@gmail.com">alondrapolespace@gmail.com</a></p>
                    </div>
                    <p><strong>En caso de tener algún problema con la cerradura, el código del cajetin que contiene la llave es:  1408</strong></p>
                  </div>
                </body>
                </html>
              `;
              const text = `¡Bono adquirido!\n\nBono: ${tb.nombre}\nClases: ${tb.numero_clases}\nCaducidad: comienza en el primer uso (duración: ${tb.duracion_dias} días)\nPrecio: ${cantidadPagada.toFixed(2)}€\n\nPuedes usar tu bono en cualquier momento.\n¡Disfruta de tus clases!`;
              try {
                await sendEmail(userEmail, subject, html, text);
                console.log('✓ Email de bono enviado exitosamente');
              } catch (emailErr) {
                console.error('✗ Error al enviar email de bono:', emailErr);
              }
            }
          }
        } catch (e) {
          console.error('✗ Error al crear bono de usuario:', e);
        }
      }
    }
    console.log("=== Webhook procesado exitosamente ===");
    return new Response(JSON.stringify({
      received: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (e) {
    console.error('✗ Webhook error general:', e);
    return new Response(JSON.stringify({
      error: String(e?.message ?? e)
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
