ALTER TABLE public.reservas DROP CONSTRAINT reservas_metodo_pago_check;
ALTER TABLE public.reservas ADD CONSTRAINT reservas_metodo_pago_check CHECK (metodo_pago IN ('entrada', 'bono', 'admin_manual', 'efectivo', 'stripe'));
