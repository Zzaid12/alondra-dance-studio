import { useEffect, useMemo, useState } from "react";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { startCheckout } from "@/lib/checkout";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";

const Booking = () => {
  const [selectedOption, setSelectedOption] = useState<string>("barra");
  // Inicializar fecha a medianoche en hora local para evitar problemas de zona horaria
  const getTodayAtMidnight = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };
  const [date, setDate] = useState<Date | undefined>(getTodayAtMidnight());
  const [times, setTimes] = useState<{ label: string; franjaId: number; tipoReservaId: number; disponibles: number; disabled: boolean }[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [tiposCatalogo, setTiposCatalogo] = useState<{
    oneBarId: number | null;
    oneBarPrice: number | null;
    threeBarsId: number | null;
    threeBarsPrice: number | null;
    salaNormalId: number | null;
    salaNormalPrice: number | null;
    salaPlus6Id: number | null;
    salaPlus6Price: number | null;
    salaNormalMorningId: number | null;
    salaNormalMorningPrice: number | null;
    salaPlus6MorningId: number | null;
    salaPlus6MorningPrice: number | null;
    oneBarMorningId?: number | null;
    oneBarMorningPrice?: number | null;
    oneBarAfternoonId?: number | null;
    oneBarAfternoonPrice?: number | null;
  }>({
    oneBarId: null,
    oneBarPrice: null,
    threeBarsId: null,
    threeBarsPrice: null,
    salaNormalId: null,
    salaNormalPrice: null,
    salaPlus6Id: null,
    salaPlus6Price: null,
    salaNormalMorningId: null,
    salaNormalMorningPrice: null,
    salaPlus6MorningId: null,
    salaPlus6MorningPrice: null,
    oneBarMorningId: null,
    oneBarMorningPrice: null,
    oneBarAfternoonId: null,
    oneBarAfternoonPrice: null
  });
  const [bonosDisponibles, setBonosDisponibles] = useState<{ bono_usuario_id: number; clases_restantes: number; fecha_caducidad: string | null; tipo_bono?: string; numero_barras_tipo?: number }[]>([]);
  const [selectedBonoId, setSelectedBonoId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [bonoError, setBonoError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<string>("");
  const [acceptedNorms, setAcceptedNorms] = useState<boolean>(false);
  const [couponStatus, setCouponStatus] = useState<"valid" | "invalid" | null>(null);
  const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pre = params.get("pre");
    if (pre === "sala") setSelectedOption("sala-normal"); // Por defecto sala normal
    else if (pre === "bonos" || pre === "bono") setSelectedOption("bono");
    else setSelectedOption("barra");
  }, []);

  // Cargar disponibilidades reales de Supabase por fecha seleccionada
  useEffect(() => {
    const load = async () => {
      if (!date) return;
      // No mostrar horas para fechas pasadas
      const today = new Date();
      const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startSelected = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      if (startSelected < startToday) {
        setTimes([]);
        setSelectedTime("");
        return;
      }
      setSelectedTime("");
      const weekday = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"][date.getDay()];

      // 1) Traer todas las franjas activas del día seleccionado
      // NOTA: Las franjas horarias son COMPARTIDAS entre todos los tipos de reserva
      // Solo hay UNA franja por hora que comparten barra suelta, sala entera, etc.
      const { data: franjas, error: e1 } = await (supabase as any)
        .from("franjas_horarias")
        .select("id,hora_inicio,hora_fin,tipo_reserva_id,activo")
        .eq("dia_semana", weekday)
        .eq("activo", true)
        .order("hora_inicio");

      if (e1) {
        console.error(e1);
        setTimes([]);
        return;
      }

      // 2) Agrupar por hora_inicio para mostrar cada hora solo una vez
      // (aunque solo debería haber una franja por hora, agrupamos por si acaso)
      const horasUnicas = new Map<string, any>();
      (franjas || []).forEach((f: any) => {
        const horaKey = String(f.hora_inicio).slice(0, 5);
        if (!horasUnicas.has(horaKey)) {
          horasUnicas.set(horaKey, f);
        }
      });
      const franjasFiltradas = Array.from(horasUnicas.values());

      // 3) Traer disponibilidad agregada para esa fecha (puede no devolver filas para franjas sin reservas)
      // Formatear fecha en formato YYYY-MM-DD usando la fecha local (no UTC)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const fechaISO = `${year}-${month}-${day}`;
      const { data: disp, error: e2 } = await (supabase as any)
        .from("vista_disponibilidad_diaria")
        .select("franja_horaria_id,barras_reservadas,barras_disponibles,fecha")
        .eq("fecha", fechaISO);
      if (e2) {
        console.error(e2);
      }
      const franjaIdToDisponibles = new Map<number, number>();
      (disp || []).forEach((d: any) => franjaIdToDisponibles.set(Number(d.franja_horaria_id), Number(d.barras_disponibles)));

      // 4) Calcular barras necesarias según selección
      // Si el bono es de sala (numero_barras_tipo >= 3), necesitamos 3 barras
      const bonoSeleccionado = bonosDisponibles.find(b => String(b.bono_usuario_id) === selectedBonoId);
      const bonoEsSala = selectedOption === "bono" && bonoSeleccionado?.numero_barras_tipo && bonoSeleccionado.numero_barras_tipo >= 3;
      const barrasNecesarias = (selectedOption === "sala-normal" || selectedOption === "sala-plus6" || bonoEsSala) ? 3 : 1;

      // 5) Determinar franja del día (mañanas o tarde/punta) según hora seleccionada
      const isMorningTime = (timeLabel: string) => {
        const [hh] = timeLabel.split(":").map(Number);
        return hh < 14; // Antes de las 14:00 = mañanas
      };

      // 6) Construir lista de horarios con disponibilidad
      const items = franjasFiltradas.map((f: any) => {
        const label = String(f.hora_inicio).slice(0, 5);

        // Determinar el tipo_reserva_id correcto según la opción seleccionada
        let tipoReservaId = Number(f.tipo_reserva_id);
        if (selectedOption === "sala-normal" || selectedOption === "sala-plus6") {
          const isMorning = isMorningTime(label);
          if (selectedOption === "sala-normal") {
            tipoReservaId = isMorning
              ? (tiposCatalogo.salaNormalMorningId ?? tiposCatalogo.salaNormalId ?? 0)
              : (tiposCatalogo.salaNormalId ?? 0);
          } else { // sala-plus6
            tipoReservaId = isMorning
              ? (tiposCatalogo.salaPlus6MorningId ?? tiposCatalogo.salaPlus6Id ?? 0)
              : (tiposCatalogo.salaPlus6Id ?? 0);
          }
        } else if (selectedOption === "bono") {
          // Si el bono es de sala, usamos el ID de reserva de sala
          if (bonoSeleccionado?.numero_barras_tipo === 3) {
            const isMorning = isMorningTime(label);
            // Usar sala normal por defecto para bonos de sala
            tipoReservaId = isMorning
              ? (tiposCatalogo.salaNormalMorningId ?? tiposCatalogo.salaNormalId ?? 0)
              : (tiposCatalogo.salaNormalId ?? 0);
          } else if (tiposCatalogo.oneBarId) {
            tipoReservaId = tiposCatalogo.oneBarId;
          }
        } else if (selectedOption === "barra" && tiposCatalogo.oneBarId) {
          tipoReservaId = tiposCatalogo.oneBarId;
        }

        // Usar el franjaId directamente (todas las reservas usan la misma franja física)
        const franjaIdCorrecto = f.id;

        // Calcular disponibilidad (todas las franjas comparten las mismas 3 barras)
        const disponibles = franjaIdToDisponibles.has(franjaIdCorrecto)
          ? franjaIdToDisponibles.get(franjaIdCorrecto)!
          : 3;
        let disabled = disponibles < barrasNecesarias;

        // Si la fecha seleccionada es hoy, deshabilitar horas ya pasadas
        if (startSelected.getTime() === startToday.getTime()) {
          const [hh, mm] = label.split(":").map(Number);
          const timeMs = hh * 60 + mm;
          const nowMs = today.getHours() * 60 + today.getMinutes();
          if (timeMs <= nowMs) disabled = true;
        }

        return { label, franjaId: franjaIdCorrecto as number, tipoReservaId, disponibles, disabled };
      });
      setTimes(items);
    };
    load();
  }, [date, selectedOption, tiposCatalogo, bonosDisponibles, selectedBonoId]);

  // Cargar catálogo de tipos (1 barra mañana/tarde y 3 barras) una vez
  useEffect(() => {
    const loadTipos = async () => {
      const { data, error } = await (supabase as any)
        .from("tipos_reserva")
        .select("id,nombre,numero_barras,precio_entrada,activo")
        .eq("activo", true);
      if (error) {
        console.error(error);
        return;
      }
      const ones = (data || []).filter((t: any) => Number(t.numero_barras) === 1);
      const oneMorning = ones.find((t: any) => Number(t.id) === 4) || ones.find((t: any) => String(t.nombre).toLowerCase().includes('mañ')); // prefer id 4
      const oneAfternoon = ones.find((t: any) => Number(t.id) !== (oneMorning ? Number(oneMorning.id) : -1)) || null;
      const oneFallback = ones[0] || null;

      // Tipos de sala (3 barras)
      const salas = (data || []).filter((t: any) => Number(t.numero_barras) === 3);

      // Log para debug
      console.log("Tipos de sala encontrados:", salas.map((s: any) => ({ id: s.id, nombre: s.nombre, precio: s.precio_entrada })));

      // Sala normal (hasta 6 personas) - Buscar específicamente "hasta 6" y NO "+6"
      const salaNormal = salas.find((t: any) => {
        const nombre = String(t.nombre).toLowerCase();
        return (nombre.includes('hasta 6') || nombre.includes('6 personas')) && !nombre.includes('+6') && !nombre.includes('más de 6');
      });
      const salaNormalMorning = salas.find((t: any) => {
        const nombre = String(t.nombre).toLowerCase();
        return nombre.includes('hasta 6') && nombre.includes('mañana') && !nombre.includes('+6');
      });
      const salaNormalTarde = salas.find((t: any) => {
        const nombre = String(t.nombre).toLowerCase();
        return nombre.includes('hasta 6') && (nombre.includes('tarde') || nombre.includes('punta')) && !nombre.includes('+6');
      });

      // Sala +6 personas - Buscar específicamente "+6" o "más de 6"
      const salaPlus6 = salas.find((t: any) => {
        const nombre = String(t.nombre).toLowerCase();
        return nombre.includes('+6') || nombre.includes('más de 6');
      });
      const salaPlus6Morning = salas.find((t: any) => {
        const nombre = String(t.nombre).toLowerCase();
        return (nombre.includes('+6') || nombre.includes('más de 6')) && nombre.includes('mañana');
      });
      const salaPlus6Tarde = salas.find((t: any) => {
        const nombre = String(t.nombre).toLowerCase();
        return (nombre.includes('+6') || nombre.includes('más de 6')) && (nombre.includes('tarde') || nombre.includes('punta'));
      });

      // Log para debug
      console.log("Sala normal encontrada:", salaNormal ? { id: salaNormal.id, nombre: salaNormal.nombre, precio: salaNormal.precio_entrada } : null);
      console.log("Sala normal tarde:", salaNormalTarde ? { id: salaNormalTarde.id, nombre: salaNormalTarde.nombre, precio: salaNormalTarde.precio_entrada } : null);
      console.log("Sala +6 encontrada:", salaPlus6 ? { id: salaPlus6.id, nombre: salaPlus6.nombre, precio: salaPlus6.precio_entrada } : null);
      console.log("Sala +6 tarde:", salaPlus6Tarde ? { id: salaPlus6Tarde.id, nombre: salaPlus6Tarde.nombre, precio: salaPlus6Tarde.precio_entrada } : null);

      // Fallback: usar sala normal si no se encuentra específica
      const three = salaNormal || salaPlus6 || salas[0] || null;

      setTiposCatalogo({
        oneBarId: oneFallback ? Number(oneFallback.id) : null,
        oneBarPrice: oneFallback ? Number(oneFallback.precio_entrada) : null,
        threeBarsId: three ? Number(three.id) : null,
        threeBarsPrice: three ? Number(three.precio_entrada) : null,
        salaNormalId: salaNormalTarde ? Number(salaNormalTarde.id) : (salaNormal ? Number(salaNormal.id) : null),
        salaNormalPrice: salaNormalTarde ? Number(salaNormalTarde.precio_entrada) : (salaNormal ? Number(salaNormal.precio_entrada) : null),
        salaPlus6Id: salaPlus6Tarde ? Number(salaPlus6Tarde.id) : (salaPlus6 ? Number(salaPlus6.id) : null),
        salaPlus6Price: salaPlus6Tarde ? Number(salaPlus6Tarde.precio_entrada) : (salaPlus6 ? Number(salaPlus6.precio_entrada) : null),
        salaNormalMorningId: salaNormalMorning ? Number(salaNormalMorning.id) : (salaNormal ? Number(salaNormal.id) : null),
        salaNormalMorningPrice: salaNormalMorning ? Number(salaNormalMorning.precio_entrada) : (salaNormal ? Number(salaNormal.precio_entrada) : null),
        salaPlus6MorningId: salaPlus6Morning ? Number(salaPlus6Morning.id) : (salaPlus6 ? Number(salaPlus6.id) : null),
        salaPlus6MorningPrice: salaPlus6Morning ? Number(salaPlus6Morning.precio_entrada) : (salaPlus6 ? Number(salaPlus6.precio_entrada) : null),
        oneBarMorningId: oneMorning ? Number(oneMorning.id) : (oneFallback ? Number(oneFallback.id) : null),
        oneBarMorningPrice: oneMorning ? Number(oneMorning.precio_entrada) : (oneFallback ? Number(oneFallback.precio_entrada) : null),
        oneBarAfternoonId: oneAfternoon ? Number(oneAfternoon.id) : (oneFallback ? Number(oneFallback.id) : null),
        oneBarAfternoonPrice: oneAfternoon ? Number(oneAfternoon.precio_entrada) : (oneFallback ? Number(oneFallback.precio_entrada) : null),
      });
    };
    loadTipos();
  }, []);

  // Comprobar bonos activos si se escoge "bono"
  useEffect(() => {
    const loadBonos = async () => {
      if (selectedOption !== "bono") {
        setBonosDisponibles([]);
        setSelectedBonoId(null);
        return;
      }
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) {
        setBonosDisponibles([]);
        setSelectedBonoId(null);
        return;
      }
      const { data, error } = await (supabase as any)
        .from("vista_bonos_activos")
        .select("bono_usuario_id,clases_restantes,fecha_caducidad,tipo_bono,numero_barras_tipo")
        .eq("usuario_id", user.user.id)
        .order("fecha_caducidad", { ascending: true });
      if (error) {
        console.error(error);
        setBonosDisponibles([]);
        setSelectedBonoId(null);
        return;
      }
      const disponibles = (data || []).filter((b: any) => Number(b.clases_restantes) > 0);
      if (disponibles.length > 0) {
        setBonosDisponibles(disponibles.map((d: any) => ({
          bono_usuario_id: Number(d.bono_usuario_id),
          clases_restantes: Number(d.clases_restantes),
          fecha_caducidad: d.fecha_caducidad ?? null,
          tipo_bono: String(d.tipo_bono),
          numero_barras_tipo: d.numero_barras_tipo ? Number(d.numero_barras_tipo) : 1,
        })));
        // Seleccionar el primero por defecto
        setSelectedBonoId(String(disponibles[0].bono_usuario_id));
      } else {
        setBonosDisponibles([]);
        setSelectedBonoId(null);
      }
    };
    loadBonos();
  }, [selectedOption]);

  const franjaParteDia = useMemo(() => {
    if (!selectedTime) return "";
    const [hhStr] = selectedTime.split(":");
    const hh = Number(hhStr);
    if (hh < 24) return "Tarde";
    return "Noche";
  }, [selectedTime]);

  const isMorning = useMemo(() => {
    return false; // Ya no hay opciones de mañanas
  }, [selectedTime]);



  return (
    <div className="min-h-screen pt-20 pb-8 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">Reservar</h1>
            <p className="text-muted-foreground">Selecciona modalidad y fecha</p>
          </div>

          <Card className="elegant-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Modalidad</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedOption} onValueChange={(value) => {
                setSelectedOption(value);
                setSelectedTime("");
                setCouponStatus(null);
                setDiscountedPrice(null);
                setBonoError(null);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elige modalidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barra">Barra individual</SelectItem>
                  <SelectItem value="bono">Bono</SelectItem>
                  <SelectItem value="sala-normal">Sala entera hasta 6 personas</SelectItem>
                  <SelectItem value="sala-plus6">Sala entera +6 personas</SelectItem>
                </SelectContent>
              </Select>
              {selectedOption === 'barra' && (
                <div className="flex items-center gap-2 mt-3 text-xs text-amber-600 dark:text-amber-400 pl-1 font-medium">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span>Solo una persona, no está permitido compartir barra</span>
                </div>
              )}
              {selectedOption === 'bono' && bonosDisponibles.length === 0 && (
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive flex-1">
                    No tienes bonos activos. Puede que tu bono haya caducado o hayas agotado los usos.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive hover:text-white shrink-0"
                    onClick={() => { window.location.href = '/bonos'; }}
                  >
                    Comprar bono
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="elegant-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Fecha</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(selectedDate) => {
                    if (selectedDate) {
                      // Normalizar la fecha a medianoche en hora local para evitar problemas de zona horaria
                      const normalizedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                      setDate(normalizedDate);
                    } else {
                      setDate(undefined);
                    }
                  }}
                  captionLayout="dropdown"
                  locale={es}
                  className="rounded-md border shadow-sm"
                />
              </div>
              {date && (
                <div className="mt-6">
                  <h3 className="text-base font-semibold mb-3">Horarios</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {times.map((t) => {
                      const isSelected = selectedTime === t.label;
                      return (
                        <button
                          key={t.franjaId}
                          onClick={() => !t.disabled && setSelectedTime(t.label)}
                          disabled={t.disabled}
                          className={`text-sm h-9 rounded-md border px-3 transition ${t.disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-accent'
                            }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedTime && (
                    <div className="mt-6 space-y-3">
                      <Card className="elegant-shadow">
                        <CardHeader>
                          <CardTitle className="text-base">Resumen</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Modalidad</span>
                            <span className="font-medium">
                              {selectedOption === 'barra' && 'Barra suelta'}
                              {selectedOption === 'bono' && 'Bono (1 uso)'}
                              {selectedOption === 'sala-normal' && 'Sala entera hasta 6 personas'}
                              {selectedOption === 'sala-plus6' && 'Sala entera +6 personas'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fecha</span>
                            <span className="font-medium">
                              {date ? date.toLocaleDateString('es-ES', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              }) : ''}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Horario</span>
                            <span className="font-medium">{selectedTime} · {franjaParteDia}</span>
                          </div>
                          {selectedOption !== 'bono' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Precio</span>
                                {(() => {
                                  let base = 0;
                                  const isMorning = selectedTime ? (() => {
                                    const [hh] = selectedTime.split(":").map(Number);
                                    return hh < 14;
                                  })() : false;
                                  if (selectedOption === 'sala-normal') {
                                    base = isMorning
                                      ? (tiposCatalogo.salaNormalMorningPrice ?? tiposCatalogo.salaNormalPrice ?? 0)
                                      : (tiposCatalogo.salaNormalPrice ?? 0);
                                  } else if (selectedOption === 'sala-plus6') {
                                    base = isMorning
                                      ? (tiposCatalogo.salaPlus6MorningPrice ?? tiposCatalogo.salaPlus6Price ?? 0)
                                      : (tiposCatalogo.salaPlus6Price ?? 0);
                                  } else {
                                    base = isMorning
                                      ? (tiposCatalogo.oneBarMorningPrice ?? tiposCatalogo.oneBarPrice ?? 0)
                                      : (tiposCatalogo.oneBarAfternoonPrice ?? tiposCatalogo.oneBarPrice ?? 0);
                                  }
                                  if (discountedPrice !== null && couponStatus === 'valid') {
                                    return (
                                      <span className="font-semibold">
                                        <span className="line-through mr-2 text-muted-foreground">€{base.toFixed(2)}</span>
                                        <span>€{discountedPrice.toFixed(2)}</span>
                                      </span>
                                    );
                                  }
                                  return <span className="font-semibold">€{base.toFixed(2)}</span>;
                                })()}
                              </div>
                              {couponStatus === 'valid' && discountedPrice !== null && (
                                <p className="text-xs text-green-600">Cupón aplicado: total €{discountedPrice.toFixed(2)}</p>
                              )}
                              <div className="mt-3 max-w-sm">
                                <label htmlFor="coupon" className="block text-xs mb-1 text-muted-foreground">Código de descuento</label>
                                <div className="flex gap-2">
                                  <Input id="coupon" placeholder="Introduce tu cupón" value={coupon} onChange={(e) => { setCoupon(e.target.value); setCouponStatus(null); }} />
                                  <Button
                                    variant="outline"
                                    className="h-9"
                                    onClick={async () => {
                                      try {
                                        if (!coupon.trim()) { setCouponStatus('invalid'); return; }
                                        const { data: user } = await supabase.auth.getUser();
                                        if (!user?.user?.id) { setCouponStatus('invalid'); return; }
                                        const itemType = 'tipo_reserva';
                                        const isMorning = selectedTime ? (() => {
                                          const [hh] = selectedTime.split(":").map(Number);
                                          return hh < 14;
                                        })() : false;
                                        let itemId = null;
                                        let precio = 0;
                                        if (selectedOption === 'sala-normal') {
                                          itemId = isMorning
                                            ? (tiposCatalogo.salaNormalMorningId ?? tiposCatalogo.salaNormalId ?? null)
                                            : (tiposCatalogo.salaNormalId ?? null);
                                          precio = isMorning
                                            ? (tiposCatalogo.salaNormalMorningPrice ?? tiposCatalogo.salaNormalPrice ?? 0)
                                            : (tiposCatalogo.salaNormalPrice ?? 0);
                                        } else if (selectedOption === 'sala-plus6') {
                                          itemId = isMorning
                                            ? (tiposCatalogo.salaPlus6MorningId ?? tiposCatalogo.salaPlus6Id ?? null)
                                            : (tiposCatalogo.salaPlus6Id ?? null);
                                          precio = isMorning
                                            ? (tiposCatalogo.salaPlus6MorningPrice ?? tiposCatalogo.salaPlus6Price ?? 0)
                                            : (tiposCatalogo.salaPlus6Price ?? 0);
                                        } else {
                                          itemId = isMorning
                                            ? (tiposCatalogo.oneBarMorningId ?? tiposCatalogo.oneBarId ?? null)
                                            : (tiposCatalogo.oneBarAfternoonId ?? tiposCatalogo.oneBarId ?? null);
                                          precio = isMorning
                                            ? (tiposCatalogo.oneBarMorningPrice ?? tiposCatalogo.oneBarPrice ?? 0)
                                            : (tiposCatalogo.oneBarAfternoonPrice ?? tiposCatalogo.oneBarPrice ?? 0);
                                        }
                                        if (!itemId) { setCouponStatus('invalid'); return; }
                                        const { data, error } = await (supabase as any).rpc('validar_cupon', {
                                          _codigo: coupon.trim(),
                                          _usuario_id: user.user.id,
                                          _tipo_item: itemType,
                                          _item_id: itemId,
                                          _precio: precio
                                        });
                                        if (error) { console.error(error); setCouponStatus('invalid'); return; }
                                        if (Array.isArray(data) && data.length && data[0].valido) {
                                          setCouponStatus('valid');
                                          // Intentar obtener precio final del RPC
                                          const base = precio;
                                          const d = data[0] as any;
                                          let final = d.precio_final ?? d.precio_con_descuento ?? null;
                                          if (final === null) {
                                            if (d.amount_off) final = Math.max(base - Number(d.amount_off), 0);
                                            else if (d.percent_off) final = Math.max(base * (1 - Number(d.percent_off) / 100), 0);
                                          }
                                          setDiscountedPrice(final !== null ? Number(final) : base);
                                        } else {
                                          setCouponStatus('invalid');
                                          setDiscountedPrice(null);
                                        }
                                      } catch (e) {
                                        console.error(e);
                                        setCouponStatus('invalid');
                                        setDiscountedPrice(null);
                                      }
                                    }}
                                  >
                                    Validar
                                  </Button>
                                </div>
                                {couponStatus === 'valid' && (
                                  <p className="text-xs text-green-600 mt-1">Cupón válido. Se aplicará al pagar.</p>
                                )}
                                {couponStatus === 'invalid' && (
                                  <p className="text-xs text-destructive mt-1">Cupón inválido.</p>
                                )}
                              </div>
                            </>
                          )}

                          {selectedOption === 'bono' && (
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Bono</span>
                                {bonosDisponibles.length > 0 ? (
                                  <div className="w-[60%]">
                                    <Select value={selectedBonoId || ""} onValueChange={(val) => setSelectedBonoId(val)}>
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Selecciona un bono" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {bonosDisponibles.map((b) => (
                                          <SelectItem key={b.bono_usuario_id} value={String(b.bono_usuario_id)} className="text-xs">
                                            {b.tipo_bono} · {b.clases_restantes} usos{b.fecha_caducidad ? ` · caduca ${new Date(b.fecha_caducidad).toLocaleDateString('es-ES')}` : ''}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ) : (
                                  <span className="font-medium">No tienes bonos activos</span>
                                )}
                              </div>
                              {selectedBonoId && (() => {
                                const b = bonosDisponibles.find(bono => String(bono.bono_usuario_id) === selectedBonoId);
                                if (!b) return null;
                                return (
                                  <div className="text-xs text-right text-muted-foreground">
                                    {b.fecha_caducidad ? `Caduca el ${new Date(b.fecha_caducidad).toLocaleDateString('es-ES')}` : 'Sin fecha de caducidad'}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          {/* Disponibilidad de barras para la franja seleccionada */}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Barras disponibles</span>
                            <span className="font-medium">
                              {(() => {
                                const sel = times.find(t => t.label === selectedTime);
                                return sel ? sel.disponibles : 0;
                              })()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Aceptación de normas */}
                      <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={acceptedNorms}
                            onChange={(e) => setAcceptedNorms(e.target.checked)}
                            className="h-4 w-4"
                          />
                          <span>
                            He leído y acepto las{' '}
                            <Link to="/normas" className="text-primary underline underline-offset-4" target="_blank">Normas de uso</Link>
                          </span>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        {bonoError ? (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                            <p className="text-sm text-destructive flex-1">{bonoError}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive text-destructive hover:bg-destructive hover:text-white shrink-0"
                              onClick={() => { window.location.href = '/bonos'; }}
                            >
                              Comprar bono
                            </Button>
                          </div>
                        ) : selectedOption === 'bono' && bonosDisponibles.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Selecciona un bono válido para continuar.</p>
                        ) : (
                          <Button
                            disabled={loadingAction || !acceptedNorms}
                            onClick={async () => {
                              const { data: user } = await supabase.auth.getUser();
                              if (!date) return;
                              const sel = times.find(t => t.label === selectedTime);
                              if (!sel) return;
                              if (!acceptedNorms) { alert('Debes aceptar las Normas de uso.'); return; }
                              // Formatear fecha en formato YYYY-MM-DD usando la fecha local (no UTC)
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              const fechaISO = `${year}-${month}-${day}`;
                              console.log('📅 Fecha seleccionada:', {
                                fechaOriginal: date,
                                fechaISO: fechaISO,
                                year: year,
                                month: month,
                                day: day,
                                getFullYear: date.getFullYear(),
                                getMonth: date.getMonth(),
                                getDate: date.getDate()
                              });
                              try {
                                setLoadingAction(true);
                                if (selectedOption === 'bono') {
                                  const bonoSeleccionado = bonosDisponibles.find(b => String(b.bono_usuario_id) === selectedBonoId);
                                  if (!user?.user?.id || !bonoSeleccionado) return;
                                  // Validación de tramo horario según tipo de bono
                                  const bonoEsMananas = (bonoSeleccionado.tipo_bono || '').toLowerCase().includes('mañanas');
                                  if (bonoEsMananas && !isMorning) {
                                    alert('Este bono solo es válido para mañanas. Elige un horario antes de las 14:00.');
                                    return;
                                  }
                                  const bonoEsTarde = (bonoSeleccionado.tipo_bono || '').toLowerCase().includes('tarde');
                                  const bonoEsPunta = (bonoSeleccionado.tipo_bono || '').toLowerCase().includes('punta');
                                  if ((bonoEsTarde || bonoEsPunta) && isMorning) {
                                    alert('Este bono es para tarde/punta. Elige un horario a partir de las 14:00.');
                                    return;
                                  }
                                  // Determinar tipo de reserva según bono
                                  let tipoReservaIdBono = tiposCatalogo.oneBarId;
                                  if (bonoSeleccionado.numero_barras_tipo === 3) {
                                    const isMorning = selectedTime ? (() => {
                                      const [hh] = selectedTime.split(":").map(Number);
                                      return hh < 14;
                                    })() : false;

                                    tipoReservaIdBono = isMorning
                                      ? (tiposCatalogo.salaNormalMorningId ?? tiposCatalogo.salaNormalId ?? tiposCatalogo.threeBarsId)
                                      : (tiposCatalogo.salaNormalId ?? tiposCatalogo.threeBarsId);
                                  }

                                  const { data: reservaId, error } = await (supabase as any).rpc('crear_reserva', {
                                    _usuario_id: user.user.id,
                                    _fecha: fechaISO,
                                    _franja_id: sel.franjaId,
                                    _tipo_reserva_id: tipoReservaIdBono,
                                    _metodo_pago: 'bono',
                                    _bono_usuario_id: bonoSeleccionado.bono_usuario_id,
                                    _precio_pagado: 0,
                                  });
                                  if (error) {
                                    const msg = String(error.message || '').toLowerCase();
                                    if (msg.includes('bono') || msg.includes('caducado') || msg.includes('agotado') || msg.includes('clases')) {
                                      setBonoError('Tu bono ha caducado o no tiene usos disponibles. Compra un nuevo bono para continuar.');
                                      return;
                                    }
                                    throw error;
                                  }

                                  // Enviar email de confirmación
                                  try {
                                    console.log('📧 Intentando enviar email para reserva ID:', reservaId);
                                    if (reservaId) {
                                      console.log('📧 Llamando a send-booking-email...');
                                      const emailResponse = await supabase.functions.invoke('send-booking-email', {
                                        body: { reserva_id: reservaId }
                                      });
                                      console.log('📧 Respuesta del email:', emailResponse);
                                    } else {
                                      console.log('⚠️ No hay reservaId para enviar email');
                                    }
                                  } catch (emailError) {
                                    console.error('❌ Error enviando email:', emailError);
                                    console.error('❌ Detalles del error:', emailError.message);
                                    // No bloqueamos el flujo si falla el email
                                  }

                                  window.location.href = '/reserva-confirmada';
                                } else {
                                  // Determinar tipo de reserva según selección
                                  const isMorning = selectedTime ? (() => {
                                    const [hh] = selectedTime.split(":").map(Number);
                                    return hh < 14;
                                  })() : false;
                                  let itemId: number | undefined = undefined;
                                  let tipoReservaId: number | undefined = undefined;

                                  if (selectedOption === 'sala-normal') {
                                    itemId = isMorning
                                      ? (tiposCatalogo.salaNormalMorningId ?? tiposCatalogo.salaNormalId ?? undefined)
                                      : (tiposCatalogo.salaNormalId ?? undefined);
                                    tipoReservaId = itemId;
                                  } else if (selectedOption === 'sala-plus6') {
                                    itemId = isMorning
                                      ? (tiposCatalogo.salaPlus6MorningId ?? tiposCatalogo.salaPlus6Id ?? undefined)
                                      : (tiposCatalogo.salaPlus6Id ?? undefined);
                                    tipoReservaId = itemId;
                                  } else {
                                    itemId = isMorning
                                      ? (tiposCatalogo.oneBarMorningId ?? tiposCatalogo.oneBarId ?? undefined)
                                      : (tiposCatalogo.oneBarAfternoonId ?? tiposCatalogo.oneBarId ?? undefined);
                                    tipoReservaId = itemId;
                                  }

                                  if (!itemId || !tipoReservaId) {
                                    alert('Error: No se pudo determinar el tipo de reserva. Por favor, recarga la página.');
                                    return;
                                  }

                                  await startCheckout({
                                    itemType: 'tipo_reserva',
                                    itemId,
                                    successUrl: window.location.origin + '/reserva-confirmada',
                                    cancelUrl: window.location.origin + '/?pago=cancelado',
                                    fecha: fechaISO,
                                    franjaId: sel.franjaId,
                                    tipoReservaId,
                                    couponCode: coupon || null,
                                  });
                                }
                              } catch (err) {
                                console.error(err);
                                alert('No se pudo completar la acción. Inténtalo de nuevo.');
                              } finally {
                                setLoadingAction(false);
                              }
                            }}
                            className="h-9"
                          >
                            {selectedOption === 'bono' ? 'Reservar con bono' : 'Reservar y pagar'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Booking;