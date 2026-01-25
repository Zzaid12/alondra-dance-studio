-- Add numero_barras_tipo to tipos_bono to distinguish between single bar (1) and full room (3)
ALTER TABLE public.tipos_bono 
ADD COLUMN IF NOT EXISTS numero_barras_tipo integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.tipos_bono.numero_barras_tipo IS 'Indica si el bono sirve para reservas de 1 barra o de 3 barras (sala entera)';

-- Update function to validate bono type matches reservation type
CREATE OR REPLACE FUNCTION public.crear_reserva(
  _usuario_id uuid,
  _fecha date,
  _franja_id bigint,
  _tipo_reserva_id bigint,
  _metodo_pago text,
  _bono_usuario_id bigint default null,
  _precio_pagado numeric(10,2) default 0
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num_barras int;
  v_reserva_id bigint;
  v_duracion int;
  v_bono_barras int; -- Variable to store bono capacity
begin
  -- fijar numero_barras desde tipos_reserva para coherencia
  select numero_barras into v_num_barras from public.tipos_reserva where id = _tipo_reserva_id;
  if v_num_barras is null then
    raise exception 'Tipo de reserva inexistente';
  end if;

  -- disponibilidad
  if not public.verificar_disponibilidad(_fecha, _franja_id, v_num_barras) then
    raise exception 'No hay barras suficientes disponibles en la franja solicitada';
  end if;

  -- pago con bono
  if _metodo_pago = 'bono' then
    if _bono_usuario_id is null then
      raise exception 'Se requiere bono_usuario_id para metodo_pago=bono';
    end if;

    -- Validar que el bono corresponda al número de barras de la reserva
    select tb.numero_barras_tipo into v_bono_barras
    from public.bonos_usuario b
    join public.tipos_bono tb on tb.id = b.tipo_bono_id
    where b.id = _bono_usuario_id;

    if v_bono_barras is distinct from v_num_barras then
       raise exception 'Este bono no es válido para reservas de % barras (el bono es de % barras)', v_num_barras, v_bono_barras;
    end if;

    -- Activar bono en primer uso: si no tiene fecha_caducidad, fijarla ahora según su tipo
    select tb.duracion_dias into v_duracion
      from public.bonos_usuario b
      join public.tipos_bono tb on tb.id = b.tipo_bono_id
     where b.id = _bono_usuario_id
       and b.usuario_id = _usuario_id
       for update; -- bloquear fila del bono mientras actualizamos

    if v_duracion is null then
      raise exception 'Bono no encontrado o tipo_bono sin duración';
    end if;

    update public.bonos_usuario b
       set fecha_activacion = coalesce(b.fecha_activacion, now()),
           fecha_caducidad = coalesce(b.fecha_caducidad, (now() + (v_duracion || ' days')::interval)::date)
     where b.id = _bono_usuario_id
       and b.usuario_id = _usuario_id
       and b.estado = 'activo';

    -- Descontar clase y actualizar estado si llega a 0
    update public.bonos_usuario
       set clases_restantes = clases_restantes - 1,
           estado = case when clases_restantes - 1 <= 0 then 'agotado' else estado end
     where id = _bono_usuario_id
       and usuario_id = _usuario_id
       and estado = 'activo'
       and (fecha_caducidad is null or (fecha_caducidad::date) >= current_date);

    if not found then
      raise exception 'Bono no disponible (inexistente, ajeno, agotado o caducado)';
    end if;
  end if;

  insert into public.reservas (
    usuario_id, fecha, franja_horaria_id, tipo_reserva_id, numero_barras,
    metodo_pago, bono_usuario_id, precio_pagado, estado
  ) values (
    _usuario_id, _fecha, _franja_id, _tipo_reserva_id, v_num_barras,
    _metodo_pago, _bono_usuario_id, _precio_pagado, 'confirmada'
  ) returning id into v_reserva_id;

  return v_reserva_id;
end;
$$;
