-- Bloque anónimo para generar 20 cupones aleatorios
DO $$
DECLARE
  i integer;
  random_code text;
BEGIN
  FOR i IN 1..20 LOOP
    -- Generamos un código aleatorio único de 6 caracteres (Mayúsculas y números)
    -- Usamos un loop interno para asegurar que no chocamos con un código existente (aunque es improbable)
    LOOP
        random_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
        IF NOT EXISTS (SELECT 1 FROM public.cupones WHERE codigo = random_code) THEN
            EXIT;
        END IF;
    END LOOP;
    
    INSERT INTO public.cupones (
      codigo,
      descripcion,
      percent_off,
      amount_off,
      moneda,
      valido_desde,
      valido_hasta,
      max_redenciones,
      limite_por_usuario,
      activo
    ) VALUES (
      random_code,
      'Promo Especial (Generado Automáticamente)',
      100.00,                     -- 100% de descuento (Gratis)
      NULL,
      'EUR',
      NOW(),                      -- Válido desde ya
      NOW() + interval '2 years', -- Válido por 2 años
      3,                          -- Se puede usar 3 veces en total
      1,                          -- Solo 1 vez por cada usuario
      true
    );
  END LOOP;
END $$;
