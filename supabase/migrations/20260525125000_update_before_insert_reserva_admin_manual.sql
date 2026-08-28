CREATE OR REPLACE FUNCTION public.before_insert_reserva()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_barras int;
BEGIN
  SELECT numero_barras INTO v_barras FROM public.tipos_reserva WHERE id = new.tipo_reserva_id;
  IF v_barras IS NULL THEN
    RAISE EXCEPTION 'Tipo de reserva inexistente';
  END IF;
  
  -- Si es un bloqueo manual de admin, respetamos el número de barras que seleccionó
  IF new.metodo_pago = 'admin_manual' THEN
    v_barras := COALESCE(new.numero_barras, v_barras);
  ELSE
    new.numero_barras = v_barras;
  END IF;
  
  IF NOT public.verificar_disponibilidad(new.fecha, new.franja_horaria_id, v_barras) THEN
    RAISE EXCEPTION 'No hay barras suficientes disponibles en la franja solicitada';
  END IF;
  RETURN new;
END;
$$;
