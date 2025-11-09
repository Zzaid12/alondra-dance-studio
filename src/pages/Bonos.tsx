import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { startCheckout } from "@/lib/checkout";
// duplicate import removed

type TipoBono = {
  id: number;
  nombre: string;
  precio: number;
  numero_clases?: number | null;
  duracion_dias?: number | null;
  descripcion?: string | null;
};

const Bonos = () => {
  const [bonos, setBonos] = useState<TipoBono[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [couponById, setCouponById] = useState<Record<number, string>>({});
  const [couponStatusById, setCouponStatusById] = useState<Record<number, "valid" | "invalid" | null>>({});
  const [couponReasonById, setCouponReasonById] = useState<Record<number, string | null>>({});
  

  useEffect(() => {
    const load = async () => {
      const { data, error } = await (supabase as any)
        .from("tipos_bono")
        .select("id, nombre, precio, numero_clases, duracion_dias")
        .eq("activo", true)
        .order("precio", { ascending: true });
      if (error) {
        console.error(error);
      }
      setBonos((data as any) || []);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-8 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Bonos</h1>
          <p className="text-muted-foreground">Elige el bono que mejor se adapte a ti</p>
        </div>

        {/* Validación por tarjeta; se retiró el input global para evitar confusiones */}

        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {bonos.map((b) => (
            <Card key={b.id} className="elegant-shadow hover:shadow-lg transition-all duration-300 h-full flex flex-col">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl font-bold">{b.nombre}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-primary">€{Number(b.precio).toFixed(2)}</span>
                  <span className="text-muted-foreground">/Caducidad: {b.duracion_dias === 90 ? '3 meses' : '1 mes'}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex flex-col grow">
                <p className="text-muted-foreground text-center">
                  {b.nombre.includes('mañanas')
                    ? (b.nombre.includes('5 barras') ? 'Precio base reducido, recomendado para principiantes' : 'Para peñita guay que madruga')
                    : (b.nombre.includes('5 barras') ? 'Precio base, recomendado para principiantes' : 'Para los más adictos a entrenar con nosotros')}
                </p>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center justify-center gap-2">
                    <Badge variant="secondary">{b.numero_clases ?? 0} sesiones</Badge>
                  </li>
                  <li className="text-center text-muted-foreground">Caduca en {b.duracion_dias === 90 ? '3 meses' : '1 mes'}</li>
                </ul>
                <div>
                  <label htmlFor={`coupon-${b.id}`} className="block text-xs mb-1 text-muted-foreground">Código de descuento</label>
                  <div className="flex gap-2">
                    <Input
                      id={`coupon-${b.id}`}
                      placeholder="Introduce tu cupón"
                      value={couponById[b.id] ?? ''}
                      onChange={(e) => {
                        setCouponById((prev) => ({ ...prev, [b.id]: e.target.value }));
                        setCouponStatusById((prev) => ({ ...prev, [b.id]: null }));
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const code = (couponById[b.id] ?? '').trim();
                          if (!code) { 
                            setCouponStatusById((p) => ({ ...p, [b.id]: 'invalid' })); 
                            setCouponReasonById((p) => ({ ...p, [b.id]: 'vacío' }));
                            return; 
                          }
                          const { data: user } = await supabase.auth.getUser();
                          if (!user?.user?.id) { 
                            setCouponStatusById((p) => ({ ...p, [b.id]: 'invalid' })); 
                            setCouponReasonById((p) => ({ ...p, [b.id]: 'no_autenticado' }));
                            return; 
                          }
                          const { data, error } = await (supabase as any).rpc('validar_cupon', {
                            _codigo: code,
                            _usuario_id: user.user.id,
                            _tipo_item: 'tipo_bono',
                            _item_id: b.id,
                            _precio: b.precio
                          });
                          if (error) { 
                            console.error(error); 
                            setCouponStatusById((p) => ({ ...p, [b.id]: 'invalid' })); 
                            setCouponReasonById((p) => ({ ...p, [b.id]: 'error_rpc' }));
                            return; 
                          }
                          if (Array.isArray(data) && data.length && data[0].valido) {
                            setCouponStatusById((p) => ({ ...p, [b.id]: 'valid' }));
                            setCouponReasonById((p) => ({ ...p, [b.id]: null }));
                          } else {
                            setCouponStatusById((p) => ({ ...p, [b.id]: 'invalid' }));
                            setCouponReasonById((p) => ({ ...p, [b.id]: (Array.isArray(data) && data.length ? (data[0].motivo || 'desconocido') : 'sin_respuesta') }));
                          }
                        } catch (e) {
                          console.error(e);
                          setCouponStatusById((p) => ({ ...p, [b.id]: 'invalid' }));
                          setCouponReasonById((p) => ({ ...p, [b.id]: 'excepción' }));
                        }
                      }}
                    >
                      Validar
                    </Button>
                  </div>
                  {couponStatusById[b.id] === 'valid' && (
                    <p className="text-xs text-green-600 mt-1">Cupón válido. Se aplicará al pagar.</p>
                  )}
                  {couponStatusById[b.id] === 'invalid' && (
                    <p className="text-xs text-destructive mt-1">Cupón inválido{couponReasonById[b.id] ? ` (${couponReasonById[b.id]})` : ''}.</p>
                  )}
                </div>
                <div className="mt-auto">
                  <Button
                    disabled={loadingId === b.id}
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={async () => {
                      try {
                        setLoadingId(b.id);
                        await startCheckout({
                          itemType: "tipo_bono",
                          itemId: b.id,
                          successUrl: window.location.origin + "/reserva-confirmada",
                          cancelUrl: window.location.origin + "/?pago=cancelado",
                          couponCode: (couponStatusById[b.id] === 'valid' ? (couponById[b.id] ?? null) : null),
                        } as any);
                      } catch (e) {
                        alert("No se pudo iniciar el pago. Inténtalo de nuevo.");
                        console.error(e);
                      } finally {
                        setLoadingId(null);
                      }
                    }}
                  >
                    {loadingId === b.id ? "Redirigiendo a Stripe..." : "Comprar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {bonos.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground">No hay bonos disponibles por ahora.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Bonos;


